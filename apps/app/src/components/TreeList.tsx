import { createTree, type Region, type TreeDoc } from '@kintree/core'
import { useEffect, useState } from 'react'
import { messageFor } from '../lib/messages.ts'
import type { TreeStore, TreeSummary } from '../lib/store.ts'
import { Button, ErrorNote, Field, Select, TextInput } from './ui.tsx'

export const REGION_LABEL: Record<Region, string> = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam' }

/** Danh sách cuốn gia phả trên máy này, và biểu mẫu tạo cuốn mới. */
export function TreeList({ store, onOpen }: { store: TreeStore; onOpen: (id: string) => void }) {
  const [trees, setTrees] = useState<TreeSummary[] | null>(null)
  const [name, setName] = useState('')
  const [region, setRegion] = useState<Region>('north')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void store.list().then(setTrees)
  }, [store])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const r = createTree({ name, region }, () => crypto.randomUUID())
    if (!r.ok) return setError(messageFor(r.error))
    const doc: TreeDoc = r.doc
    const saved = await store.save(doc)
    if (!saved.ok) return setError(messageFor(saved.error))
    onOpen(doc.meta.id)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <section aria-labelledby="trees-title" className="space-y-3">
        <h2 id="trees-title" className="text-xl font-semibold">
          Các cuốn gia phả
        </h2>
        {trees === null ? (
          <p>Đang tải…</p>
        ) : trees.length === 0 ? (
          <p className="rounded-md border border-dashed border-line p-4">Chưa có cuốn gia phả nào. Hãy tạo cuốn đầu tiên bên dưới.</p>
        ) : (
          <ul className="space-y-2">
            {trees.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onOpen(t.id)}
                  className="flex min-h-11 w-full items-center justify-between rounded-md border border-line bg-white px-4 py-3 text-left hover:bg-[#f1ead9]"
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="text-sm text-[#6b5d4a]">{REGION_LABEL[t.region]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={create} className="space-y-3 rounded-md border border-line bg-white p-4">
        <h2 className="text-xl font-semibold">Tạo cuốn gia phả mới</h2>
        <Field label="Tên cuốn" hint="Ví dụ: Chi trưởng họ Nguyễn">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Vùng miền (quyết định cách xưng hô)">
          <Select value={region} onChange={(e) => setRegion(e.target.value as Region)}>
            {Object.entries(REGION_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" variant="primary">
          Tạo cuốn gia phả
        </Button>
      </form>
    </div>
  )
}
