import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

// Vùng chạm tối thiểu 44 px (min-h-11 = 2.75rem = 49.5 px ở chữ gốc 18 px).
const base = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-colors disabled:opacity-50'

export function Button({ variant = 'secondary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'bg-seal text-white hover:bg-[#7d2218]',
    secondary: 'border border-line bg-white hover:bg-[#f1ead9]',
    danger: 'border border-seal bg-white text-seal hover:bg-[#f8e6e3]',
    ghost: 'hover:bg-[#f1ead9]',
  }[variant]
  return <button type="button" className={`${base} ${styles} ${className}`} {...props} />
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-[#6b5d4a]">{hint}</span>}
    </label>
  )
}

const inputCls = 'min-h-11 w-full rounded-md border border-line bg-white px-3 text-base'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputCls} {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputCls} {...props} />
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md border border-seal bg-[#f8e6e3] px-3 py-2 text-sm text-seal">
      {children}
    </p>
  )
}
