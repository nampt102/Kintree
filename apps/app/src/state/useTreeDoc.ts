import type { Result, TreeDoc } from '@kintree/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Role, SaveResult, TreeStore } from '../lib/cloudStore.ts'
import { messageFor, type AppError } from '../lib/messages.ts'
import { createSaveQueue } from './saveQueue.ts'

export type DocState =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; doc: TreeDoc; role: Role }

/** Giữ một cuốn trong bộ nhớ; thao tác thành công cập nhật màn hình ngay rồi được ghi lên máy chủ theo hàng đợi (saveQueue). */
export function useTreeDoc(store: TreeStore, treeId: string) {
  const [state, setState] = useState<DocState>({ status: 'loading' })
  const [saveError, setSaveError] = useState<string | null>(null)
  const docRef = useRef<TreeDoc | null>(null)
  const roleRef = useRef<Role>('viewer')
  const queueRef = useRef<ReturnType<typeof createSaveQueue> | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    void store.load(treeId).then((r) => {
      if (!alive) return
      if (!r.ok) return setState({ status: 'error', error: r.error })
      docRef.current = r.doc
      roleRef.current = r.role
      queueRef.current = createSaveQueue(store, r.doc, {
        saved: () => setSaveError(null),
        rollback: (doc, error) => {
          docRef.current = doc
          setState({ status: 'ready', doc, role: roleRef.current })
          setSaveError(messageFor(error))
        },
      })
      setState({ status: 'ready', doc: r.doc, role: r.role })
    })
    return () => {
      alive = false
      queueRef.current?.cancel()
      queueRef.current = null
    }
  }, [store, treeId, nonce])

  /** Chạy một thao tác của core; nếu thành công thì cập nhật màn hình ngay và xếp hàng ghi. */
  const edit = useCallback(<T extends object>(op: (doc: TreeDoc) => Result<T>, via?: (prev: TreeDoc, next: TreeDoc) => Promise<SaveResult>): Result<T> => {
    const current = docRef.current
    if (!current || !queueRef.current) return { ok: false, error: 'NOT_FOUND' }
    const result = op(current)
    if (!result.ok) return result
    docRef.current = result.doc
    setState({ status: 'ready', doc: result.doc, role: roleRef.current })
    queueRef.current.push(result.doc, via)
    return result
  }, [])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { state, edit, saveError, reload }
}
