import { X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconButton } from './Button.tsx'
import { useBackToClose } from './hooks.ts'

/** Ngưỡng kéo (px) trước khi đổi nấc, để không đổi nhầm khi chỉ chạm. */
const DRAG_THRESHOLD = 64

/**
 * Tấm trượt từ đáy cho cỡ gọn: không chặn phần màn hình phía trên (sơ đồ vẫn kéo được),
 * hai nấc 50% và ~92% chiều cao, kéo tay nắm lên/xuống, kéo xuống ở nấc thấp để đóng.
 * Luôn có nút đóng và nút đổi nấc cho người không kéo được; Esc và Back cũng đóng.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const [snap, setSnap] = useState<'half' | 'full'>('half')
  const [dy, setDy] = useState<number | null>(null)
  const start = useRef<number | null>(null)

  useBackToClose(true, onClose)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const end = () => {
    const d = dy ?? 0
    start.current = null
    setDy(null)
    if (d > DRAG_THRESHOLD) {
      if (snap === 'full') setSnap('half')
      else onClose()
    } else if (d < -DRAG_THRESHOLD) setSnap('full')
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label={title}
      data-snap={snap}
      className="fixed inset-x-0 bottom-0 z-[20] flex flex-col rounded-t-lg border-t border-line bg-surface shadow-sheet transition-[height] duration-[250ms] ease-[var(--ease-out)]"
      style={{
        height: snap === 'full' ? '92dvh' : '50dvh',
        transform: dy ? `translateY(${Math.max(dy, -40)}px)` : undefined,
        transition: dy !== null ? 'none' : undefined,
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="flex items-center gap-1 px-2 pt-1">
        <IconButton icon={X} label="Đóng" onClick={onClose} />
        <button
          type="button"
          aria-label={snap === 'full' ? 'Thu nhỏ bảng thông tin' : 'Mở rộng bảng thông tin'}
          data-testid="sheet-handle"
          className="flex min-h-11 flex-1 cursor-grab touch-none items-center justify-center"
          onClick={() => setSnap(snap === 'full' ? 'half' : 'full')}
          onPointerDown={(e) => {
            start.current = e.clientY
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => start.current !== null && setDy(e.clientY - start.current)}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <span aria-hidden className="h-1.5 w-12 rounded-full bg-line-strong" />
        </button>
        <span className="size-11" aria-hidden />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
    </section>
  )
}
