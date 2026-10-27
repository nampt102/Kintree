import { X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconButton } from './Button.tsx'
import { useBackToClose } from './hooks.ts'

/** Ngưỡng kéo (px) trước khi đổi nấc, để không đổi nhầm khi chỉ chạm. */
const DRAG_THRESHOLD = 64

/**
 * Tấm trượt cho cỡ gọn (spec `responsive-layout`). Có `peek`: mở thành thẻ nổi gọn ở đáy (nội dung `peek`),
 * kéo tay nắm lên thì mở rộng gần toàn màn (nội dung `children`); không có `peek`: hai nấc 50% và ~92%.
 * Kéo xuống ở nấc thấp để đóng. Luôn có nút đóng và nút đổi nấc cho người không kéo được; Esc và Back cũng đóng.
 * Không chặn phần màn hình phía trên (sơ đồ vẫn kéo được).
 */
export function Sheet({ title, onClose, peek, children }: { title: string; onClose: () => void; peek?: ReactNode; children: ReactNode }) {
  const low = peek ? 'peek' : 'half'
  const [snap, setSnap] = useState<'peek' | 'half' | 'full'>(low)
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
      if (snap === 'full') setSnap(low)
      else onClose()
    } else if (d < -DRAG_THRESHOLD) setSnap('full')
  }

  const isPeek = snap === 'peek'
  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label={title}
      data-snap={snap}
      className={`fixed z-[20] flex flex-col bg-surface transition-[height,inset,border-radius] duration-[250ms] ease-[var(--ease-out)] ${
        isPeek ? 'inset-x-3 rounded-[26px] shadow-3' : 'inset-x-0 bottom-0 rounded-t-[22px] shadow-sheet'
      }`}
      style={{
        height: isPeek ? undefined : snap === 'full' ? '92dvh' : '50dvh',
        bottom: isPeek ? 'calc(max(12px, env(safe-area-inset-bottom)) + 72px)' : undefined,
        transform: dy ? `translateY(${Math.max(dy, -40)}px)` : undefined,
        transition: dy !== null ? 'none' : undefined,
        paddingLeft: isPeek ? undefined : 'env(safe-area-inset-left)',
        paddingRight: isPeek ? undefined : 'env(safe-area-inset-right)',
      }}
    >
      <div className="relative flex items-center px-2 pt-1">
        <button
          type="button"
          aria-label={snap === 'full' ? 'Thu nhỏ bảng thông tin' : 'Mở rộng bảng thông tin'}
          data-testid="sheet-handle"
          className="mx-12 flex min-h-11 flex-1 cursor-grab touch-none items-center justify-center"
          onClick={() => setSnap(snap === 'full' ? low : 'full')}
          onPointerDown={(e) => {
            start.current = e.clientY
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => start.current !== null && setDy(e.clientY - start.current)}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <span aria-hidden className="h-1.5 w-10 rounded-full bg-[#ddd6cd]" />
        </button>
        <IconButton icon={X} label="Đóng" variant="secondary" onClick={onClose} className="absolute right-2 top-1" />
      </div>
      {isPeek ? (
        <div className="px-4 pb-4">{peek}</div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      )}
    </section>
  )
}
