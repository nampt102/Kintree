import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** Thẻ bấm được: nền trắng + bóng nhẹ, không viền đậm (spec "Viền và vùng bấm nhìn thấy được"). */
export function CardButton({ className = '', children, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl bg-surface p-4 text-left shadow-1 ring-1 ring-line/60 transition-[box-shadow,transform] duration-150 hover:shadow-2 active:scale-[0.99] ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

/** Khối nền trắng tĩnh (biểu mẫu, danh sách thông tin). */
export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl bg-surface shadow-1 ring-1 ring-line/60 ${className}`}>{children}</div>
}

export type Tone = 'neutral' | 'accent' | 'male' | 'female' | 'danger'

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-ink-muted',
  accent: 'bg-accent-soft text-accent',
  male: 'bg-male-soft text-male',
  female: 'bg-female-soft text-female',
  danger: 'bg-danger-soft text-danger',
}

export function Badge({ tone = 'neutral', icon: Icon, children, className = '' }: { tone?: Tone; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-semibold leading-6 ${TONE[tone]} ${className}`}>
      {Icon && <Icon aria-hidden size={13} strokeWidth={2.2} />}
      {children}
    </span>
  )
}

/** Chữ cái đầu của tên gọi (từ cuối của họ tên Việt), viết hoa. */
export function initialOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/)
  return (words[words.length - 1]?.[0] ?? '?').toLocaleUpperCase('vi')
}

/** Ảnh đại diện chữ cái đầu, màu theo giới tính. Trang trí: thông tin thật nằm ở chữ bên cạnh. */
export function Avatar({ name, gender, muted, size = 40, className = '' }: { name: string; gender?: 'male' | 'female' | 'unknown'; muted?: boolean; size?: number; className?: string }) {
  const tone = muted ? 'bg-[#e7e1d9] text-ink-muted' : gender === 'male' ? 'bg-male-soft text-male' : gender === 'female' ? 'bg-female-soft text-female' : 'bg-surface-muted text-ink-muted'
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${tone} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initialOf(name)}
    </span>
  )
}

/** Tiêu đề màn: tên, dòng phụ (ngữ cảnh, số lượng) và thao tác chính. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold leading-tight tracking-[-0.015em]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/** Tiêu đề nhóm nhỏ. */
export function GroupLabel({ children }: { children: ReactNode }) {
  return <p className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-[0.07em] text-ink-muted">{children}</p>
}

export type ActionItem = { label: string; icon: LucideIcon; onSelect: () => void }

/** Danh sách gọn cho việc ít dùng: biểu tượng mảnh, chữ, mũi tên; mỗi dòng là một nút giữ đúng tên cũ. */
export function ActionList({ items, className = '' }: { items: ActionItem[]; className?: string }) {
  if (items.length === 0) return null
  return (
    <ul className={`divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-1 ring-1 ring-line/60 ${className}`}>
      {items.map((it) => {
        const Icon = it.icon
        return (
          <li key={it.label}>
            <button
              type="button"
              onClick={it.onSelect}
              className="flex min-h-12 w-full cursor-pointer items-center gap-3.5 px-4 py-2.5 text-left text-ink transition-colors duration-100 hover:bg-surface-muted"
            >
              <Icon aria-hidden size={18} strokeWidth={1.85} className="shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1 font-medium">{it.label}</span>
              <ChevronRight aria-hidden size={16} className="shrink-0 text-connector" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Bảng nhãn–giá trị trên nền nhạt (thông tin một người). */
export function InfoList({ rows }: { rows: { label: string; value?: string; /** Nút nhỏ cạnh giá trị (vd. dấu nguồn). */ extra?: ReactNode }[] }) {
  const shown = rows.filter((r) => r.value)
  if (shown.length === 0) return null
  return (
    <dl className="divide-y divide-line overflow-hidden rounded-xl bg-canvas text-sm ring-1 ring-line/60">
      {shown.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-4 px-4 py-3">
          <dt className="shrink-0 text-ink-muted">{r.label}</dt>
          <dd className="flex min-w-0 items-center justify-end gap-2 text-right font-medium">
            <span className="min-w-0">{r.value}</span>
            {r.extra}
          </dd>
        </div>
      ))}
    </dl>
  )
}
