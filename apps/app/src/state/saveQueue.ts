import type { TreeDoc } from '@kintree/core'
import type { SaveResult } from '../lib/cloudStore.ts'
import type { StoreError } from '../lib/messages.ts'

type Saver = { save(prev: TreeDoc, next: TreeDoc): Promise<SaveResult> }

/**
 * Hàng đợi ghi tuần tự: mỗi lần sửa gửi các dòng khác bản máy chủ đã xác nhận gần nhất.
 * Một lần ghi lỗi huỷ các lần ghi đang chờ (chúng dựa trên nền chưa có trên máy chủ) và báo hoàn lại
 * về bản đã xác nhận (spec "Sửa liên tiếp theo thứ tự", "Ghi lỗi thì hoàn lại").
 */
export function createSaveQueue(store: Saver, initial: TreeDoc, on: { saved: () => void; rollback: (doc: TreeDoc, error: StoreError) => void }) {
  let confirmed = initial
  let chain: Promise<void> = Promise.resolve()
  let generation = 0
  return {
    push(next: TreeDoc): void {
      const g = generation
      chain = chain.then(async () => {
        if (g !== generation) return
        const result = await store.save(confirmed, next)
        if (g !== generation) return
        if (result.ok) {
          confirmed = next
          on.saved()
        } else {
          generation++
          on.rollback(confirmed, result.error)
        }
      })
    },
    /** Bỏ mọi lần ghi đang chờ (đổi cuốn, rời màn hình). */
    cancel(): void {
      generation++
    },
    confirmed: (): TreeDoc => confirmed,
    /** Chờ hàng đợi hiện tại chạy xong (dùng trong test). */
    idle: (): Promise<void> => chain,
  }
}
