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
  type TreePerson,
} from '@kintree/core'
import { ArrowLeft, Download, List, MoreVertical, Network, Search, UserRound, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { bloodParentOf, buildActions } from '../lib/actions.ts'
import { messageFor } from '../lib/messages.ts'
import { downloadBackup, downloadRaw, type TreeStore } from '../lib/store.ts'
import { useTreeDoc } from '../state/useTreeDoc.ts'
import {
  Button,
  Dialog,
  EmptyState,
  ErrorText,
  IconButton,
  OverflowMenu,
  Segmented,
  SelectField,
  Sheet,
  Skeleton,
  TextField,
  TopBar,
  useToast,
  useViewportSegments,
  useWindowClass,
} from '../ui/index.ts'
import { AddChildDialog, AddParentDialog, AddSpouseDialog, ProfileDialog, RemoveDialog, ReorderDialog, type EditFn } from './ActionDialogs.tsx'
import { PersonDetails, PersonSidePane, type PanelAction } from './PersonPanel.tsx'
import { PersonList } from './PersonList.tsx'
import { CARD, TreeDiagram, type NodeAction } from './TreeDiagram.tsx'

type DialogKind = 'addChild' | 'addSpouse' | 'addParent' | 'profile' | 'remove' | 'removeBranch' | 'reorderChildren' | 'reorderSpouses' | 'reorderSiblings'
type DialogState = { kind: DialogKind; personId: string } | { kind: 'addRoot' } | null

export function TreeScreen({ store, treeId, onBack }: { store: TreeStore; treeId: string; onBack: () => void }) {
  const { state, edit, saveError } = useTreeDoc(store, treeId)

  const back = <IconButton icon={ArrowLeft} label="Về danh sách cuốn" onClick={onBack} />
  if (state.status === 'loading') {
    return (
      <>
        <TopBar>{back}</TopBar>
        <Skeleton lines={4} />
      </>
    )
  }
  if (state.status === 'error') {
    return (
      <>
        <TopBar>{back}</TopBar>
        <div className="mx-auto max-w-2xl space-y-3 p-4">
          <ErrorText>{messageFor(state.error)}</ErrorText>
          <div className="flex flex-wrap gap-2">
            {state.error === 'CORRUPT' && (
              <Button icon={Download} onClick={() => downloadRaw(treeId)}>
                Tải bản sao dữ liệu lỗi
              </Button>
            )}
            <Button onClick={onBack}>Quay lại</Button>
          </div>
        </div>
      </>
    )
  }
  return <Loaded doc={state.doc} edit={edit} saveError={saveError} onBack={onBack} />
}

function Loaded({ doc, edit, saveError, onBack }: { doc: TreeDoc; edit: EditFn; saveError: string | null; onBack: () => void }) {
  const view = useMemo(() => activeView(doc), [doc])
  const windowClass = useWindowClass()
  const segments = useViewportSegments()
  const compact = windowClass === 'compact'
  const [mode, setMode] = useState<'tree' | 'list'>('tree')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [focusId, setFocusId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const layout = useMemo(() => computeLayout(doc, { collapsed, focusId, cardWidth: CARD.width, cardHeight: CARD.height }), [doc, collapsed, focusId])
  const actions = useMemo(() => buildActions(doc), [doc])
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

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  /** Chọn một người, mở các nhánh đang che họ, và đưa sơ đồ tới đó. */
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
      setDialog({ kind: action === 'remove' ? 'remove' : action, personId: id })
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

  const pickResult = (id: string) => {
    goTo(id)
    setQuery('')
    setSearchOpen(false)
  }

  const detailsProps = selected ? { doc, person: selected, actions: actions(selected), collapsed: collapsed.has(selected.id), onAction: onPanelAction } : null
  const paneWidth = windowClass === 'expanded' ? 360 : 320

  return (
    <div className="flex h-dvh flex-col">
      <TopBar>
        <IconButton icon={ArrowLeft} label="Về danh sách cuốn" onClick={onBack} />
        <h1 className="min-w-0 flex-1 truncate px-1 text-lg font-semibold">{doc.meta.name}</h1>
        {!empty && (compact ? <IconButton icon={Search} label="Tìm người" onClick={() => setSearchOpen(true)} /> : <SearchBox doc={doc} query={query} setQuery={setQuery} onPick={pickResult} />)}
        {!empty &&
          (compact ? (
            // Cỡ gọn: một nút đổi qua lại để nhường chỗ cho tên cuốn.
            <IconButton icon={mode === 'tree' ? List : Network} label={mode === 'tree' ? 'Xem dạng danh sách' : 'Xem dạng cây'} onClick={() => setMode(mode === 'tree' ? 'list' : 'tree')} />
          ) : (
            <Segmented
              label="Chế độ xem"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'tree', label: 'Cây', icon: Network },
                { value: 'list', label: 'Danh sách', icon: List },
              ]}
            />
          ))}
        <OverflowMenu trigger={(p) => <IconButton icon={MoreVertical} label="Thêm" {...p} />} items={[{ label: 'Tải bản sao', icon: Download, onSelect: () => downloadBackup(doc) }]} />
      </TopBar>

      {compact && searchOpen && (
        <div className="absolute inset-x-0 top-0 z-[40] border-b border-line bg-surface p-2 shadow-sheet" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <SearchBox doc={doc} query={query} setQuery={setQuery} onPick={pickResult} autoFocus onEscape={() => setSearchOpen(false)} />
            </div>
            <IconButton icon={X} label="Đóng tìm kiếm" onClick={() => setSearchOpen(false)} />
          </div>
        </div>
      )}

      {saveError && (
        <div className="px-4 py-2">
          <ErrorText>{saveError}</ErrorText>
        </div>
      )}
      {focusPerson && mode === 'tree' && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft px-4 py-1">
          <span className="min-w-0 flex-1">Đang xem riêng nhánh của {focusPerson.fullName}.</span>
          <Button variant="ghost" onClick={() => setFocusId(null)}>
            Xem toàn bộ cây
          </Button>
        </div>
      )}

      {empty ? (
        <EmptyState
          icon={UserRound}
          title="Cuốn này chưa có ai"
          text="Hãy bắt đầu bằng thuỷ tổ: người xa nhất mà dòng họ còn biết tên."
          action={
            <Button variant="primary" onClick={() => setDialog({ kind: 'addRoot' })}>
              Thêm thuỷ tổ
            </Button>
          }
        />
      ) : mode === 'list' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PersonList doc={doc} onOpen={(id) => setDialog({ kind: 'profile', personId: id })} />
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1" data-testid="tree-area">
          <div className="min-w-0 flex-1" data-testid="diagram" style={segments ? { flex: `0 0 ${segments[0]!.width}px` } : undefined}>
            <TreeDiagram
              doc={view}
              layout={layout}
              selectedId={selectedId}
              highlightId={highlightId}
              focusKey={`${doc.meta.id}|${focusId}|${[...collapsed].sort().join(',')}`}
              showMiniMap={windowClass === 'expanded' && !segments}
              compact={compact}
              actionsFor={actions}
              onSelect={setSelectedId}
              onOpenProfile={(id) => setDialog({ kind: 'profile', personId: id })}
              onAction={onNodeAction}
            />
          </div>
          {segments ? (
            <>
              {/* Khe nếp gập: không đặt nội dung. */}
              <div aria-hidden data-testid="hinge" style={{ flex: `0 0 ${Math.max(0, segments[1]!.left - segments[0]!.left - segments[0]!.width)}px` }} />
              {detailsProps ? (
                <PersonSidePane {...detailsProps} width={segments[1]!.width} onClose={() => setSelectedId(null)} />
              ) : (
                <div className="flex shrink-0 items-center justify-center bg-surface p-6 text-center text-ink-muted" style={{ width: segments[1]!.width }}>
                  Chọn một người trên sơ đồ để xem thông tin.
                </div>
              )}
            </>
          ) : (
            detailsProps &&
            (compact ? (
              <Sheet title={`Thông tin ${detailsProps.person.fullName}`} onClose={() => setSelectedId(null)}>
                <PersonDetails {...detailsProps} />
              </Sheet>
            ) : (
              <PersonSidePane {...detailsProps} width={paneWidth} onClose={() => setSelectedId(null)} />
            ))
          )}
        </div>
      )}

      {dialog?.kind === 'addRoot' && <AddRootDialog edit={edit} onClose={closeDialog} />}
      {dialog && dialog.kind !== 'addRoot' && <DialogHost key={`${dialog.kind}:${dialog.personId}`} kind={dialog.kind} personId={dialog.personId} doc={doc} edit={edit} onClose={closeDialog} />}
    </div>
  )
}

function SearchBox({
  doc,
  query,
  setQuery,
  onPick,
  autoFocus,
  onEscape,
}: {
  doc: TreeDoc
  query: string
  setQuery: (q: string) => void
  onPick: (id: string) => void
  autoFocus?: boolean
  onEscape?: () => void
}) {
  const results = query.trim() ? searchPersons(doc, query).slice(0, 8) : []
  return (
    <div className="relative w-full md:w-64">
      <input
        type="search"
        aria-label="Tìm người"
        placeholder="Tìm người (gõ không dấu được)"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onEscape?.()}
        className="min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-ink-muted"
      />
      {results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-[40] mt-1 max-h-72 overflow-y-auto rounded-md border border-line bg-surface shadow-sheet">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" className="min-h-11 w-full cursor-pointer px-3 py-2 text-left hover:bg-surface-muted" onClick={() => onPick(p.id)}>
                {p.fullName}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() !== '' && results.length === 0 && <p className="mt-1 text-sm text-ink-muted">Không tìm thấy ai.</p>}
    </div>
  )
}

function DialogHost({ kind, personId, doc, edit, onClose }: { kind: DialogKind; personId: string; doc: TreeDoc; edit: EditFn; onClose: (newId?: string) => void }) {
  const person = findPerson(doc, personId) as TreePerson | undefined
  if (!person) return null
  const common = { doc, edit, person, onClose }
  switch (kind) {
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

function AddRootDialog({ edit, onClose }: { edit: EditFn; onClose: (newId?: string) => void }) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [error, setError] = useState<{ field: 'name' | 'gender'; text: string } | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const genderRef = useRef<HTMLSelectElement>(null)
  const toast = useToast()

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = edit((d) => addRoot(d, { fullName: name, ...(gender ? { gender } : {}) }, () => crypto.randomUUID()))
    if (!r.ok) {
      const field = r.error === 'MISSING_GENDER' ? 'gender' : 'name'
      setError({ field, text: messageFor(r.error) })
      ;(field === 'gender' ? genderRef : nameRef).current?.focus()
      return
    }
    toast(`Đã thêm ${name.trim()}`)
    onClose(r.id)
  }

  return (
    <Dialog
      title="Thêm thuỷ tổ"
      onClose={() => onClose()}
      dirty={name.trim() !== ''}
      footer={
        <>
          <Button onClick={() => onClose()}>Huỷ</Button>
          <Button type="submit" form="add-root" variant="primary">
            Thêm thuỷ tổ
          </Button>
        </>
      }
    >
      <form id="add-root" onSubmit={submit} className="space-y-4" noValidate>
        <TextField ref={nameRef} label="Họ tên thuỷ tổ" value={name} onChange={(e) => setName(e.target.value)} error={error?.field === 'name' ? error.text : null} autoFocus autoComplete="off" />
        <SelectField ref={genderRef} label="Giới tính" value={gender} onChange={(e) => setGender(e.target.value as Gender | '')} error={error?.field === 'gender' ? error.text : null}>
          <option value="">— Chọn —</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
        </SelectField>
      </form>
    </Dialog>
  )
}
