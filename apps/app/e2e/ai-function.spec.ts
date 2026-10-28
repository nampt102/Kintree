// Edge Function extract-image đi đường thật (change ai-image-proposals): kho ảnh → function → bộ giả lập → đề xuất.
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { admin, clientAs, must, type World } from './backend.ts'
import { expect, test } from './fixtures.ts'

test.use({ viewport: { width: 1024, height: 768 } })

// JPEG 1×1: bộ giả lập không giải mã ảnh, chỉ cần tệp hợp lệ để kho nhận.
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
)

/** Đưa một ảnh vào như app làm: dòng tư liệu rồi tải ảnh lên đúng đường dẫn. */
// Tiêu đề bắt đầu bằng `mock:` luôn dùng bộ giả lập, nên test không gọi AI thật dù supabase/.env đã cấu hình nhà cung cấp.
async function addSource(db: SupabaseClient, world: World, userId: string, title = 'mock:bia') {
  const id = randomUUID()
  must(await db.from('sources').insert({ id, clan_id: world.clanId, tree_id: world.treeId, kind: 'image', image_kind: 'grave', title, created_by: userId }))
  const up = await db.storage.from('sources').upload(`${world.clanId}/${world.treeId}/${id}.jpg`, JPEG, { contentType: 'image/jpeg' })
  if (up.error) throw up.error
  return id
}

async function statusOf(id: string) {
  return must(await admin().from('sources').select('status, error, proposal_count').eq('id', id).single())!
}

async function waitFor(id: string, status: string) {
  await expect.poll(async () => (await statusOf(id)).status, { timeout: 15_000 }).toBe(status)
}

test.describe('extract-image', () => {
  test('Quản trị đưa ảnh vào: bộ giả lập tạo đề xuất từ người của cuốn, không đổi cây', async ({ world }) => {
    const db = await clientAs(world.admin)
    const id = await addSource(db, world, world.admin.id)
    const r = await db.functions.invoke('extract-image', { body: { source_id: id } })
    expect(r.error).toBeNull()
    await waitFor(id, 'done')

    const rows = must(await admin().from('proposals').select('op, status, provider, model, quote, anchor, ref, payload').eq('source_id', id))!
    expect(rows.map((x) => x.op).sort()).toEqual(['add_person', 'add_person', 'add_relation', 'update_field'])
    expect(rows.every((x) => x.status === 'pending' && x.provider === 'mock' && x.anchor)).toBe(true)
    expect(rows.find((x) => x.ref === 'p1')!.payload.fullName).toBe('Nguyễn Văn Thử')
    expect((await statusOf(id)).proposal_count).toBe(4)
    // AI không ghi vào cây: số người không đổi.
    expect(must(await admin().from('persons').select('id').eq('tree_id', world.treeId!))!.length).toBe(7)
  })

  test('Người xem và người lạ bị từ chối; chưa đăng nhập thì 401', async ({ world }) => {
    const id = await addSource(await clientAs(world.admin), world, world.admin.id)
    const viewer = await clientAs(world.viewer)
    expect((await viewer.functions.invoke('extract-image', { body: { source_id: id } })).error).not.toBeNull()
    expect((await statusOf(id)).status).toBe('queued')
    const noJwt = await fetch(`${process.env.KT_API_URL}/functions/v1/extract-image`, { method: 'POST', body: '{}' })
    expect(noJwt.status).toBe(401)
  })

  test('Kết quả sai schema: tư liệu "failed", không có đề xuất; đọc lại sau khi sửa thì thành công', async ({ world }) => {
    const db = await clientAs(world.admin)
    const id = await addSource(db, world, world.admin.id, 'mock:fail bia thử')
    await db.functions.invoke('extract-image', { body: { source_id: id } })
    await waitFor(id, 'failed')
    expect((await statusOf(id)).error).toContain('sai schema')
    expect(must(await admin().from('proposals').select('id').eq('source_id', id))!.length).toBe(0)

    // Đọc lại (tiêu đề bỏ mốc lỗi): thành công.
    must(await admin().from('sources').update({ title: 'mock:Bia thử' }).eq('id', id))
    await db.functions.invoke('extract-image', { body: { source_id: id } })
    await waitFor(id, 'done')
    expect(must(await admin().from('proposals').select('id').eq('source_id', id))!.length).toBe(4)
  })

  test('Đọc lại không nhân đôi: đề xuất chờ cũ bị thay', async ({ world }) => {
    const db = await clientAs(world.admin)
    const id = await addSource(db, world, world.admin.id)
    await db.functions.invoke('extract-image', { body: { source_id: id } })
    await waitFor(id, 'done')
    await db.functions.invoke('extract-image', { body: { source_id: id } })
    await expect.poll(async () => must(await admin().from('proposals').select('id').eq('source_id', id).eq('status', 'superseded'))!.length, { timeout: 15_000 }).toBe(4)
    expect(must(await admin().from('proposals').select('id').eq('source_id', id).eq('status', 'pending'))!.length).toBe(4)
  })

  test('Đang đọc dở (chưa quá 5 phút): lần gọi sau nhận 409; quá hạn thì đọc lại được', async ({ world }) => {
    const db = await clientAs(world.admin)
    const id = await addSource(db, world, world.admin.id)
    must(await admin().from('sources').update({ status: 'processing', status_at: new Date().toISOString() }).eq('id', id))
    const busy = await db.functions.invoke('extract-image', { body: { source_id: id } })
    expect(busy.error?.context?.status).toBe(409)
    must(await admin().from('sources').update({ status_at: new Date(Date.now() - 6 * 60_000).toISOString() }).eq('id', id))
    await db.functions.invoke('extract-image', { body: { source_id: id } })
    await waitFor(id, 'done')
  })
})
