import { CheckCircle2, type LucideIcon } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Toast = { id: number; text: string }

const ToastContext = createContext<(text: string) => void>(() => {})

/** Thông báo ngắn sau mỗi thao tác: `aria-live="polite"` (không cướp con trỏ), tự ẩn sau 4 giây. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const next = useRef(1)
  const show = useCallback((text: string) => {
    const id = next.current++
    setToasts((t) => [...t.slice(-2), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 z-[1000] flex flex-col items-center gap-2 px-4"
        style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }}
      >
        {toasts.map((t) => (
          <p key={t.id} data-testid="toast" className="flex max-w-md items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-3">
            <CheckCircle2 aria-hidden size={20} strokeWidth={1.75} className="shrink-0" />
            {t.text}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-12 text-center">
      <span aria-hidden className="mb-1 grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Icon size={30} strokeWidth={1.6} />
      </span>
      <h2 className="text-xl font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="text-ink-muted">{text}</p>
      {action}
    </div>
  )
}

/** Khung giữ chỗ khi đang tải (hoạt ảnh chỉ dùng cho trạng thái tải, tắt khi giảm chuyển động). */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="space-y-3 p-4">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-muted" />
      ))}
    </div>
  )
}

/** Menu thêm (⋯): đóng khi bấm ra ngoài hoặc Esc. */
export function OverflowMenu({ trigger, items }: { trigger: (props: { onClick: () => void; 'aria-expanded': boolean }) => ReactNode; items: { label: string; icon?: LucideIcon; onSelect: () => void }[] }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={box} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open })}
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-[40] mt-2 min-w-56 overflow-hidden rounded-xl bg-surface py-1.5 shadow-3 ring-1 ring-line/60">
          {items.map((it) => {
            const Icon = it.icon
            return (
              <li key={it.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 text-left text-[15px] hover:bg-surface-muted"
                  onClick={() => {
                    setOpen(false)
                    it.onSelect()
                  }}
                >
                  {Icon && <Icon aria-hidden size={18} strokeWidth={1.85} className="text-ink-muted" />}
                  {it.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function TopBar({ children }: { children: ReactNode }) {
  return (
    <header
      className="sticky top-0 z-[10] flex min-h-16 items-center gap-1 bg-surface/90 shadow-[0_1px_0_var(--color-line)] backdrop-blur-md"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      {children}
    </header>
  )
}
