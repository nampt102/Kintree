import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useCallback, useRef, type ReactNode } from 'react'
import { IconButton } from './Button.tsx'
import { cn } from './cn.ts'
import { useBackToClose, useVisualViewportHeight } from './hooks.ts'

export const DISCARD_PROMPT = 'Bỏ những gì vừa nhập?'

/**
 * Hộp thoại Radix (change ui-components): bẫy bàn phím, Esc, trả focus, lớp nổi chung với ô chọn và menu.
 * Cỡ gọn: phủ toàn màn (phương án D1 đã duyệt), chiều cao theo phần nhìn thấy (trừ bàn phím ảo), chân dính đáy.
 * `dirty`: đang có dữ liệu chưa lưu thì Esc / nút đóng / bấm ra ngoài / Back đều hỏi trước khi bỏ.
 * `wide`: form dài (hồ sơ người) rộng 640 px trên máy tính.
 */
export function Dialog({
  title,
  subtitle,
  onClose,
  dirty = false,
  wide = false,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  onClose: () => void
  dirty?: boolean
  wide?: boolean
  children: ReactNode
  footer?: ReactNode
}) {
  const vvh = useVisualViewportHeight()
  // Nút đã mở hộp thoại: trả con trỏ bàn phím về đó khi đóng (nút nằm ngoài cây Radix nên Radix không tự biết).
  const opener = useRef<Element | null>(typeof document !== 'undefined' ? document.activeElement : null)
  const confirmDiscard = useCallback(() => !dirty || window.confirm(DISCARD_PROMPT), [dirty])
  const requestClose = useCallback(() => {
    if (confirmDiscard()) onClose()
  }, [confirmDiscard, onClose])

  useBackToClose(true, () => {
    if (confirmDiscard()) onClose()
    else history.forward()
  })

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && requestClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-scrim backdrop-blur-[2px] data-[state=open]:animate-[kt-fade-in_200ms_ease-out]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            const back = opener.current
            if (back instanceof HTMLElement && back.isConnected) back.focus()
          }}
          // Radix tự đóng khi Esc / bấm ra ngoài; chặn lại để hỏi trước khi bỏ dữ liệu.
          onEscapeKeyDown={(e) => {
            e.preventDefault()
            requestClose()
          }}
          onInteractOutside={(e) => {
            e.preventDefault()
            requestClose()
          }}
          style={{ ['--vvh' as string]: vvh ? `${vvh}px` : '100dvh' }}
          className={cn(
            'fixed left-1/2 top-1/2 z-[100] flex max-h-[90dvh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-surface text-ink shadow-3 outline-none data-[state=open]:animate-[kt-pop-in_200ms_ease-out]',
            'max-md:inset-0 max-md:h-[var(--vvh)] max-md:max-h-none max-md:w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:data-[state=open]:animate-none',
            wide && 'md:w-[min(40rem,calc(100vw-2rem))]',
          )}
        >
          <header className="flex items-start gap-3 px-5 pb-2 pt-4 max-md:pt-[max(1rem,env(safe-area-inset-top))] max-md:shadow-[0_1px_0_var(--color-line)] md:px-6 md:pt-5">
            <div className="min-w-0 flex-1 py-1.5">
              <DialogPrimitive.Title className="text-xl font-semibold leading-snug tracking-[-0.01em]">{title}</DialogPrimitive.Title>
              {subtitle && <p className="mt-0.5 text-ink-muted">{subtitle}</p>}
            </div>
            <IconButton icon={X} label="Đóng" variant="secondary" onClick={requestClose} className="-mr-1" />
          </header>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-3 md:px-6">{children}</div>
          {footer && (
            <footer className="flex flex-wrap items-center justify-end gap-2 bg-surface px-5 pb-5 pt-3 shadow-[0_-1px_0_var(--color-line)] max-md:pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">
              {footer}
            </footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
