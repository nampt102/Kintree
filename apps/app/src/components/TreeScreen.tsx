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
import { ArrowLeft, Download, List, MoreHorizontal, Network, Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { bloodParentOf, buildActions } from '../lib/actions.ts'
import { messageFor } from '../lib/messages.ts'
import type { CloudStore, Role } from '../lib/cloudStore.ts'
import { downloadBackup } from '../lib/store.ts'
import { useTreeDoc } from '../state/useTreeDoc.ts'
import {
  Button,
  Dialog,
  EmptyState,
  ErrorText,
  IconButton,
  OverflowMenu,
  Segmented,
  ChoiceField,
  Sheet,
  Skeleton,
  TextField,
  TopBar,
  Avatar,
  useToast,
  useViewportSegments,
  useWindowClass,
} from '../ui/index.ts'
import { AddChildDialog, AddParentDialog, AddSpouseDialog, ProfileDialog, RemoveDialog, ReorderDialog, type EditFn } from './ActionDialogs.tsx'
import { PersonDetails, PersonPeek, PersonSidePane, type PanelAction } from './PersonPanel.tsx'
import { PersonList } from './PersonList.tsx'
import { DeleteTreeDialog, EditTreeInfoDialog } from './TreeManage.tsx'
import { CARD, TreeDiagram, type NodeAction } from './TreeDiagram.tsx'

type DialogKind = 'addChild' | 'addSpouse' | 'addParent' | 'profile' | 'remove' | 'removeBranch' | 'reorderChildren' | 'reorderSpouses' | 'reorderSiblings'
type DialogState = { kind: DialogKind; personId: string } | { kind: 'addRoot' } | { kind: 'editTree' } | { kind: 'deleteTree' } | null

export function TreeScreen({ cloud, treeId, onBack, hideBack = false }: { cloud: CloudStore; treeId: string; onBack: () => void; hideBack?: boolean }) {
  const { state, edit, saveError, reload } = useTreeDoc(cloud, treeId)

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
            {state.error !== 'TREE_NOT_FOUND' && <Button onClick={reload}>Thử lại</Button>}
            <Button onClick={onBack}>Quay lại</Button>
          </div>
        </div>
      </>
    )
  }
  return <Loaded doc={state.doc} role={state.role} cloud={cloud} edit={edit} saveError={saveError} onBack={onBack} reload={reload} hideBack={hideBack} />
}

/** Người xem: chỉ giữ thao tác không ghi (thu gọn nhánh, xem riêng nhánh); quyền thật do RLS cưỡng chế. */
const READ_ONLY_FLAGS = { canAddChild: false, canAddSpouse: false, canAddParent: false, canRemove: false, canRemoveBranch: false, canReorderChildren: false, canReorderSpouses: false, canReorderSiblings: false }

function Loaded({ doc, role, cloud, edit, saveError, onBack, reload, hideBack }: { doc: TreeDoc; role: Role; cloud: CloudStore; edit: EditFn; saveError: string | null; onBack: () => void; reload: () => void; hideBack: boolean }) {
  const readOnly = role !== 'admin'
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
  const [query, setQuery] = useState('')

  const layout = useMemo(() => computeLayout(doc, { collapsed, focusId, cardWidth: CARD.width, cardHeight: CARD.height }), [doc, collapsed, focusId])
  const actions = useMemo(() => {
    const build = buildActions(doc)
    return readOnly ? (p: TreePerson) => ({ ...build(p), ...READ_ONLY_FLAGS }) : build
  }, [doc, readOnly])
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
  }

  const detailsProps = selected ? { doc, person: selected, actions: actions(selected), collapsed: collapsed.has(selected.id), readOnly, onAction: onPanelAction } : null
  const paneWidth = windowClass === 'expanded' ? 384 : 340

  const paneOpen = !!detailsProps && !compact && !segments && mode === 'tree'
  const edge = 'max(12px, env(safe-area-inset-left))'
  const edgeR = 'max(12px, env(safe-area-inset-right))'
  const regionLabel = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam' }[doc.meta.region]
  const banner = saveError ? (
    <div className="kt-glass flex items-center gap-2 rounded-2xl px-4 py-2">
      <ErrorText>{saveError}</ErrorText>
    </div>
  ) : focusPerson && mode === 'tree' ? (
    <div className="kt-glass flex flex-wrap items-center gap-3 rounded-full py-1.5 pl-5 pr-1.5">
      <span className="min-w-0 flex-1 text-sm">Đang xem riêng nhánh của {focusPerson.fullName}.</span>
      <Button icon={Network} onClick={() => setFocusId(null)}>
        Xem toàn bộ cây
      </Button>
    </div>
  ) : null

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-canvas">
      {/* Thanh nổi trên (design D4): một hàng, nền kính, không chiếm chỗ của sơ đồ. */}
      <header
        className="kt-glass absolute z-[10] flex h-14 items-center gap-1 rounded-full px-1.5"
        style={{ top: 'max(12px, env(safe-area-inset-top))', left: edge, right: paneOpen ? `${paneWidth}px` : edgeR }}
      >
        {!hideBack && <IconButton icon={ArrowLeft} label="Về danh sách cuốn" onClick={onBack} />}
        <div className={compact ? 'sr-only' : `min-w-28 flex-1 ${hideBack ? 'pl-4' : 'pl-1'} pr-2`}>
          <h1 className="truncate text-[15px] font-semibold leading-tight">{doc.meta.name}</h1>
          <p className="truncate text-xs text-ink-muted">
            {view.persons.length} người · {regionLabel}
          </p>
        </div>
        {!empty && compact && (
          <div className="min-w-0 flex-1">
            <SearchBox doc={doc} query={query} setQuery={setQuery} onPick={pickResult} placeholder={`Tìm trong ${doc.meta.name}`} />
          </div>
        )}
        {!empty && !compact && (
            <>
              <Segmented
                label="Chế độ xem"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'tree', label: 'Cây', icon: Network },
                  { value: 'list', label: 'Danh sách', icon: List },
                ]}
              />
              <div className={`shrink-0 ${paneOpen ? 'w-40' : 'w-56 lg:w-64'}`}>
                <SearchBox doc={doc} query={query} setQuery={setQuery} onPick={pickResult} placeholder="Tìm người" />
              </div>
            </>
        )}
        {compact && empty && <span className="flex-1" />}
        <OverflowMenu
          trigger={(p) => <IconButton icon={MoreHorizontal} label="Thêm" {...p} />}
          items={[
            { label: 'Tải bản sao', icon: Download, onSelect: () => downloadBackup(doc) },
            ...(readOnly
              ? []
              : [
                  { label: 'Sửa thông tin cuốn', icon: Pencil, onSelect: () => setDialog({ kind: 'editTree' }) },
                  { label: 'Xoá cuốn', icon: Trash2, danger: true, onSelect: () => setDialog({ kind: 'deleteTree' }) },
                ]),
          ]}
        />
      </header>

      {/* Cỡ gọn: nút đổi chế độ xem nổi ở góc dưới phải (thanh trên chỉ còn quay lại, tìm, menu). */}
      {compact && !empty && (
        <div className="absolute z-[10]" style={{ right: edgeR, bottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <IconButton icon={mode === 'tree' ? List : Network} label={mode === 'tree' ? 'Xem dạng danh sách' : 'Xem dạng cây'} variant="raised" onClick={() => setMode(mode === 'tree' ? 'list' : 'tree')} />
        </div>
      )}

      {banner && (
        <div className="absolute z-[9] flex justify-center" style={{ top: 'calc(max(12px, env(safe-area-inset-top)) + 3.5rem + 12px)', left: edge, right: paneOpen ? `${paneWidth}px` : edgeR }}>
          {banner}
        </div>
      )}

      {empty ? (
        <div className="flex flex-1 items-center justify-center pt-20">
          <EmptyState
            icon={UserRound}
            title="Cuốn này chưa có ai"
            text={readOnly ? 'Người quản trị chưa thêm ai vào cuốn này.' : 'Hãy bắt đầu bằng thuỷ tổ: người xa nhất mà dòng họ còn biết tên.'}
            action={
              readOnly ? undefined : (
                <Button variant="primary" icon={Plus} onClick={() => setDialog({ kind: 'addRoot' })}>
                  Thêm thuỷ tổ
                </Button>
              )
            }
          />
        </div>
      ) : mode === 'list' ? (
        <div className="min-h-0 flex-1 overflow-y-auto pt-[calc(max(12px,env(safe-area-inset-top))+72px)]">
          <PersonList doc={doc} onOpen={(id) => (readOnly ? goTo(id) : setDialog({ kind: 'profile', personId: id }))} />
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
              topInset={72}
              actionsFor={actions}
              onSelect={setSelectedId}
              onOpenProfile={(id) => (readOnly ? setSelectedId(id) : setDialog({ kind: 'profile', personId: id }))}
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
                <div className="flex shrink-0 items-center justify-center p-6 text-center text-ink-muted" style={{ width: segments[1]!.width }}>
                  Chọn một người trên sơ đồ để xem thông tin.
                </div>
              )}
            </>
          ) : (
            detailsProps &&
            (compact ? (
              <Sheet title={`Thông tin ${detailsProps.person.fullName}`} onClose={() => setSelectedId(null)} peek={<PersonPeek {...detailsProps} />}>
                <PersonDetails {...detailsProps} />
              </Sheet>
            ) : (
              <PersonSidePane {...detailsProps} width={paneWidth} onClose={() => setSelectedId(null)} />
            ))
          )}
        </div>
      )}

      {dialog?.kind === 'addRoot' && <AddRootDialog edit={edit} onClose={closeDialog} />}
      {dialog?.kind === 'editTree' && (
        <EditTreeInfoDialog
          cloud={cloud}
          tree={{ id: doc.meta.id, name: doc.meta.name, region: doc.meta.region, description: doc.meta.description }}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null)
            reload()
          }}
        />
      )}
      {dialog?.kind === 'deleteTree' && <DeleteTreeDialog cloud={cloud} tree={{ id: doc.meta.id, name: doc.meta.name }} onClose={() => setDialog(null)} onDeleted={onBack} />}
      {dialog && dialog.kind !== 'addRoot' && dialog.kind !== 'editTree' && dialog.kind !== 'deleteTree' && <DialogHost key={`${dialog.kind}:${dialog.personId}`} kind={dialog.kind} personId={dialog.personId} doc={doc} edit={edit} onClose={closeDialog} />}
    </div>
  )
}

function SearchBox({
  doc,
  query,
  setQuery,
  onPick,
  placeholder,
}: {
  doc: TreeDoc
  query: string
  setQuery: (q: string) => void
  onPick: (id: string) => void
  placeholder: string
}) {
  const results = query.trim() ? searchPersons(doc, query).slice(0, 8) : []
  return (
    <div className="relative w-full">
      <Search aria-hidden size={17} strokeWidth={2} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        aria-label="Tìm người"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
        className="min-h-11 w-full min-w-0 rounded-full bg-surface-muted pl-10 pr-4 text-[15px] text-ink placeholder:text-ink-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      {results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-[40] mt-2 max-h-72 min-w-56 overflow-y-auto rounded-xl bg-surface py-1.5 shadow-3 ring-1 ring-line/60">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 px-3 py-1.5 text-left text-[15px] hover:bg-surface-muted" onClick={() => onPick(p.id)}>
                <Avatar name={p.fullName} gender={p.gender} muted={p.death !== undefined} size={28} />
                <span className="min-w-0 truncate">{p.fullName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() !== '' && results.length === 0 && (
        <p className="absolute left-0 top-full z-[40] mt-2 rounded-xl bg-surface px-4 py-2.5 text-sm text-ink-muted shadow-3">Không tìm thấy ai.</p>
      )}
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
  const genderRef = useRef<HTMLDivElement>(null)
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
        <ChoiceField
          ref={genderRef}
          label="Giới tính"
          value={gender}
          onChange={(v) => setGender(v as Gender | '')}
          error={error?.field === 'gender' ? error.text : null}
          options={[
            { value: 'male', label: 'Nam' },
            { value: 'female', label: 'Nữ' },
          ]}
        />
      </form>
    </Dialog>
  )
}
