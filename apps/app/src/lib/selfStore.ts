import type { SupabaseClient } from '@supabase/supabase-js'
import { mapError, type Outcome } from './cloudStore.ts'
import type { StoreError } from './messages.ts'

// "Tôi là ai" theo cuốn (change kinship-terms, design D3). Chỉ ảnh hưởng cách hiển thị xưng hô của chính người dùng.

const netError = (e: unknown) => ({ message: e instanceof Error ? e.message : 'network' })

export function selfStore(client: SupabaseClient, userId: string) {
  const guard = async <T>(fn: () => Promise<Outcome<T>>, fallback: StoreError): Promise<Outcome<T>> => {
    try {
      return await fn()
    } catch (e) {
      return { ok: false, error: mapError(netError(e), fallback) }
    }
  }
  return {
    /** Người mình đã chọn trong cuốn, hoặc null. */
    get: (treeId: string): Promise<Outcome<string | null>> =>
      guard(async () => {
        const { data, error } = await client.from('tree_self').select('person_id').eq('user_id', userId).eq('tree_id', treeId).maybeSingle()
        if (error) return { ok: false, error: mapError(error, 'LOAD_FAILED') }
        return { ok: true, value: (data?.person_id as string | undefined) ?? null }
      }, 'LOAD_FAILED'),

    /** Chọn (hoặc đổi) mình là `personId` trong cuốn. */
    set: (treeId: string, personId: string): Promise<Outcome<void>> =>
      guard(async () => {
        const { error } = await client.from('tree_self').upsert({ user_id: userId, tree_id: treeId, person_id: personId, updated_at: new Date().toISOString() }, { onConflict: 'user_id,tree_id' })
        if (error) return { ok: false, error: mapError(error, 'SAVE_FAILED') }
        return { ok: true, value: undefined }
      }, 'SAVE_FAILED'),

    /** Bỏ lựa chọn. */
    clear: (treeId: string): Promise<Outcome<void>> =>
      guard(async () => {
        const { error } = await client.from('tree_self').delete().eq('user_id', userId).eq('tree_id', treeId)
        if (error) return { ok: false, error: mapError(error, 'SAVE_FAILED') }
        return { ok: true, value: undefined }
      }, 'SAVE_FAILED'),
  }
}

export type SelfStore = ReturnType<typeof selfStore>
