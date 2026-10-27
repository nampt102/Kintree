import { filterPersons, PERSON_FILTERS, type PersonFilter, type TreeDoc } from '@kintree/core'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { lifespan } from '../lib/format.ts'
import { Avatar, Segmented, TextField } from '../ui/index.ts'

const FILTER_LABEL: Record<PersonFilter, string> = {
  all: 'Tất cả',
  male: 'Nam',
  female: 'Nữ',
  deceased: 'Đã mất',
  outsider: 'Dâu/Rể',
  married: 'Đã kết hôn',
  unmarried: 'Chưa kết hôn',
}

/** Chế độ danh sách: mọi người của cuốn, có lọc và tìm; chọn một dòng mở hồ sơ. */
export function PersonList({ doc, onOpen }: { doc: TreeDoc; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<PersonFilter>('all')
  const [query, setQuery] = useState('')
  const rows = filterPersons(doc, filter, query)

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-4 py-4"
      style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <TextField label="Tìm theo tên" placeholder="Gõ không dấu cũng được" value={query} onChange={(e) => setQuery(e.target.value)} type="search" />
      <Segmented label="Lọc danh sách" value={filter} onChange={setFilter} wrap options={PERSON_FILTERS.map((f) => ({ value: f, label: FILTER_LABEL[f] }))} />
      <p className="text-sm text-ink-muted" aria-live="polite">
        {rows.length} người
      </p>
      <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-1 ring-1 ring-line/60">
        {rows.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onOpen(p.id)} className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 hover:bg-surface-muted">
              <Avatar name={p.fullName} gender={p.gender} muted={p.death !== undefined} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p.fullName}</span>
                <span className="block text-sm text-ink-muted">
                  {[p.gender === 'male' ? 'Nam' : p.gender === 'female' ? 'Nữ' : '', p.isOutsider ? 'Dâu/Rể' : '', lifespan(p)].filter(Boolean).join(' · ')}
                </span>
              </span>
              <ChevronRight aria-hidden size={18} className="shrink-0 text-connector" />
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-3 text-ink-muted">Không có ai khớp.</li>}
      </ul>
    </div>
  )
}
