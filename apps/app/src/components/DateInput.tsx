import {
  canChiDay,
  canChiYear,
  isValidPartialDate,
  lunarToSolar,
  solarToLunar,
  type PartialDate,
} from '@kintree/core'
import { useState } from 'react'
import type { Ref } from 'react'
import { ErrorText } from '../ui/index.ts'

type Parts = { d: string; m: string; y: string; lunar: boolean; leap: boolean }

const toParts = (v?: PartialDate): Parts => ({
  d: v?.day?.toString() ?? '',
  m: v?.month?.toString() ?? '',
  y: v?.year.toString() ?? '',
  lunar: v?.lunar ?? false,
  leap: v?.leap ?? false,
})

/** `null` = ô trống (xoá ngày); còn lại là ngày, có thể chưa hợp lệ. */
export function partsToDate(p: Parts): PartialDate | null {
  if (!p.d && !p.m && !p.y) return null
  const num = (s: string) => (s === '' ? undefined : Number(s))
  return {
    year: p.y === '' ? Number.NaN : Number(p.y),
    ...(p.m ? { month: num(p.m) } : {}),
    ...(p.d ? { day: num(p.d) } : {}),
    lunar: p.lunar,
    ...(p.lunar && p.leap ? { leap: true } : {}),
  }
}

/** Dòng giải thích ngày quy đổi và Can Chi khi đã đủ ngày tháng năm. */
export function conversionNote(date: PartialDate | null): string | null {
  if (!date || date.month === undefined || date.day === undefined || !isValidPartialDate(date)) return null
  try {
    if (date.lunar) {
      const s = lunarToSolar({ year: date.year, month: date.month, day: date.day, leap: !!date.leap })
      return `Dương lịch: ${s.day}/${s.month}/${s.year} · năm ${canChiYear(date.year)}, ngày ${canChiDay(s)}`
    }
    const l = solarToLunar({ year: date.year, month: date.month, day: date.day })
    return `Âm lịch: ${l.day}/${l.month}${l.leap ? ' (nhuận)' : ''} năm ${canChiYear(l.year)}, ngày ${canChiDay({ year: date.year, month: date.month, day: date.day })}`
  } catch {
    return null
  }
}

/** Ba ô ngày/tháng/năm: biết đến đâu điền đến đó (docs/PRD: không bắt người nhập đoán ngày). */
export function DateInput({
  label,
  value,
  onChange,
  inputRef,
}: {
  label: string
  value?: PartialDate
  onChange: (date: PartialDate | null) => void
  /** Gắn vào ô ngày để chuyển con trỏ tới đây khi ngày bị từ chối. */
  inputRef?: Ref<HTMLInputElement>
}) {
  const [parts, setParts] = useState<Parts>(() => toParts(value))
  const date = partsToDate(parts)
  const invalid = date !== null && !isValidPartialDate(date)
  const note = conversionNote(date)

  function set(patch: Partial<Parts>) {
    const next = { ...parts, ...patch }
    if (!next.lunar) next.leap = false
    setParts(next)
    onChange(partsToDate(next))
  }

  const control = 'min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger'
  const num = (key: 'd' | 'm' | 'y', placeholder: string, width: string) => (
    <div className={width}>
      <input
        ref={key === 'd' ? inputRef : undefined}
        inputMode="numeric"
        aria-label={`${label}: ${placeholder}`}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        className={`${control} tabular`}
        value={parts[key]}
        onChange={(e) => set({ [key]: e.target.value.replace(/\D/g, '').slice(0, key === 'y' ? 4 : 2) })}
      />
    </div>
  )

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {num('d', 'Ngày', 'w-20')}
        {num('m', 'Tháng', 'w-20')}
        {num('y', 'Năm', 'w-28')}
        <select
          aria-label={`${label}: Dương hay âm lịch`}
          className="min-h-11 cursor-pointer rounded-md border border-line-strong bg-surface px-3 text-base text-ink"
          value={parts.lunar ? 'lunar' : 'solar'}
          onChange={(e) => set({ lunar: e.target.value === 'lunar' })}
        >
          <option value="solar">Dương lịch</option>
          <option value="lunar">Âm lịch</option>
        </select>
        {parts.lunar && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-ink">
            <input type="checkbox" className="size-5 accent-[var(--color-accent)]" checked={parts.leap} onChange={(e) => set({ leap: e.target.checked })} />
            Tháng nhuận
          </label>
        )}
      </div>
      {invalid && <ErrorText>Ngày tháng không hợp lệ. Kiểm lại ngày, tháng, năm (năm từ 1800).</ErrorText>}
      {!invalid && note && <p className="text-sm text-ink-muted">{note}</p>}
    </fieldset>
  )
}
