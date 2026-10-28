import { Check, type LucideIcon } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useCallback, type ReactNode } from 'react'
import { toast, Toaster } from 'sonner'

/**
 * Thông báo ngắn sau mỗi thao tác (Sonner, thẻ trắng như bản mẫu mục E): không cướp con trỏ, tự ẩn sau 4 giây,
 * góc dưới phải trên máy tính, trên đầu màn trên điện thoại.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }} duration={4000} visibleToasts={3} />
    </>
  )
}

export const useToast = () =>
  useCallback(
    (text: string) =>
      toast.custom(() => (
        <p data-testid="toast" className="flex w-[min(22rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl bg-surface p-4 font-medium text-ink shadow-3 ring-1 ring-line">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e8f3ec] text-[#1f7a45]">
            <Check size={16} strokeWidth={2.4} />
          </span>
          {text}
        </p>
      )),
    [],
  )

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

/** Menu thêm (⋯): Radix DropdownMenu (mũi tên, Enter, Esc, đóng khi bấm ra ngoài). Mục `danger` chữ đỏ, tách bằng vạch. */
export function OverflowMenu({
  trigger,
  items,
}: {
  trigger: (props: { 'aria-expanded'?: boolean }) => ReactNode
  items: { label: string; icon?: LucideIcon; onSelect: () => void; danger?: boolean }[]
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger({})}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-[110] min-w-56 rounded-[14px] bg-surface p-1.5 shadow-3 ring-1 ring-line data-[state=open]:animate-[kt-pop-in_160ms_ease-out]"
        >
          {items.map((it, i) => {
            const Icon = it.icon
            return (
              <div key={it.label}>
                {it.danger && i > 0 && <DropdownMenu.Separator className="mx-1 my-1 h-px bg-line" />}
                <DropdownMenu.Item
                  onSelect={it.onSelect}
                  className={`flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-[10px] px-3 text-[15px] outline-none data-[highlighted]:bg-surface-muted ${it.danger ? 'text-danger data-[highlighted]:bg-danger-soft' : 'text-ink'}`}
                >
                  {Icon && <Icon aria-hidden size={18} strokeWidth={1.85} className={it.danger ? '' : 'text-ink-muted'} />}
                  {it.label}
                </DropdownMenu.Item>
              </div>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
