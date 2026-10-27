import type { LucideIcon } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

// Nút chính: viên thuốc đỏ son có bóng cùng màu (bản mẫu `buttons.html`, kiểu D). Mỗi màn chỉ một nút chính.
// Nút phụ: viên thuốc trắng viền nhạt. Ghost: chỉ chữ. Danger: chữ đỏ, nền đỏ nhạt khi trỏ.
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent font-semibold text-white shadow-pill hover:bg-accent-hover',
  secondary: 'bg-surface font-medium text-ink shadow-1 ring-1 ring-line hover:bg-surface-muted',
  ghost: 'font-medium text-ink hover:bg-surface-muted',
  danger: 'font-medium text-danger hover:bg-danger-soft',
}

// Vùng chạm tối thiểu 44 px: min-h-11 (2.75rem ≥ 44 px ở mọi cỡ chữ gốc ≥ 16 px).
const BASE =
  'inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-full px-5 text-sm transition-[background-color,box-shadow,transform] duration-150 cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  icon?: LucideIcon
  /** Chiếm hết bề ngang và căn trái (danh sách thao tác). */
  block?: boolean
  /** Chiếm hết bề ngang, chữ ở giữa (nút chính của biểu mẫu trên điện thoại). */
  full?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', icon: Icon, block, full, className = '', children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-variant={variant}
      className={`${BASE} ${VARIANT[variant]} ${block ? 'w-full justify-start' : ''} ${full ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {Icon && <Icon aria-hidden size={18} strokeWidth={2} className="shrink-0" />}
      {children}
    </button>
  )
})

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon
  /** Bắt buộc: tên đọc cho trình đọc màn hình và chú thích khi trỏ chuột. */
  label: string
  /** ghost: không nền; secondary: tròn nền xám ấm; primary: tròn đỏ; raised: tròn trắng có bóng (nổi trên sơ đồ). */
  variant?: 'ghost' | 'secondary' | 'primary' | 'raised'
}

/** Nút chỉ có biểu tượng: hình 20 px nhưng vùng chạm luôn 44 × 44 px. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = 'ghost', className = '', type = 'button', ...props },
  ref,
) {
  const styles = {
    ghost: 'text-ink hover:bg-surface-muted',
    secondary: 'bg-surface-muted text-ink hover:bg-line',
    primary: 'bg-accent text-white shadow-pill hover:bg-accent-hover',
    raised: 'bg-surface text-ink shadow-2 ring-1 ring-line hover:bg-surface-muted',
  }[variant]
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      data-variant={variant}
      className={`inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-45 ${styles} ${className}`}
      {...props}
    >
      <Icon aria-hidden size={20} strokeWidth={1.85} />
    </button>
  )
})
