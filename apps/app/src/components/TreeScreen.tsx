import {
  activeView,
  addRoot,
  childrenOf,
  computeLayout,
  findPerson,
  reorderSiblings,
  reorderSpouses,
  revealPerson,
  searchPersons,
  spouseIdsOf,
  type Gender,
  type TreeDoc,
} from '@kintree/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { bloodParentOf, buildActions } from '../lib/actions.ts'
import { messageFor } from '../lib/messages.ts'
import { downloadBackup, downloadRaw, type TreeStore } from '../lib/store.ts'
import { useTreeDoc } from '../state/useTreeDoc.ts'
import { AddChildDialog, AddParentDialog, AddSpouseDialog, ProfileDialog, RemoveDialog, ReorderDialog, type EditFn } from './ActionDialogs.tsx'
import { PersonList } from './PersonList.tsx'
import { PersonPanel, type PanelAction } from './PersonPanel.tsx'
import { TreeDiagram, type NodeAction } from './TreeDiagram.tsx'
import { Button, ErrorNote, Field, Select, TextInput } from './ui.tsx'

type DialogState =
  | { kind: 'addChild' | 'addSpouse' | 'addParent' | 'profile' | 'remove' | 'removeBranch' | 'reorderChildren' | 'reorderSpouses' | 'reorderSiblings'; personId: string }
  | null

export function TreeScreen({ store, treeId, onBack }: { store: TreeStore; treeId: string; onBack: () => void }) {
  const { state, edit, saveError } = useTreeDoc(store, treeId)

  if (state.status === 'loading') return <p className="p-4">Đang tải…</p>
  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        <ErrorNote>{messageFor(state.error)}</ErrorNote>
        <div className="flex gap-2">
          {state.error === 'CORRUPT' && <Button onClick={() => downloadRaw(treeId)}>Tải bản sao dữ liệu lỗi</Button>}
          <Button onClick={onBack}>Quay lại</Button>
        </div>
      </div>
    )
  }
  return <Loaded doc={state.doc} edit={edit} saveError={saveError} onBack={onBack} />
}

function Loaded({ doc, edit, saveError, onBack }: { doc: TreeDoc; edit: EditFn; saveError: string | null; onBack: () => void }) {
  const view = useMemo(() => activeView(doc), [doc])
  const [mode, setMode] = useState<'tree' | 'list'>('tree')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [focusId, setFocusId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [query, setQuery] = useState('')

  const layout = useMemo(() => computeLayout(doc, { collapsed, focusId }), [doc, collapsed, focusId])
  const empty = view.persons.length === 0
  const selected = selectedId ? findPerson(doc, selectedId) : undefined
  const focusPerson = focusId ? findPerson(doc, focusId) : undefined

  // Người bị gỡ thì bỏ chọn.
  useEffect(() => {
    if (selectedId && !findPerson(doc, selectedId)) setSelectedId(null)
    if (focusId && !findPerson(doc, focusId)) setFocusId(null)
  }, [doc, selectedId, focusId])

  useEffect(() => {
    if (!highlightId) return
    const t = setTimeout(() => setHighlightId(null), 2500)
    return () => clearTimeout(t)
  }, [highlightId])

  const actions = useMemo(() => buildActions(doc), [doc])

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  /** Chọn một người, mở các nhánh đang che họ, và cuộn tới. */
  const goTo = useCallback(
    (id: string) => {
      const open = revealPerson(doc, collapsed, id)
      setCollapsed(open)
      if (focusId && !computeLayout(doc, { collapsed: open, focusId }).nodes.some((n) => n.id === id)) setFocusId(null)
      setMode('tree')
      setSelectedId(id)
      setHighlightId(id)
    },
    [doc, collapsed, focusId],
  )

  const onNodeAction = useCallback(
    (id: string, action: NodeAction) => {
      if (action === 'toggleCollapse') return toggleCollapse(id)
      setDialog({ kind: action === 'addParent' ? 'addParent' : action === 'addChild' ? 'addChild' : action === 'addSpouse' ? 'addSpouse' : 'remove', personId: id })
    },
    [toggleCollapse],
  )

  function onPanelAction(a: PanelAction) {
    if (!selected) return
    if (a === 'toggleCollapse') return toggleCollapse(selected.id)
    if (a === 'focus') return setFocusId(selected.id)
    setDialog({ kind: a === 'edit' ? 'profile' : a, personId: selected.id })
  }

  const closeDialog = (newId?: string) => {
    setDialog(null)
    if (newId) goTo(newId)
  }

  const results = query.trim() ? searchPersons(doc, query).slice(0, 8) : []
  const dialogPerson = dialog ? findPerson(doc, dialog.personId) : undefined

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-white p-2">
        <Button variant="ghost" onClick={onBack}>
          ← Các cuốn
        </Button>
        <h2 className="mr-auto min-w-0 truncate text-xl font-semibold">{doc.meta.name}</h2>
        <div className="relative w-full sm:w-64">
          <TextInput aria-label="Tìm người" placeholder="Tìm người…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {results.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-line bg-white shadow-lg">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="min-h-11 w-full px-3 py-2 text-left hover:bg-[#f1ead9]"
                    onClick={() => {
                      goTo(p.id)
                      setQuery('')
                    }}
                  >
                    {p.fullName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div role="group" aria-label="Chế độ xem" className="flex gap-1">
          <Button variant={mode === 'tree' ? 'primary' : 'secondary'} aria-pressed={mode === 'tree'} onClick={() => setMode('tree')}>
            Cây
          </Button>
          <Button variant={mode === 'list' ? 'primary' : 'secondary'} aria-pressed={mode === 'list'} onClick={() => setMode('list')}>
            Danh sách
          </Button>
        </div>
        <Button onClick={() => downloadBackup(doc)}>Tải bản sao</Button>
      </header>

      {saveError && <ErrorNote>{saveError}</ErrorNote>}
      {focusPerson && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-[#f1ead9] px-3 py-2">
          <span>Đang xem riêng nhánh của {focusPerson.fullName}.</span>
          <Button onClick={() => setFocusId(null)}>Xem toàn bộ cây</Button>
        </div>
      )}

      {empty ? (
        <div className="p-4">
          <AddRootForm edit={edit} />
        </div>
      ) : mode === 'list' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PersonList doc={doc} onOpen={(id) => setDialog({ kind: 'profile', personId: id })} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1" data-testid="diagram">
            <TreeDiagram
              doc={view}
              layout={layout}
              selectedId={selectedId}
              highlightId={highlightId}
              focusKey={`${doc.meta.id}|${focusId}|${[...collapsed].sort().join(',')}`}
              actionsFor={actions}
              onSelect={setSelectedId}
              onOpenProfile={(id) => setDialog({ kind: 'profile', personId: id })}
              onAction={onNodeAction}
            />
          </div>
          {selected && (
            <PersonPanel
              doc={doc}
              person={selected}
              actions={actions(selected)}
              collapsed={collapsed.has(selected.id)}
              onAction={onPanelAction}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      )}

      {dialog && dialogPerson && <DialogHost key={`${dialog.kind}:${dialog.personId}`} dialog={dialog} doc={doc} edit={edit} person={dialogPerson} onClose={closeDialog} />}
    </div>
  )
}

function DialogHost({ dialog, doc, edit, person, onClose }: { dialog: NonNullable<DialogState>; doc: TreeDoc; edit: EditFn; person: NonNullable<ReturnType<typeof findPerson>>; onClose: (newId?: string) => void }) {
  const common = { doc, edit, person, onClose }
  switch (dialog.kind) {
    case 'addChild':
      return <AddChildDialog {...common} />
    case 'addSpouse':
      return <AddSpouseDialog {...common} />
    case 'addParent':
      return <AddParentDialog {...common} />
    case 'profile':
      return <ProfileDialog {...common} />
    case 'remove':
      return <RemoveDialog {...common} branch={false} />
    case 'removeBranch':
      return <RemoveDialog {...common} branch />
    case 'reorderChildren': {
      const items = childrenOf(doc, person.id).map((c) => ({ id: c.id, label: c.fullName }))
      return <ReorderDialog title={`Thứ tự các con của ${person.fullName}`} items={items} save={(ids) => edit((d) => reorderSiblings(d, person.id, ids))} onClose={() => onClose()} />
    }
    case 'reorderSiblings': {
      const parent = bloodParentOf(doc, person)!
      const items = childrenOf(doc, parent.id).map((c) => ({ id: c.id, label: c.fullName }))
      return <ReorderDialog title={`Thứ tự các con của ${parent.fullName}`} items={items} save={(ids) => edit((d) => reorderSiblings(d, parent.id, ids))} onClose={() => onClose()} />
    }
    case 'reorderSpouses': {
      const items = spouseIdsOf(doc, person.id).map((id) => ({ id, label: findPerson(doc, id)!.fullName }))
      return <ReorderDialog title={`Thứ tự vợ/chồng của ${person.fullName}`} items={items} save={(ids) => edit((d) => reorderSpouses(d, person.id, ids))} onClose={() => onClose()} />
    }
  }
}

function AddRootForm({ edit }: { edit: EditFn }) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const r = edit((d) => addRoot(d, { fullName: name, ...(gender ? { gender } : {}) }, () => crypto.randomUUID()))
    setError(r.ok ? null : messageFor(r.error))
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 rounded-md border border-line bg-white p-4">
      <h3 className="text-lg font-semibold">Cuốn này chưa có ai</h3>
      <p>Hãy bắt đầu bằng thuỷ tổ: người xa nhất mà dòng họ còn biết tên.</p>
      <Field label="Họ tên thuỷ tổ">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Giới tính">
        <Select value={gender} onChange={(e) => setGender(e.target.value as Gender | '')}>
          <option value="">— Chọn —</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
        </Select>
      </Field>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" variant="primary">
        Thêm thuỷ tổ
      </Button>
    </form>
  )
}
