import type { SupabaseClient } from '@supabase/supabase-js'
import { mapError, type Outcome, type SaveResult } from './cloudStore.ts'
import type { StoreError } from './messages.ts'
import type { Anchor, ChildProposal, FieldRecord, Proposal } from './proposals.ts'
import type { Changes } from './cloudStore.ts'

// Tư liệu ảnh, đề xuất và nguồn từng trường (change ai-image-proposals, design D3–D6). Chỉ quản trị của cuốn đọc đề xuất.

export type ImageKind = 'grave' | 'page' | 'altar' | 'other'
export const IMAGE_KIND_LABEL: Record<ImageKind, string> = { grave: 'Bia mộ', page: 'Trang phả', altar: 'Bài vị', other: 'Khác' }

export type SourceStatus = 'queued' | 'processing' | 'done' | 'failed'
export type Source = {
  id: string
  clanId: string
  treeId: string
  imageKind: ImageKind
  title: string | null
  status: SourceStatus
  statusAt: string
  error: string | null
  proposalCount: number
  createdAt: string
}

/** Đang đọc quá lâu (máy chủ chết giữa chừng): coi như lỗi để đọc lại được (design D3). */
export const STALE_MS = 5 * 60 * 1000
export const effectiveStatus = (s: Pick<Source, 'status' | 'statusAt'>, now = Date.now()): SourceStatus =>
  (s.status === 'queued' || s.status === 'processing') && now - new Date(s.statusAt).getTime() > STALE_MS ? 'failed' : s.status

export type FieldSource = {
  id: string
  personId: string
  field: string
  value: unknown
  anchor: Anchor | null
  accepted: boolean
  note: string | null
  reviewedAt: string
  sourceId: string
  sourceTitle: string | null
  imageKind: ImageKind | null
  clanId: string | null
  treeId: string | null
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const isAcceptedImage = (type: string): boolean => ACCEPTED_TYPES.includes(type)

/** Cỡ sau khi thu nhỏ: cạnh dài tối đa `max` px, giữ tỉ lệ, không phóng to ảnh nhỏ. */
export function fitSize(width: number, height: number, max = 2048): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const k = max / longest
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) }
}

/** Thu nhỏ ảnh còn cạnh dài 2048 px dạng JPEG (chạy trên trình duyệt). */
export async function shrinkImage(file: Blob, max = 2048): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitSize(bitmap.width, bitmap.height, max)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.85))
}

const pathOf = (s: Pick<Source, 'clanId' | 'treeId' | 'id'>) => `${s.clanId}/${s.treeId}/${s.id}.jpg`
const netError = (e: unknown) => ({ message: e instanceof Error ? e.message : 'network' })

type SourceRow = { id: string; clan_id: string; tree_id: string; image_kind: ImageKind; title: string | null; status: SourceStatus; status_at: string; error: string | null; proposal_count: number; created_at: string }
const toSource = (r: SourceRow): Source => ({
  id: r.id, clanId: r.clan_id, treeId: r.tree_id, imageKind: r.image_kind, title: r.title, status: r.status, statusAt: r.status_at, error: r.error, proposalCount: r.proposal_count, createdAt: r.created_at,
})

export function sourceStore(client: SupabaseClient, userId: string) {
  const call = async <T>(fallback: StoreError, fn: () => Promise<{ data: T | null; error: { message?: string; code?: string; status?: number } | null }>): Promise<Outcome<T>> => {
    try {
      const { data, error } = await fn()
      if (error) return { ok: false, error: mapError(error, fallback) }
      return { ok: true, value: data as T }
    } catch (e) {
      return { ok: false, error: mapError(netError(e), fallback) }
    }
  }

  /** Gọi Edge Function đọc ảnh; 409 = đang đọc, 403 = không đủ quyền. */
  const invoke = async (sourceId: string): Promise<Outcome<null>> => {
    try {
      const r = await client.functions.invoke('extract-image', { body: { source_id: sourceId } })
      if (!r.error) return { ok: true, value: null }
      const status = (r.error as { context?: { status?: number } }).context?.status
      if (status === 409) return { ok: false, error: 'ALREADY_PROCESSING' }
      if (status === 403) return { ok: false, error: 'FORBIDDEN' }
      if (status === 401) return { ok: false, error: 'NOT_SIGNED_IN' }
      return { ok: false, error: 'SAVE_FAILED' }
    } catch (e) {
      return { ok: false, error: mapError(netError(e), 'SAVE_FAILED') }
    }
  }

  return {
    /** Tải ảnh lên rồi ghi dòng tư liệu rồi gọi AI. Ảnh lên trước để không có dòng tư liệu mồ côi. */
    add: async (input: { clanId: string; treeId: string; kind: ImageKind; title: string; image: Blob }): Promise<Outcome<string>> => {
      if (!isAcceptedImage(input.image.type) && input.image.type !== '') return { ok: false, error: 'FILE_TYPE' }
      const id = crypto.randomUUID()
      try {
        const up = await client.storage.from('sources').upload(pathOf({ clanId: input.clanId, treeId: input.treeId, id }), input.image, { contentType: 'image/jpeg' })
        if (up.error) return { ok: false, error: mapError({ message: up.error.message, status: Number((up.error as { statusCode?: string }).statusCode) || undefined }, 'SAVE_FAILED') }
        const ins = await client.from('sources').insert({ id, clan_id: input.clanId, tree_id: input.treeId, kind: 'image', image_kind: input.kind, title: input.title.trim() || null, created_by: userId })
        if (ins.error) return { ok: false, error: mapError(ins.error, 'SAVE_FAILED') }
      } catch (e) {
        return { ok: false, error: mapError(netError(e), 'SAVE_FAILED') }
      }
      const run = await invoke(id)
      return run.ok ? { ok: true, value: id } : run
    },
    /** Đọc lại một tư liệu (lỗi hoặc muốn đọc lại). */
    retry: invoke,

    list: (treeId: string) =>
      call<Source[]>('LOAD_FAILED', async () => {
        const r = await client.from('sources').select('id, clan_id, tree_id, image_kind, title, status, status_at, error, proposal_count, created_at').eq('tree_id', treeId).order('created_at', { ascending: false })
        return { data: r.data ? (r.data as SourceRow[]).map(toSource) : null, error: r.error }
      }),

    /** Đề xuất đang chờ của cuốn (chỉ quản trị đọc được). */
    pending: (treeId: string) =>
      call<Proposal[]>('LOAD_FAILED', async () => {
        const r = await client.from('proposals').select('*').eq('tree_id', treeId).eq('status', 'pending').order('created_at')
        return { data: r.data as Proposal[] | null, error: r.error }
      }),

    /** Địa chỉ xem ảnh có hạn dùng (1 giờ). */
    imageUrl: async (s: Pick<Source, 'clanId' | 'treeId' | 'id'>): Promise<Outcome<string>> => {
      try {
        const r = await client.storage.from('sources').createSignedUrl(pathOf(s), 3600)
        if (r.error || !r.data) return { ok: false, error: 'LOAD_FAILED' }
        return { ok: true, value: r.data.signedUrl }
      } catch (e) {
        return { ok: false, error: mapError(netError(e), 'LOAD_FAILED') }
      }
    },

    /** Mọi nguồn của một người (kể cả nguồn không được chọn); người xem cũng đọc được. */
    fieldSources: (personId: string) =>
      call<FieldSource[]>('LOAD_FAILED', async () => {
        const r = await client
          .from('field_sources')
          .select('id, person_id, field, value, anchor, accepted, note, reviewed_at, source_id, sources(title, image_kind, clan_id, tree_id)')
          .eq('person_id', personId)
          .order('reviewed_at')
        type Row = { id: string; person_id: string; field: string; value: unknown; anchor: Anchor | null; accepted: boolean; note: string | null; reviewed_at: string; source_id: string; sources: { title: string | null; image_kind: ImageKind | null; clan_id: string; tree_id: string } | null }
        const rows = (r.data as unknown as Row[] | null)?.map(
          (x): FieldSource => ({
            id: x.id, personId: x.person_id, field: x.field, value: x.value, anchor: x.anchor, accepted: x.accepted, note: x.note, reviewedAt: x.reviewed_at, sourceId: x.source_id,
            sourceTitle: x.sources?.title ?? null, imageKind: x.sources?.image_kind ?? null, clanId: x.sources?.clan_id ?? null, treeId: x.sources?.tree_id ?? null,
          }),
        )
        return { data: rows ?? null, error: r.error }
      }),

    /** Nhận / bỏ một đề xuất nguyên tử (RPC `review_proposal`); dùng làm `via` của hàng đợi ghi. */
    review: async (input: {
      proposalId: string
      decision: 'accept' | 'reject'
      edited?: boolean
      note?: string | null
      resultPerson?: string | null
      changes: (Changes & { also?: string[] }) | null
      fields: FieldRecord[]
      children: ChildProposal[]
    }): Promise<SaveResult> => {
      try {
        const { error } = await client.rpc('review_proposal', {
          p_proposal: input.proposalId,
          p_decision: input.decision,
          p_edited: input.edited ?? false,
          p_note: input.note ?? null,
          p_result_person: input.resultPerson ?? null,
          p_changes: input.changes,
          p_fields: input.fields,
          p_children: input.children,
        })
        return error ? { ok: false, error: mapError(error, 'SAVE_FAILED') } : { ok: true }
      } catch (e) {
        return { ok: false, error: mapError(netError(e), 'SAVE_FAILED') }
      }
    },
  }
}

export type SourceStore = ReturnType<typeof sourceStore>
