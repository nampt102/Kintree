import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { IconButton } from './Button.tsx'
import { useBackToClose, useVisualViewportHeight } from './hooks.ts'

export const DISCARD_PROMPT = 'Bỏ những gì vừa nhập?'

/**
 * Hộp thoại dùng `<dialog>` gốc (bẫy bàn phím, Esc). Cỡ gọn: phủ toàn màn, chiều cao theo phần nhìn thấy
 * (trừ bàn phím ảo), chân chứa nút chính dính đáy. Cỡ vừa/rộng: căn giữa.
 * `dirty`: đang có dữ liệu chưa lưu thì Esc / nút đóng / bấm ra ngoài / Back đều hỏi trước khi bỏ.
 */
export function Dialog({
  title,
  onClose,
  dirty = false,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  dirty?: boolean
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<Element | null>(typeof document !== 'undefined' ? document.activeElement : null)
  const vvh = useVisualViewportHeight()

  const confirmDiscard = useCallback(() => !dirty || window.confirm(DISCARD_PROMPT), [dirty])
  const requestClose = useCallback(() => {
    if (confirmDiscard()) onClose()
  }, [confirmDiscard, onClose])

  useBackToClose(true, () => {
    if (confirmDiscard()) onClose()
    else history.forward()
  })

  useEffect(() => {
    const el = ref.current
    if (el && !el.open) el.showModal()
    const back = opener.current
    // Trả con trỏ bàn phím về nút đã mở hộp thoại.
    return () => {
      if (back instanceof HTMLElement && back.isConnected) back.focus()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        requestClose()
      }}
      onClick={(e) => e.target === ref.current && requestClose()}
      style={{ ['--vvh' as string]: vvh ? `${vvh}px` : '100dvh' }}
      className="m-auto max-h-[90dvh] w-[min(36rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-2xl bg-surface p-0 text-ink shadow-3 backdrop:bg-scrim backdrop:backdrop-blur-[2px] max-md:m-0 max-md:h-[var(--vvh)] max-md:max-h-none max-md:w-full max-md:rounded-none max-md:border-0"
    >
      <div className="flex h-full max-h-[inherit] flex-col max-md:max-h-[var(--vvh)]">
        <header className="flex items-start gap-2 px-5 pb-1 pt-3 max-md:pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 id="dialog-title" className="min-w-0 flex-1 py-2 text-xl font-semibold leading-snug tracking-[-0.01em]">
            {title}
          </h2>
          <IconButton icon={X} label="Đóng" variant="secondary" onClick={requestClose} className="-mr-1" />
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-3">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 bg-surface px-5 pb-5 pt-3 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  )
}
