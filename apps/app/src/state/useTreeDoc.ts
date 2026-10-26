import type { Result, TreeDoc } from '@kintree/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { messageFor, type AppError } from '../lib/messages.ts'
import type { TreeStore } from '../lib/store.ts'

export type DocState =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; doc: TreeDoc }

/** Giữ một cuốn gia phả trong bộ nhớ và ghi xuống kho sau mỗi thao tác thành công. */
export function useTreeDoc(store: TreeStore, treeId: string) {
  const [state, setState] = useState<DocState>({ status: 'loading' })
  const [saveError, setSaveError] = useState<string | null>(null)
  const docRef = useRef<TreeDoc | null>(null)

  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    void store.load(treeId).then((r) => {
      if (!alive) return
      if (r.ok) {
        docRef.current = r.doc
        setState({ status: 'ready', doc: r.doc })
      } else {
        setState({ status: 'error', error: r.error })
      }
    })
    return () => {
      alive = false
    }
  }, [store, treeId])

  /** Chạy một thao tác của core; nếu thành công thì cập nhật màn hình và lưu. Trả kết quả để giao diện báo lỗi. */
  const edit = useCallback(
    <T extends object>(op: (doc: TreeDoc) => Result<T>): Result<T> => {
      const current = docRef.current
      if (!current) return { ok: false, error: 'NOT_FOUND' }
      const result = op(current)
      if (!result.ok) return result
      docRef.current = result.doc
      setState({ status: 'ready', doc: result.doc })
      void store.save(result.doc).then((s) => setSaveError(s.ok ? null : messageFor(s.error)))
      return result
    },
    [store],
  )

  return { state, edit, saveError }
}
