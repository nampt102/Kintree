import { filterPersons, PERSON_FILTERS, type PersonFilter, type TreeDoc } from '@kintree/core'
import { useState } from 'react'
import { lifespan } from '../lib/format.ts'
import { TextInput } from './ui.tsx'

const FILTER_LABEL: Record<PersonFilter, string> = {
  all: 'Tất cả',
  male: 'Nam',
  female: 'Nữ',
  deceased: 'Đã mất',
  outsider: 'Dâu/Rể',
  married: 'Đã kết hôn',
  unmarried: 'Chưa kết hôn',
}

/** Chế độ danh sách: mọi người của cuốn thành bảng, có lọc và tìm; chọn một dòng mở hồ sơ. */
export function PersonList({ doc, onOpen }: { doc: TreeDoc; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<PersonFilter>('all')
  const [query, setQuery] = useState('')
  const rows = filterPersons(doc, filter, query)

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4">
      <TextInput aria-label="Tìm theo tên" placeholder="Tìm theo tên (gõ không dấu cũng được)" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc danh sách">
        {PERSON_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-11 rounded-full border px-4 text-base ${filter === f ? 'border-seal bg-seal text-white' : 'border-line bg-white hover:bg-[#f1ead9]'}`}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>
      <p className="text-sm text-[#6b5d4a]">{rows.length} người</p>
      <ul className="divide-y divide-line rounded-md border border-line bg-white">
        {rows.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onOpen(p.id)} className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left hover:bg-[#f1ead9]">
              <span className="mr-auto font-medium">{p.fullName}</span>
              <span className="text-sm text-[#6b5d4a]">
                {[p.gender === 'male' ? 'Nam' : p.gender === 'female' ? 'Nữ' : '', p.isOutsider ? 'Dâu/Rể' : '', lifespan(p)].filter(Boolean).join(' · ')}
              </span>
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-3 text-[#6b5d4a]">Không có ai khớp.</li>}
      </ul>
    </div>
  )
}
