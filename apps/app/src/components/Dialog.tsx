import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './ui.tsx'

/** Hộp thoại dùng thẻ `<dialog>` gốc: có sẵn bẫy bàn phím, Esc để đóng, nền mờ. */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el && !el.open) el.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className="m-auto max-h-[90dvh] w-[min(34rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-line bg-paper p-0 text-ink backdrop:bg-black/40"
    >
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 id="dialog-title" className="text-xl font-semibold">
            {title}
          </h2>
          <Button variant="ghost" aria-label="Đóng" onClick={onClose} className="-mr-2 -mt-1 px-3">
            ✕
          </Button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2 pt-2">{children}</div>
}
