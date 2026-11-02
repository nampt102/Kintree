import { calendarEvents, canChiYear, incompleteDeaths, jdn, MAX_YEAR, MIN_YEAR, monthGrid, upcomingEvents, type CalendarEvent, type GridCell, type SolarDate } from '@kintree/core'
import { ArrowLeft, ArrowRight, Cake, CalendarHeart, ChevronLeft, ChevronRight, Flame, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { todaySolar, type CalendarEntry } from '../lib/calendarStore.ts'
import type { Directory, Outcome } from '../lib/cloudStore.ts'
import { formatPartialDate } from '../lib/format.ts'
import { messageFor } from '../lib/messages.ts'
import { Button, cn, ErrorText, IconButton, Segmented, Skeleton, TopBar } from '../ui/index.ts'
import type { ReminderStore } from '../lib/reminderStore.ts'
import { AccountMenu } from './AccountMenu.tsx'
import { pagePad } from './ClanList.tsx'
import { ReminderCard } from './ReminderCard.tsx'

// Màn "Ngày giỗ" cấp dòng họ: lịch tháng âm–dương, sắp tới 30 ngày, chưa tính được giỗ (change lunar-calendar-view, bản mẫu `mockup.html`).

export type CalendarData = Outcome<CalendarEntry[]> | null
type Event = CalendarEvent<CalendarEntry>
type OpenPerson = (treeId: string, personId: string) => void

const ALL = 'all'
const WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const keyOf = (d: SolarDate) => `${d.year}-${d.month}-${d.day}`
const sameDay = (a: SolarDate, b: SolarDate) => a.year === b.year && a.month === b.month && a.day === b.day
const lunarText = (l: { day: number; month: number; leap: boolean }) => `${l.day}/${l.month}${l.leap ? ' nhuận' : ''}`
const kindText = (e: Event) => (e.kind === 'death' ? (e.anniversary ?? 'Giỗ') : `Sinh nhật ${e.age} tuổi`)
/** Trong ô lịch chỉ đủ chỗ cho tên gọi; giỗ đầu/hết ghi chữ, giỗ thường bỏ chữ (spec: kỳ giỗ bằng chữ). */
const chipText = (e: Event) => {
  const name = e.person.fullName.trim().split(/\s+/).at(-1) ?? ''
  if (e.kind === 'birthday') return `${name} · ${e.age}`
  return e.anniversary === 'Giỗ thường' || !e.anniversary ? name : `${name} · ${e.anniversary.replace('Giỗ ', '')}`
}

function whenText(e: Event, today: SolarDate): string {
  const n = jdn(e.date) - jdn(today)
  return n === 0 ? 'hôm nay' : n === 1 ? 'ngày mai' : `còn ${n} ngày`
}

/** Một dòng sự kiện: khối ngày, tên, kỳ giỗ/tuổi, ngày âm, cuốn, còn bao lâu; bấm thì mở người trong cây. */
function EventRow({ e, today, treeName, onOpen }: { e: Event; today: SolarDate; treeName?: string; onOpen: OpenPerson }) {
  const death = e.kind === 'death'
  const soon = jdn(e.date) - jdn(today) < 7
  return (
    <li>
      <button type="button" onClick={() => onOpen(e.person.treeId, e.person.id)} className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors duration-100 hover:bg-surface-muted/60">
        <span aria-hidden className={cn('w-12 shrink-0 rounded-xl py-1 text-center', death ? 'bg-accent-soft text-accent' : 'bg-ok-soft text-ok')}>
          <span className="tabular block text-lg font-semibold leading-tight">{String(e.date.day).padStart(2, '0')}</span>
          <span className="block text-[10px] font-semibold uppercase">tháng {e.date.month}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{e.person.fullName}</span>
          <span className="block truncate text-xs text-ink-muted">
            {kindText(e)} · âm {lunarText(e.lunar)}
            {treeName && ` · ${treeName}`}
          </span>
        </span>
        <span className={cn('shrink-0 text-xs font-medium', soon ? 'text-accent' : 'text-ink-muted')}>{whenText(e, today)}</span>
      </button>
    </li>
  )
}

function EventList({ events, today, treeNames, onOpen, empty }: { events: Event[]; today: SolarDate; treeNames: Map<string, string> | null; onOpen: OpenPerson; empty: string }) {
  if (events.length === 0) return <p className="rounded-xl bg-surface px-4 py-5 text-sm text-ink-muted shadow-1 ring-1 ring-line/60">{empty}</p>
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-1 ring-1 ring-line/60">
      {events.map((e) => (
        <EventRow key={`${e.kind}-${e.person.id}-${keyOf(e.date)}`} e={e} today={today} treeName={treeNames?.get(e.person.treeId)} onOpen={onOpen} />
      ))}
    </ul>
  )
}

/** Tên cuốn chỉ ghi khi dòng họ có từ hai cuốn. */
const treeNamesOf = (dir: Directory, clanId: string) => {
  const trees = dir.trees.filter((t) => t.clanId === clanId)
  return trees.length >= 2 ? new Map(trees.map((t) => [t.id, t.name])) : null
}

/** Thẻ "Ngày giỗ sắp tới" trên trang nhà dòng họ: 3 sự kiện gần nhất và lối vào lịch (lối vào duy nhất trên điện thoại). */
export function UpcomingCard({ data, dir, clanId, onOpenCalendar, onOpenPerson }: { data: CalendarData; dir: Directory; clanId: string; onOpenCalendar: () => void; onOpenPerson: OpenPerson }) {
  const [today] = useState(todaySolar)
  const events = useMemo(() => (data?.ok ? upcomingEvents(data.value, today, 30).slice(0, 3) : []), [data, today])
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-[-0.01em]">Ngày giỗ sắp tới</h2>
        <button type="button" onClick={onOpenCalendar} className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full px-2 font-semibold text-accent hover:bg-accent-soft">
          Xem lịch
          <ArrowRight aria-hidden size={16} />
        </button>
      </div>
      {!data ? (
        <div className="h-16 animate-pulse rounded-xl bg-surface-muted" />
      ) : !data.ok ? (
        <ErrorText>{messageFor(data.error)}</ErrorText>
      ) : (
        <EventList events={events} today={today} treeNames={treeNamesOf(dir, clanId)} onOpen={onOpenPerson} empty="30 ngày tới không có giỗ hay sinh nhật." />
      )}
    </section>
  )
}

/** Tháng âm và năm Can Chi mà tháng dương đang xem đi qua, vd. "Tháng 1 – 2 âm lịch · năm Bính Ngọ". */
function lunarSpan(cells: GridCell[]): string {
  const inMonth = cells.filter((c) => c.inMonth && c.lunar)
  const a = inMonth[0]?.lunar
  const b = inMonth.at(-1)?.lunar
  if (!a || !b) return ''
  const m = (l: typeof a) => `${l.month}${l.leap ? ' nhuận' : ''}`
  const months = m(a) === m(b) ? m(a) : `${m(a)} – ${m(b)}`
  const years = a.year === b.year ? canChiYear(a.year) : `${canChiYear(a.year)} – ${canChiYear(b.year)}`
  return `Tháng ${months} âm lịch · năm ${years}`
}

export function CalendarScreen({
  data,
  dir,
  clanId,
  email,
  hideBack = false,
  onBack,
  onRetry,
  onOpenPerson,
  reminders,
}: {
  data: CalendarData
  dir: Directory
  clanId: string
  email: string
  hideBack?: boolean
  onBack: () => void
  onRetry: () => void
  onOpenPerson: OpenPerson
  reminders: ReminderStore
}) {
  const [today] = useState(todaySolar)
  const [view, setView] = useState({ year: today.year, month: today.month })
  const [selected, setSelected] = useState<SolarDate | null>(null)
  const [tree, setTree] = useState(ALL)
  const clan = dir.clans.find((c) => c.id === clanId)
  const trees = dir.trees.filter((t) => t.clanId === clanId)
  const treeNames = treeNamesOf(dir, clanId)
  const people = useMemo(() => (data?.ok ? data.value.filter((p) => tree === ALL || p.treeId === tree) : []), [data, tree])

  const cells = useMemo(() => {
    const all = monthGrid(view.year, view.month)
    // Bỏ các hàng cuối toàn ngày tháng sau.
    return all.filter((_, i) => all.slice(i - (i % 7), i - (i % 7) + 7).some((c) => c.inMonth))
  }, [view])
  const events = useMemo(() => calendarEvents(people, view.year, view.month, today), [people, view, today])
  const byDay = useMemo(() => {
    const m = new Map<string, Event[]>()
    for (const e of events) m.set(keyOf(e.date), [...(m.get(keyOf(e.date)) ?? []), e])
    return m
  }, [events])
  const upcoming = useMemo(() => upcomingEvents(people, today, 30), [people, today])
  const incomplete = useMemo(() => incompleteDeaths(people), [people])

  const atStart = view.year === MIN_YEAR && view.month === 1
  const atEnd = view.year === MAX_YEAR && view.month === 12
  const shift = (d: number) => {
    const n = view.year * 12 + view.month - 1 + d
    setView({ year: Math.floor(n / 12), month: (n % 12) + 1 })
    setSelected(null)
  }
  const selectedEvents = selected ? (byDay.get(keyOf(selected)) ?? []) : []
  const selectedLunar = selected ? cells.find((c) => sameDay(c.date, selected))?.lunar : null
  const isAdminOf = (treeId: string) => dir.trees.find((t) => t.id === treeId)?.role === 'admin'

  const body = !data ? (
    <Skeleton lines={4} />
  ) : !data.ok ? (
    <div className="space-y-3">
      <ErrorText>{messageFor(data.error)}</ErrorText>
      <Button onClick={onRetry}>Thử lại</Button>
    </div>
  ) : (
    <div className="gap-6 lg:flex">
      <div className="min-w-0 flex-1 space-y-4">
        {trees.length >= 2 && <Segmented wrap label="Lọc theo cuốn" value={tree} onChange={setTree} options={[{ value: ALL, label: 'Tất cả' }, ...trees.map((t) => ({ value: t.id, label: t.name }))]} />}
        <div className="overflow-hidden rounded-xl bg-surface shadow-1 ring-1 ring-line/60">
          <div aria-hidden className="grid grid-cols-7 bg-surface-muted/60 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {WEEK.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[repeat(7,minmax(0,1fr))]" data-testid="calendar-grid">
            {cells.map((c) => {
              const evs = c.inMonth ? (byDay.get(keyOf(c.date)) ?? []) : []
              const isToday = sameDay(c.date, today)
              const on = !!selected && sameDay(c.date, selected)
              const first = c.lunar?.day === 1
              return (
                <div
                  key={keyOf(c.date)}
                  className={cn(
                    'relative min-h-12 px-0.5 py-1 shadow-[inset_1px_0_0_var(--color-line),inset_0_1px_0_var(--color-line)] md:min-h-[104px] md:p-2',
                    !c.inMonth && 'bg-surface-muted/50 text-connector',
                    on && 'bg-accent-soft/60',
                  )}
                >
                  {c.inMonth && (
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`Ngày ${c.date.day}/${c.date.month}${isToday ? ', hôm nay' : ''}${c.lunar ? `, âm ${lunarText(c.lunar)}` : ''}, ${evs.length} sự kiện`}
                      onClick={() => setSelected(c.date)}
                      className="absolute inset-0 cursor-pointer"
                    />
                  )}
                  <div className="pointer-events-none relative flex flex-col items-center md:flex-row md:items-baseline md:gap-1.5">
                    <span className={cn('tabular text-[15px] font-semibold leading-none md:text-[17px]', isToday && 'grid size-7 place-items-center rounded-full bg-accent text-white md:-ml-1.5 md:-mt-1')}>{c.date.day}</span>
                    {c.lunar && <span className={cn('text-[10px] md:text-xs', first ? 'font-semibold text-accent' : 'text-ink-muted', !c.inMonth && 'text-connector')}>{first ? lunarText(c.lunar) : c.lunar.day}</span>}
                  </div>
                  {/* Điện thoại: chấm (đỏ giỗ, xanh sinh nhật); máy tính: tối đa 2 nhãn + "+N nữa". */}
                  {evs.length > 0 && (
                    <div aria-hidden className="pointer-events-none relative mt-1 flex justify-center gap-0.5 md:hidden">
                      {evs.slice(0, 3).map((e, i) => (
                        <span key={i} className={cn('size-1.5 rounded-full', e.kind === 'death' ? 'bg-accent' : 'bg-ok')} />
                      ))}
                    </div>
                  )}
                  <div className="relative hidden md:block">
                    {evs.slice(0, 2).map((e) => {
                      const Icon = e.kind === 'death' ? Flame : Cake
                      return (
                        <button
                          key={`${e.kind}-${e.person.id}`}
                          type="button"
                          title={`${e.person.fullName} · ${kindText(e)}`}
                          aria-label={`${e.person.fullName} · ${kindText(e)}`}
                          onClick={() => onOpenPerson(e.person.treeId, e.person.id)}
                          className={cn(
                            'mt-1 flex w-full cursor-pointer items-center gap-1 overflow-hidden rounded-lg px-1.5 text-left text-xs font-medium leading-[22px] whitespace-nowrap',
                            e.kind === 'death' ? 'bg-accent-soft text-accent-hover' : 'bg-ok-soft text-ok',
                          )}
                        >
                          <Icon aria-hidden size={12} className="shrink-0" />
                          <span className="truncate">{chipText(e)}</span>
                        </button>
                      )
                    })}
                    {evs.length > 2 && (
                      <button type="button" onClick={() => setSelected(c.date)} className="mt-1 cursor-pointer px-0.5 text-xs text-ink-muted hover:text-ink">
                        +{evs.length - 2} nữa
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {events.length === 0 && <p className="text-sm text-ink-muted">Tháng này không có giỗ hay sinh nhật. Chuyển tháng khác hoặc xem “Sắp tới”.</p>}

        {selected && (
          <section aria-label="Sự kiện của ngày đã chọn" className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-[0.07em] text-ink-muted">
              {selected.day}/{selected.month}
              {selectedLunar && ` · âm ${lunarText(selectedLunar)}`} · {selectedEvents.length} sự kiện
            </p>
            <EventList events={selectedEvents} today={today} treeNames={treeNames} onOpen={onOpenPerson} empty="Ngày này không có giỗ hay sinh nhật." />
          </section>
        )}

        {incomplete.length > 0 && (
          <details className="group rounded-xl bg-surface shadow-1 ring-1 ring-line/60">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm text-ink-muted">
              <TriangleAlert aria-hidden size={16} className="shrink-0" />
              <span className="flex-1">
                <span className="font-semibold text-ink">Chưa tính được giỗ</span> · {incomplete.length} người đã mất thiếu ngày/tháng mất
              </span>
              <ChevronRight aria-hidden size={16} className="transition-transform group-open:rotate-90" />
            </summary>
            <ul className="divide-y divide-line border-t border-line">
              {incomplete.map((p) => (
                <li key={p.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.fullName}</p>
                    <p className="text-sm text-ink-muted">
                      mất {formatPartialDate(p.death)} · thiếu ngày/tháng mất
                      {treeNames && ` · ${treeNames.get(p.treeId)}`}
                    </p>
                  </div>
                  {isAdminOf(p.treeId) && <Button onClick={() => onOpenPerson(p.treeId, p.id)}>Bổ sung</Button>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <aside className="mt-6 shrink-0 space-y-4 lg:mt-0 lg:w-[320px]">
        <ReminderCard store={reminders} clanId={clanId} />
        <h2 className="text-lg font-semibold">
          Sắp tới <span className="text-sm font-normal text-ink-muted">30 ngày</span>
        </h2>
        <EventList events={upcoming} today={today} treeNames={treeNames} onOpen={onOpenPerson} empty="30 ngày tới không có giỗ hay sinh nhật." />
      </aside>
    </div>
  )

  return (
    <>
      {!hideBack && (
        <TopBar>
          <IconButton icon={ArrowLeft} label="Về trang dòng họ" onClick={onBack} />
          <span className="flex-1" />
          <AccountMenu email={email} />
        </TopBar>
      )}
      <main className="mx-auto w-full max-w-6xl space-y-4 py-6 md:py-8" style={pagePad}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-semibold leading-tight tracking-[-0.015em] md:text-[28px]">
              <CalendarHeart aria-hidden size={24} className="text-accent" />
              Ngày giỗ
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {clan?.name} · {trees.length} cuốn
            </p>
          </div>
          <div className="flex w-full items-center gap-1 md:w-auto">
            <Button
              className="mr-auto px-3 md:mr-0"
              onClick={() => {
                setView({ year: today.year, month: today.month })
                setSelected(today)
              }}
            >
              Hôm nay
            </Button>
            <IconButton icon={ChevronLeft} label="Tháng trước" onClick={() => shift(-1)} disabled={atStart} />
            <span className="tabular min-w-0 flex-1 text-center text-[15px] font-semibold whitespace-nowrap md:text-base" aria-live="polite">
              Tháng {view.month}, {view.year}
            </span>
            <IconButton icon={ChevronRight} label="Tháng sau" onClick={() => shift(1)} disabled={atEnd} />
          </div>
        </div>
        <p className="text-sm text-ink-muted md:text-right">{lunarSpan(cells)}</p>
        {body}
      </main>
    </>
  )
}
