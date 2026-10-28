// Edge Function: đọc một ảnh tư liệu bằng AI và ghi đề xuất vào hàng chờ (change ai-image-proposals, design D3).
// AI không bao giờ ghi vào người hay quan hệ; chỉ chèn đề xuất qua RPC `ingest_proposals` (service_role).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { extract } from '../_shared/providers.ts'
import { validateOutput, type PersonInfo } from '../_shared/schema.ts'

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

const STALE_MS = 5 * 60 * 1000
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const reply = (status: number, body: unknown) => Response.json(body, { status, headers: cors })

type Source = { id: string; tree_id: string; clan_id: string; image_kind: string | null; title: string | null }

async function readPeople(db: SupabaseClient, treeId: string): Promise<PersonInfo[]> {
  const { data, error } = await db.from('persons').select('id, full_name, gender, birth_year, death_year, is_root').eq('tree_id', treeId).is('removed_at', null)
  if (error) throw new Error(`Không đọc được danh sách người: ${error.message}`)
  return (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name, gender: p.gender, birthYear: p.birth_year ?? undefined, deathYear: p.death_year ?? undefined, isRoot: p.is_root }))
}

/** Phần chạy nền: tải ảnh, gọi AI, kiểm, ghi đề xuất; mọi lỗi thành trạng thái "failed" của tư liệu. */
async function run(db: SupabaseClient, src: Source): Promise<void> {
  const fail = async (error: string) => {
    await db.from('sources').update({ status: 'failed', status_at: new Date().toISOString(), error: error.slice(0, 300) }).eq('id', src.id)
  }
  try {
    const path = `${src.clan_id}/${src.tree_id}/${src.id}.jpg`
    const file = await db.storage.from('sources').download(path)
    if (file.error || !file.data) return await fail('Không tải được ảnh từ kho')
    const people = await readPeople(db, src.tree_id)
    const out = await extract(
      { image: new Uint8Array(await file.data.arrayBuffer()), mime: 'image/jpeg', kind: src.image_kind, title: src.title, people },
      Deno.env.get('AI_IMAGE_MODEL') ?? undefined,
    )
    const checked = validateOutput(out.raw, people)
    if (!checked.ok) return await fail(checked.error)
    const { error } = await db.rpc('ingest_proposals', { p_source: src.id, p_items: checked.rows, p_provider: out.provider, p_model: out.model })
    if (error) await fail(`Không ghi được đề xuất: ${error.message}`)
  } catch (e) {
    await fail(e instanceof Error ? e.message : 'Lỗi không rõ')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'METHOD_NOT_ALLOWED' })
  const auth = req.headers.get('Authorization')
  if (!auth) return reply(401, { error: 'NOT_SIGNED_IN' })

  let sourceId: unknown
  try {
    sourceId = (await req.json()).source_id
  } catch {
    return reply(400, { error: 'BAD_REQUEST' })
  }
  if (typeof sourceId !== 'string') return reply(400, { error: 'BAD_REQUEST' })

  const url = Deno.env.get('SUPABASE_URL')!
  // Quyền kiểm bằng chính JWT của người gọi (RLS), không tin tham số.
  const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const found = await user.from('sources').select('id, tree_id, clan_id, image_kind, title').eq('id', sourceId).maybeSingle()
  const src = found.data as Source | null
  if (!src) return reply(404, { error: 'SOURCE_NOT_FOUND' })
  const role = await user.rpc('tree_role', { t: src.tree_id })
  if (role.data !== 'admin') return reply(403, { error: 'FORBIDDEN' })

  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  // Giành quyền xử lý có điều kiện: đang đọc (chưa quá 5 phút) thì lần gọi sau nhận 409; đọc dở quá hạn thì cho đọc lại.
  const stale = new Date(Date.now() - STALE_MS).toISOString()
  const claim = await db
    .from('sources')
    .update({ status: 'processing', status_at: new Date().toISOString(), error: null })
    .eq('id', src.id)
    .or(`status.neq.processing,status_at.lt.${stale}`)
    .select('id')
  if (claim.error) return reply(500, { error: 'CLAIM_FAILED' })
  if (!claim.data?.length) return reply(409, { error: 'ALREADY_PROCESSING' })

  EdgeRuntime.waitUntil(run(db, src))
  return reply(202, { status: 'processing' })
})
