import { createTree, type Region } from '@kintree/core'
import { ChevronRight, Plus, TreeDeciduous } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { messageFor } from '../lib/messages.ts'
import type { TreeStore, TreeSummary } from '../lib/store.ts'
import { Button, Dialog, EmptyState, SelectField, Skeleton, TextField, TopBar, useToast } from '../ui/index.ts'

export const REGION_LABEL: Record<Region, string> = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam' }

/** Danh sách cuốn gia phả trên máy này. */
export function TreeList({ store, onOpen }: { store: TreeStore; onOpen: (id: string) => void }) {
  const [trees, setTrees] = useState<TreeSummary[] | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    void store.list().then(setTrees)
  }, [store])

  const createButton = (
    <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
      Tạo cuốn gia phả
    </Button>
  )

  return (
    <>
      <TopBar>
        <h1 className="flex-1 px-2 text-xl font-semibold text-accent">Kintree</h1>
      </TopBar>
      <main
        className="mx-auto w-full max-w-2xl space-y-4 py-4"
        style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
      >
        {trees === null ? (
          <Skeleton lines={3} />
        ) : trees.length === 0 ? (
          <EmptyState
            icon={TreeDeciduous}
            title="Chưa có cuốn gia phả nào"
            text="Mỗi chi hoặc nhánh của dòng họ là một cuốn. Bắt đầu bằng cuốn của chi nhà mình."
            action={createButton}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Các cuốn gia phả</h2>
              {createButton}
            </div>
            <ul className="space-y-2">
              {trees.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(t.id)}
                    className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md border border-line-strong bg-surface px-4 py-3 text-left transition-colors duration-100 hover:bg-surface-muted"
                  >
                    <TreeDeciduous aria-hidden size={24} strokeWidth={1.75} className="shrink-0 text-accent" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{t.name}</span>
                      <span className="block text-sm text-ink-muted">{REGION_LABEL[t.region]}</span>
                    </span>
                    <ChevronRight aria-hidden size={20} className="shrink-0 text-ink-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      {creating && <CreateTreeDialog store={store} onClose={() => setCreating(false)} onCreated={onOpen} />}
    </>
  )
}

function CreateTreeDialog({ store, onClose, onCreated }: { store: TreeStore; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [region, setRegion] = useState<Region>('north')
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const r = createTree({ name, region }, () => crypto.randomUUID())
    if (!r.ok) {
      setError(messageFor(r.error))
      nameRef.current?.focus()
      return
    }
    const saved = await store.save(r.doc)
    if (!saved.ok) return setError(messageFor(saved.error))
    toast(`Đã tạo cuốn ${r.doc.meta.name}`)
    onCreated(r.doc.meta.id)
  }

  return (
    <Dialog
      title="Tạo cuốn gia phả"
      onClose={onClose}
      dirty={name.trim() !== ''}
      footer={
        <>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="submit" form="create-tree" variant="primary">
            Tạo cuốn
          </Button>
        </>
      }
    >
      <form id="create-tree" onSubmit={submit} className="space-y-4" noValidate>
        <TextField ref={nameRef} label="Tên cuốn" hint="Ví dụ: Chi trưởng họ Nguyễn" value={name} onChange={(e) => setName(e.target.value)} error={error} autoFocus />
        <SelectField label="Vùng miền (quyết định cách xưng hô)" value={region} onChange={(e) => setRegion(e.target.value as Region)}>
          {Object.entries(REGION_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </SelectField>
      </form>
    </Dialog>
  )
}
