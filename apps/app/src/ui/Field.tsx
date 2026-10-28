import { Check, ChevronsUpDown, CircleAlert } from 'lucide-react'
import { RadioGroup, Select, Switch as SwitchPrimitive } from 'radix-ui'
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from './cn.ts'

// Ô nhập theo kiểu shadcn/ui (change ui-components, bản mẫu mục B): bo 12, viền ≥ 3:1, viền đỏ trầm khi đang nhập.
// Vòng focus bàn phím 3 px vẫn do `:focus-visible` toàn cục lo (index.css).
const CONTROL =
  'min-h-11 w-full rounded-xl border border-line-input bg-surface px-3.5 text-base text-ink shadow-[0_1px_2px_rgb(31_26_23/0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-ink-muted focus:border-accent aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger'

type Common = { label: string; hint?: string; error?: string | null }

function Shell({ id, label, hint, error, children, labelAs = 'label' }: Common & { id: string; children: ReactNode; labelAs?: 'label' | 'span' }) {
  const Label = labelAs
  return (
    <div className="space-y-1.5">
      <Label {...(labelAs === 'label' ? { htmlFor: id } : { id: `${id}-label` })} className="block text-sm font-medium text-ink">
        {label}
      </Label>
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
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm font-medium text-danger">
      <CircleAlert aria-hidden size={17} strokeWidth={1.9} className="mt-0.5 shrink-0" />
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
      <input ref={ref} id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, { label, hint, error })} className={cn(CONTROL, className)} {...props} />
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
        className={cn(CONTROL, 'min-h-28 py-2.5 leading-relaxed', className)}
        {...props}
      />
    </Shell>
  )
})

export type Option<T extends string = string> = { value: T; label: string }

/**
 * Ô chọn dài (nhiều mục, danh sách thay đổi): Radix Select, danh sách tự vẽ theo tông ứng dụng thay cho danh sách của hệ điều hành
 * (spec "Ô chọn theo tông ứng dụng"). Ít mục ngắn thì dùng `ChoiceField`.
 */
export const SelectField = forwardRef<
  HTMLButtonElement,
  Common & { value: string; onChange: (value: string) => void; options: Option[]; placeholder?: string; className?: string }
>(function SelectField({ label, hint, error, value, onChange, options, placeholder = 'Chọn…', className = '' }, ref) {
  const id = useId()
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      {/* Radix không cho giá trị rỗng: '' nghĩa là chưa chọn. */}
      <Select.Root value={value || undefined} onValueChange={onChange}>
        <Select.Trigger
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { label, hint, error })}
          className={cn(CONTROL, 'flex cursor-pointer items-center justify-between gap-2 text-left data-[placeholder]:text-ink-muted data-[state=open]:border-accent', className)}
        >
          <span className="min-w-0 truncate">
            <Select.Value placeholder={placeholder} />
          </span>
          <Select.Icon>
            <ChevronsUpDown aria-hidden size={16} className="shrink-0 text-ink-muted" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={6}
            className="z-[110] max-h-[min(22rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[14px] bg-surface p-1.5 shadow-3 ring-1 ring-line data-[state=open]:animate-[kt-pop-in_160ms_ease-out]"
          >
            <Select.Viewport>
              {options.map((o) => (
                <Select.Item
                  key={o.value}
                  value={o.value}
                  className="relative flex min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-[10px] py-2 pl-9 pr-3 text-[15px] text-ink outline-none data-[highlighted]:bg-surface-muted data-[state=checked]:font-medium data-[state=checked]:text-accent"
                >
                  <Select.ItemIndicator className="absolute left-3 inline-flex">
                    <Check aria-hidden size={16} strokeWidth={2.2} />
                  </Select.ItemIndicator>
                  <Select.ItemText>{o.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </Shell>
  )
})

/**
 * Chọn một trong 2–4 giá trị ngắn bằng nhóm nút (spec "Lựa chọn ít mục bằng nhóm nút"): Radix RadioGroup nên trình đọc màn hình
 * biết mục đang chọn và mũi tên chuyển được. `''` = chưa chọn. `ref` trỏ vào nhóm để chuyển con trỏ tới khi lỗi.
 */
export const ChoiceField = forwardRef<
  HTMLDivElement,
  Common & { value: string; onChange: (value: string) => void; options: (Option & { icon?: import('lucide-react').LucideIcon })[]; hideLabel?: boolean }
>(function ChoiceField({ label, hint, error, value, onChange, options, hideLabel }, ref) {
  const id = useId()
  const group = (
    <RadioGroup.Root
      ref={ref}
      value={value}
      onValueChange={onChange}
      aria-label={hideLabel ? label : undefined}
      aria-labelledby={hideLabel ? undefined : `${id}-label`}
      aria-describedby={describedBy(id, { label, hint, error })}
      aria-invalid={error ? true : undefined}
      tabIndex={-1}
      className={cn('flex gap-1 rounded-full bg-surface-muted p-1 outline-none', error && 'ring-2 ring-danger')}
    >
      {options.map((o) => {
        const Icon = o.icon
        return (
          <RadioGroup.Item
            key={o.value}
            value={o.value}
            className="inline-flex min-h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-[15px] font-medium text-ink-muted transition-[background-color,color,box-shadow] duration-150 hover:text-ink data-[state=checked]:bg-surface data-[state=checked]:font-semibold data-[state=checked]:text-ink data-[state=checked]:shadow-[0_1px_2px_rgb(31_26_23/0.08),0_0_0_1px_rgb(31_26_23/0.04)]"
          >
            {Icon && <Icon aria-hidden size={16} strokeWidth={1.9} />}
            <span className="truncate">{o.label}</span>
          </RadioGroup.Item>
        )
      })}
    </RadioGroup.Root>
  )
  if (hideLabel) return group
  return (
    <Shell id={id} label={label} hint={hint} error={error} labelAs="span">
      {group}
    </Shell>
  )
})

/** Công tắc bật/tắt có nhãn và dòng mô tả; cả dòng bấm được (vùng chạm ≥ 44 px). */
export function Switch({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-sm text-ink-muted">{description}</span>}
      </label>
      {/* Vùng chạm 44 px; thanh trượt 48 × 28 nằm bên trong. */}
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="group inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full"
      >
        <span aria-hidden className="relative h-7 w-12 rounded-full bg-[#c9c0b5] transition-colors duration-150 group-data-[state=checked]:bg-accent">
          <SwitchPrimitive.Thumb className="absolute left-0.5 top-0.5 block size-6 rounded-full bg-white shadow-1 transition-transform duration-150 data-[state=checked]:translate-x-5" />
        </span>
      </SwitchPrimitive.Root>
    </div>
  )
}

/** Nhóm chuyển nhỏ (chế độ xem, bộ lọc, tab): mỗi mục là một nút có `aria-pressed`. */
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
    <div role="group" aria-label={label} className={wrap ? 'flex flex-wrap gap-2' : 'inline-flex gap-1 overflow-x-auto rounded-full bg-surface-muted p-1'}>
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
            className={`inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-[background-color,box-shadow,color] duration-150 ${
              wrap
                ? on
                  ? 'bg-accent-soft text-accent ring-1 ring-accent/30'
                  : 'bg-surface text-ink ring-1 ring-line hover:bg-surface-muted'
                : on
                  ? 'bg-surface text-ink shadow-1'
                  : 'text-ink-muted hover:text-ink'
            } ${o.hideLabel ? 'px-0' : ''}`}
          >
            {Icon && <Icon aria-hidden size={18} strokeWidth={1.85} />}
            {!o.hideLabel && o.label}
          </button>
        )
      })}
    </div>
  )
}
