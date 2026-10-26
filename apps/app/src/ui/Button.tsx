import type { LucideIcon } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-muted',
  ghost: 'text-ink hover:bg-surface-muted',
  danger: 'border border-danger bg-surface text-danger hover:bg-danger-soft',
}

// Vùng chạm tối thiểu 44 px: min-h-11 (2.75rem ≥ 44 px ở mọi cỡ chữ gốc ≥ 16 px).
const BASE =
  'inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-colors duration-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  icon?: LucideIcon
  /** Chiếm hết bề ngang và căn trái (danh sách thao tác). */
  block?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', icon: Icon, block, className = '', children, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={`${BASE} ${VARIANT[variant]} ${block ? 'w-full justify-start' : ''} ${className}`} {...props}>
      {Icon && <Icon aria-hidden size={20} strokeWidth={1.75} className="shrink-0" />}
      {children}
    </button>
  )
})

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon
  /** Bắt buộc: tên đọc cho trình đọc màn hình và chú thích khi trỏ chuột. */
  label: string
  variant?: 'ghost' | 'secondary' | 'primary'
}

/** Nút chỉ có biểu tượng: hình 20–24 px nhưng vùng chạm luôn 44 × 44 px. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = 'ghost', className = '', type = 'button', ...props },
  ref,
) {
  const styles = {
    ghost: 'text-ink hover:bg-surface-muted',
    secondary: 'border border-line-strong bg-surface text-ink shadow-card hover:bg-surface-muted',
    primary: 'bg-accent text-white hover:bg-accent-hover',
  }[variant]
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-45 ${styles} ${className}`}
      {...props}
    >
      <Icon aria-hidden size={22} strokeWidth={1.75} />
    </button>
  )
})
