import { CircleAlert } from 'lucide-react'
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const CONTROL =
  'min-h-11 w-full rounded-md border bg-surface px-3 text-base text-ink placeholder:text-ink-muted aria-[invalid=true]:border-danger aria-[invalid=true]:border-2'

type Common = { label: string; hint?: string; error?: string | null }

function Shell({ id, label, hint, error, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </div>
  )
}

export function ErrorText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm text-danger">
      <CircleAlert aria-hidden size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

const describedBy = (id: string, c: Common) => (c.error ? `${id}-error` : c.hint ? `${id}-hint` : undefined)

export const TextField = forwardRef<HTMLInputElement, Common & InputHTMLAttributes<HTMLInputElement>>(function TextField(
  { label, hint, error, className = '', id: given, ...props },
  ref,
) {
  const auto = useId()
  const id = given ?? auto
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { label, hint, error })}
        className={`${CONTROL} border-line-strong ${className}`}
        {...props}
      />
    </Shell>
  )
})

export const SelectField = forwardRef<HTMLSelectElement, Common & SelectHTMLAttributes<HTMLSelectElement>>(function SelectField(
  { label, hint, error, className = '', id: given, children, ...props },
  ref,
) {
  const auto = useId()
  const id = given ?? auto
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { label, hint, error })}
        className={`${CONTROL} cursor-pointer border-line-strong ${className}`}
        {...props}
      >
        {children}
      </select>
    </Shell>
  )
})

export const TextAreaField = forwardRef<HTMLTextAreaElement, Common & TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextAreaField(
  { label, hint, error, className = '', id: given, ...props },
  ref,
) {
  const auto = useId()
  const id = given ?? auto
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { label, hint, error })}
        className={`${CONTROL} min-h-28 border-line-strong py-2 ${className}`}
        {...props}
      />
    </Shell>
  )
})

/** Nhóm chuyển nhỏ (chế độ xem, bộ lọc): mỗi mục là một nút có `aria-pressed`. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  wrap = false,
}: {
  label: string
  value: T
  options: { value: T; label: string; icon?: import('lucide-react').LucideIcon; hideLabel?: boolean }[]
  onChange: (v: T) => void
  /** Cho xuống dòng thay vì cuộn ngang (bộ lọc dài). */
  wrap?: boolean
}) {
  return (
    <div role="group" aria-label={label} className={`flex gap-2 ${wrap ? 'flex-wrap' : 'overflow-x-auto'}`}>
      {options.map((o) => {
        const on = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            aria-label={o.hideLabel ? o.label : undefined}
            title={o.hideLabel ? o.label : undefined}
            onClick={() => onChange(o.value)}
            className={`inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 text-base transition-colors duration-100 ${
              on ? 'border-accent bg-accent text-white' : 'border-line-strong bg-surface text-ink hover:bg-surface-muted'
            } ${o.hideLabel ? 'px-0' : ''}`}
          >
            {Icon && <Icon aria-hidden size={20} strokeWidth={1.75} />}
            {!o.hideLabel && o.label}
          </button>
        )
      })}
    </div>
  )
}
