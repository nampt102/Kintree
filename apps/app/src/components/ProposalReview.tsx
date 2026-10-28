import { findPerson, findSimilarPersons, spouseIdsOf, type EditError, type Gender, type PartialDate, type Result, type TreeDoc } from '@kintree/core'
import { ArrowLeft, Check, CornerDownRight, GitMerge, Link2, Minus, Pencil, Plus, UserPlus, Users, X, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { diffDocs } from '../lib/cloudStore.ts'
import { formatPartialDate } from '../lib/format.ts'
import { messageFor, type AppError } from '../lib/messages.ts'
import { planAccept, planMerge, rejectFields, relationsFor, type Attach, type Edits, type Plan, type Proposal } from '../lib/proposals.ts'
import { IMAGE_KIND_LABEL, type Source, type SourceStore } from '../lib/sourceStore.ts'
import { Badge, Button, ChoiceField, Dialog, IconButton, SelectField, TextAreaField, TextField, useToast, useWindowClass } from '../ui/index.ts'
import type { EditFn } from './ActionDialogs.tsx'
import { DateInput } from './DateInput.tsx'
import { AnchoredImage, FIELD_LABEL, formatFieldValue, useImageUrl } from './Sources.tsx'

// Hàng chờ duyệt cạnh ảnh nguồn (change ai-image-proposals, bản mẫu `mockup.html` mục C, D, E).
// Máy tính: ảnh bên trái, đề xuất bên phải. Điện thoại: danh sách → chi tiết toàn màn.

type PlanOk = Extract<Plan, { ok: true }>
const GENDER_TEXT: Record<string, string> = { male: 'Nam', female: 'Nữ', unknown: 'Chưa rõ giới tính' }

export function ProposalReview({
  doc,
  store,
  sources,
  pending,
  initialSourceId,
  edit,
  onChanged,
  onClose,
}: {
  doc: TreeDoc
  store: SourceStore
  sources: Source[]
  pending: Proposal[]
  initialSourceId: string | null
  edit: EditFn
  /** Tải lại hàng chờ và tư liệu (sau mỗi lần duyệt, kể cả khi lỗi). */
  onChanged: () => void
  onClose: () => void
}) {
  const compact = useWindowClass() === 'compact'
  const toast = useToast()
  const withPending = sources.filter((s) => pending.some((p) => p.source_id === s.id))
  const [sourceId, setSourceId] = useState<string | null>(initialSourceId ?? withPending[0]?.id ?? null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const [editing, setEditing] = useState<Proposal | null>(null)
  const [rejecting, setRejecting] = useState<Proposal | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Hàng chờ vừa tải lại: bỏ danh sách ẩn tạm (đề xuất đã duyệt thì không còn trong `pending`; duyệt lỗi thì hiện lại).
  useEffect(() => setHidden(new Set()), [pending])
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !editing && !rejecting && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, editing, rejecting])

  // Tư liệu hiện tại hết đề xuất thì sang tư liệu kế còn đề xuất.
  const source = sources.find((s) => s.id === sourceId) ?? null
  const list = useMemo(() => pending.filter((p) => p.source_id === sourceId && !hidden.has(p.id)), [pending, sourceId, hidden])
  useEffect(() => {
    if (list.length === 0 && withPending.length > 0 && !withPending.some((s) => s.id === sourceId)) setSourceId(withPending[0]!.id)
  }, [list.length, withPending, sourceId])
  const selected = list.find((p) => p.id === selectedId) ?? (compact ? null : (list[0] ?? null))
  const detail = compact ? (list.find((p) => p.id === openId) ?? null) : selected
  const url = useImageUrl(store, source)

  const probeId = () => crypto.randomUUID()
  const plans = useMemo(() => new Map(list.map((p) => [p.id, planAccept(doc, p, pending, probeId)])), [doc, list, pending])

  const nameOf = (id: string) => findPerson(doc, id)?.fullName ?? 'người đã gỡ'
  const refName = (r: unknown) => {
    const x = (r ?? {}) as { personId?: string; ref?: string }
    if (x.personId) return nameOf(x.personId)
    const pp = pending.find((q) => q.op === 'add_person' && q.ref === x.ref)
    return pp ? String(pp.payload.fullName) : 'người mới'
  }

  function describe(p: Proposal): { title: string; sub: string } {
    if (p.op === 'add_person') {
      const bits = [GENDER_TEXT[String(p.payload.gender)] ?? '', p.payload.birth ? `sinh ${(p.payload.birth as PartialDate).year}` : '', p.payload.death ? `mất ${formatPartialDate(p.payload.death as PartialDate)}` : ''].filter(Boolean)
      return { title: `Thêm người: ${String(p.payload.fullName)}`, sub: bits.join(' · ') }
    }
    if (p.op === 'update_field') {
      const field = String(p.payload.field)
      const person = findPerson(doc, String(p.payload.personId))
      const old = person ? (person as unknown as Record<string, unknown>)[field] : undefined
      return { title: `Sửa ${(FIELD_LABEL[field] ?? field).toLowerCase()} của ${nameOf(String(p.payload.personId))}`, sub: `${formatFieldValue(field, old)} → ${formatFieldValue(field, p.payload.value)}` }
    }
    const from = refName(p.payload.from)
    const to = refName(p.payload.to)
    return { title: p.payload.type === 'spouse' ? `Quan hệ: ${from} là chồng của ${to}` : `Quan hệ: ${to} là con của ${from}`, sub: '' }
  }

  const reason = (p: Proposal): string | null => {
    const plan = plans.get(p.id)
    if (!plan || plan.ok) return null
    if (plan.error === 'NEEDS_PERSON') return `Cần nhận người ${refName({ ref: plan.pendingRef })} trước`
    return messageFor(plan.error as AppError)
  }

  /** Nhận (có thể kèm sửa) hoặc gộp: sửa cây tức thì trên màn hình, ghi lên máy chủ qua hàng đợi bằng review_proposal. */
  function accept(p: Proposal, how: { edits?: Edits; mergeInto?: string }) {
    let captured: PlanOk | undefined
    const r = edit(
      (d): Result => {
        const plan = how.mergeInto ? planMerge(d, p, how.mergeInto, how.edits) : planAccept(d, p, pending, probeId, how.edits)
        if (!plan.ok) return { ok: false, error: plan.error as EditError }
        captured = plan
        return { ok: true, doc: plan.doc }
      },
      async (prev, next) => {
        const c = captured!
        const res = await store.review({
          proposalId: p.id,
          decision: 'accept',
          edited: !!how.edits,
          resultPerson: c.resultPersonId,
          changes: { ...diffDocs(prev, next), also: c.also },
          fields: c.fields,
          children: c.children,
        })
        onChanged()
        return res
      },
    )
    if (!r.ok) return toast(messageFor(r.error as AppError))
    setHidden((h) => new Set(h).add(p.id))
    for (const id of captured?.also ?? []) setHidden((h) => new Set(h).add(id))
    setOpenId(null)
    setSelectedId(null)
    toast(how.mergeInto ? 'Đã gộp vào người đã có' : 'Đã nhận đề xuất')
  }

  async function reject(p: Proposal, note: string) {
    setHidden((h) => new Set(h).add(p.id))
    setRejecting(null)
    setOpenId(null)
    setSelectedId(null)
    const res = await store.review({ proposalId: p.id, decision: 'reject', note, changes: null, fields: rejectFields(p, note.trim() || null), children: [] })
    if (!res.ok) toast(messageFor(res.error))
    else toast('Đã bỏ đề xuất')
    onChanged()
  }

  const body = (p: Proposal) => (
    <ProposalBody
      key={p.id}
      p={p}
      doc={doc}
      all={pending}
      describe={describe(p)}
      reason={reason(p)}
      onAccept={() => accept(p, {})}
      onEdit={() => setEditing(p)}
      onReject={() => setRejecting(p)}
      onMerge={(id) => accept(p, { mergeInto: id })}
      nameOf={nameOf}
    />
  )

  const header = (
    <div className="flex items-center gap-3 px-4 py-3">
      <IconButton ref={closeRef} icon={ArrowLeft} label="Đóng hàng chờ duyệt" variant="secondary" onClick={compact && detail ? () => setOpenId(null) : onClose} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-semibold leading-tight">{compact && detail ? `Đề xuất ${list.indexOf(detail) + 1}/${list.length}` : (source?.title ?? (source ? IMAGE_KIND_LABEL[source.imageKind] : 'Duyệt đề xuất'))}</h2>
        {!compact && <p className="text-sm text-ink-muted">{source ? `${IMAGE_KIND_LABEL[source.imageKind]} · ${list.length} đề xuất chờ` : ''}</p>}
      </div>
      {withPending.length > 1 && !compact && (
        <div className="w-56">
          <SelectField label="Tư liệu" value={sourceId ?? ''} onChange={(v) => setSourceId(v)} options={withPending.map((s) => ({ value: s.id, label: s.title || IMAGE_KIND_LABEL[s.imageKind] }))} />
        </div>
      )}
    </div>
  )

  const empty = (
    <div className="grid h-full place-items-center p-6 text-center">
      <div>
        <span aria-hidden className="mx-auto grid size-12 place-items-center rounded-full bg-[#e8f3ec] text-[#1f7a45]">
          <Check size={22} />
        </span>
        <p className="mt-2 font-semibold">Đã duyệt hết</p>
        <p className="text-ink-muted">Không còn đề xuất chờ cho ảnh này.</p>
        <Button className="mt-4" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </div>
  )

  return (
    <div role="dialog" aria-modal="true" aria-label="Duyệt đề xuất" className="fixed inset-0 z-[60] flex flex-col bg-canvas md:flex-row" data-testid="review">
      {compact ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {header}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            {list.length === 0 ? (
              empty
            ) : detail ? (
              <div className="space-y-3">
                <AnchoredImage url={url} anchor={detail.anchor} alt="Ảnh nguồn" maxHeight="38dvh" className="w-full justify-center" />
                {body(detail)}
              </div>
            ) : (
              <ul className="space-y-3">
                {list.map((p) => {
                  const d = describe(p)
                  return (
                    <li key={p.id}>
                      <button type="button" onClick={() => setOpenId(p.id)} className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl bg-surface p-4 text-left shadow-1 ring-1 ring-line/60">
                        <OpIcon op={p.op} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold leading-tight">{d.title}</span>
                          {d.sub && <span className="mt-0.5 block text-sm text-ink-muted">{d.sub}</span>}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 flex-col bg-[#2a2622]">
            <div className="text-white [&_h2]:text-white [&_p]:text-white/60">{header}</div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
              <AnchoredImage url={url} anchor={detail?.anchor ?? null} alt="Ảnh nguồn" maxHeight="calc(100dvh - 9rem)" />
            </div>
          </div>
          <aside aria-label="Đề xuất" className="flex w-[440px] shrink-0 flex-col bg-surface shadow-[-1px_0_0_var(--color-line)]">
            <div className="flex items-center gap-2 px-5 pb-2 pt-5">
              <h2 className="flex-1 text-xl font-semibold">Đề xuất</h2>
              <Badge tone="accent">{list.length} chờ duyệt</Badge>
            </div>
            {list.length === 0 ? (
              empty
            ) : (
              <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-1">
                {list.map((p) => {
                  const d = describe(p)
                  const on = detail?.id === p.id
                  return (
                    <li key={p.id}>
                      {on ? (
                        body(p)
                      ) : (
                        <button type="button" onClick={() => setSelectedId(p.id)} aria-label={`Chọn: ${d.title}`} className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl bg-surface p-4 text-left shadow-1 ring-1 ring-line/60 hover:shadow-2">
                          <OpIcon op={p.op} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold leading-tight">{d.title}</span>
                            {d.sub && <span className="mt-0.5 block text-sm text-ink-muted">{d.sub}</span>}
                          </span>
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>
        </>
      )}
      {editing && (
        <EditAcceptDialog
          doc={doc}
          p={editing}
          all={pending}
          onClose={() => setEditing(null)}
          onSubmit={(edits) => {
            const target = editing
            setEditing(null)
            accept(target, { edits })
          }}
        />
      )}
      {rejecting && <RejectDialog p={rejecting} describe={describe(rejecting).title} onClose={() => setRejecting(null)} onSubmit={(note) => void reject(rejecting, note)} />}
    </div>
  )
}

function OpIcon({ op }: { op: Proposal['op'] }) {
  const Icon = op === 'add_person' ? UserPlus : op === 'add_relation' ? Link2 : Pencil
  return (
    <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full ${op === 'add_person' ? 'bg-male-soft text-male' : 'bg-surface-muted text-ink-muted'}`}>
      <Icon size={16} strokeWidth={2} />
    </span>
  )
}

/** Thẻ đề xuất đang chọn: nội dung, chữ AI đọc, quan hệ đi kèm, gợi ý gộp, lý do không nhận được và ba nút duyệt. */
function ProposalBody({
  p,
  doc,
  all,
  describe,
  reason,
  onAccept,
  onEdit,
  onReject,
  onMerge,
  nameOf,
}: {
  p: Proposal
  doc: TreeDoc
  all: readonly Proposal[]
  describe: { title: string; sub: string }
  reason: string | null
  onAccept: () => void
  onEdit: () => void
  onReject: () => void
  onMerge: (personId: string) => void
  nameOf: (id: string) => string
}) {
  const similar = useMemo(
    () => (p.op === 'add_person' ? findSimilarPersons(doc, { fullName: String(p.payload.fullName), birthYear: (p.payload.birth as PartialDate | undefined)?.year }) : []),
    [doc, p],
  )
  const target = similar[0]
  const rels = p.op === 'add_person' ? relationsFor(doc, p, all) : []
  const mergePreview = useMemo(() => (target ? planMerge(doc, p, target.id) : null), [doc, p, target])
  const blocked = reason !== null
  return (
    <div data-testid="proposal" className="rounded-2xl bg-accent-soft/50 p-4 shadow-[inset_0_0_0_2px_var(--color-accent)]">
      <div className="flex items-start gap-3">
        <OpIcon op={p.op} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{describe.title}</p>
          {describe.sub && <p className="mt-0.5 text-sm text-ink-muted">{describe.sub}</p>}
        </div>
        <Badge>AI</Badge>
      </div>
      {p.quote && (
        <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm">
          <span className="text-ink-muted">AI đọc:</span> "{p.quote}"
        </p>
      )}
      {rels.length > 0 && !target && (
        <p className="mt-2 flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">
          <Link2 aria-hidden size={16} className="mt-0.5 shrink-0 text-ink-muted" />
          <span>
            <b>Kèm quan hệ:</b> {rels.map((r) => (r.payload.type === 'spouse' ? 'vợ/chồng' : r.payload.from && 'personId' in (r.payload.from as object) ? `con của ${nameOf(String((r.payload.from as { personId: string }).personId))}` : 'liên quan tới người đã có')).join('; ')}. Nhận sẽ thêm người và nối vào cây cùng lúc.
          </span>
        </p>
      )}
      {p.op === 'add_relation' && reason?.startsWith('Cần nhận') && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
          <CornerDownRight aria-hidden size={14} />
          Nhận cùng người ở đề xuất thêm người
        </p>
      )}
      {target && mergePreview?.ok && (
        <div data-testid="merge-hint" className="mt-3 space-y-2">
          <p className="flex items-start gap-2 rounded-xl bg-[#fff7e6] p-3 text-sm text-[#7a4b00]">
            <Users aria-hidden size={16} className="mt-0.5 shrink-0" />
            <span>
              <b>Có thể là {target.fullName} đã có trong cuốn.</b> Cùng họ tên{target.birth ? `, năm sinh ${target.birth.year}` : ''}. Gộp thì chỉ thêm các trường còn trống; trường đã có mà khác thì thành đề xuất riêng.
            </span>
          </p>
          <div className="rounded-xl bg-surface-muted p-3 text-sm">
            <p className="font-semibold">Nếu gộp vào {target.fullName}:</p>
            <ul className="mt-1 space-y-1">
              {mergePreview.fields.map((f) => (
                <li key={f.field} className="flex items-center gap-2">
                  <Plus aria-hidden size={14} className="text-[#1f7a45]" />
                  Ghi {(FIELD_LABEL[f.field] ?? f.field).toLowerCase()} "{formatFieldValue(f.field, f.value)}"
                </li>
              ))}
              {mergePreview.children.map((c) => (
                <li key={c.payload.field} className="flex items-center gap-2">
                  <TriangleAlert aria-hidden size={14} className="text-[#7a4b00]" />
                  {FIELD_LABEL[c.payload.field] ?? c.payload.field} khác ({formatFieldValue(c.payload.field, c.payload.value)}): thành đề xuất riêng
                </li>
              ))}
              {mergePreview.fields.length === 0 && mergePreview.children.length === 0 && (
                <li className="flex items-center gap-2">
                  <Minus aria-hidden size={14} className="text-ink-muted" />
                  Mọi trường đã trùng, không có gì để thêm
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
      {reason && (
        <p role="alert" className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-sm ${reason.startsWith('Cần nhận') || reason.includes('gắn được') ? 'bg-[#fff7e6] text-[#7a4b00]' : 'bg-danger-soft text-danger'}`}>
          <TriangleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />
          {reason}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {target ? (
          <>
            <Button variant="primary" icon={GitMerge} onClick={() => onMerge(target.id)}>
              Gộp vào {target.fullName}
            </Button>
            <Button onClick={onAccept} disabled={blocked}>
              Thêm như người mới
            </Button>
          </>
        ) : (
          <Button variant="primary" icon={Check} onClick={onAccept} disabled={blocked}>
            Nhận
          </Button>
        )}
        {p.op !== 'add_relation' && (
          <Button icon={Pencil} onClick={onEdit}>
            Sửa rồi nhận
          </Button>
        )}
        <Button variant="danger" icon={X} onClick={onReject}>
          Bỏ
        </Button>
      </div>
    </div>
  )
}

function RejectDialog({ p, describe, onClose, onSubmit }: { p: Proposal; describe: string; onClose: () => void; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState('')
  return (
    <Dialog
      title="Bỏ đề xuất"
      subtitle={describe}
      onClose={onClose}
      dirty={note.trim() !== ''}
      footer={
        <>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="submit" form={`reject-${p.id}`} variant="primary">
            Bỏ đề xuất
          </Button>
        </>
      }
    >
      <form id={`reject-${p.id}`} onSubmit={(e) => (e.preventDefault(), onSubmit(note))} className="space-y-3" noValidate>
        <TextField label="Lý do (tuỳ chọn)" hint="Ví dụ: đọc nhầm chữ, bia mộ khắc rõ hơn. Lý do hiện cạnh nguồn của trường." value={note} onChange={(e) => setNote(e.target.value)} autoFocus autoComplete="off" />
      </form>
    </Dialog>
  )
}

/** "Sửa rồi nhận": form điền sẵn theo đề xuất; người chưa có chỗ gắn vào cây chọn nơi gắn ở đây. */
function EditAcceptDialog({ doc, p, all, onClose, onSubmit }: { doc: TreeDoc; p: Proposal; all: readonly Proposal[]; onClose: () => void; onSubmit: (edits: Edits) => void }) {
  const initial = p.payload as Record<string, unknown>
  const [fullName, setFullName] = useState(String(initial.fullName ?? ''))
  const [gender, setGender] = useState(String(initial.gender ?? 'unknown'))
  const [birth, setBirth] = useState<PartialDate | null>((initial.birth as PartialDate) ?? null)
  const [death, setDeath] = useState<PartialDate | null>((initial.death as PartialDate) ?? null)
  const [birthPlace, setBirthPlace] = useState(String(initial.birthPlace ?? ''))
  const [burialPlace, setBurialPlace] = useState(String(initial.burialPlace ?? ''))
  const [value, setValue] = useState<unknown>(initial.value)
  const needsAttach = p.op === 'add_person' && relationsFor(doc, p, all).length === 0
  const [attachKind, setAttachKind] = useState<Attach['kind']>('child')
  const [attachTo, setAttachTo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const people = doc.persons.filter((x) => !x.removedAt)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (p.op === 'update_field') return onSubmit({ value })
    let attach: Attach | undefined
    if (needsAttach) {
      if (!attachTo) return setError('Hãy chọn người để gắn vào cây.')
      attach = attachKind === 'child' ? { kind: 'child', parentId: attachTo } : attachKind === 'parent' ? { kind: 'parent', childId: attachTo } : { kind: 'spouse', personId: attachTo }
    }
    onSubmit({
      person: { fullName, gender: gender as Gender, ...(birth ? { birth } : {}), ...(death ? { death } : {}), ...(birthPlace ? { birthPlace } : {}), ...(burialPlace ? { burialPlace } : {}) },
      ...(attach ? { attach } : {}),
    })
  }

  const field = String(initial.field ?? '')
  return (
    <Dialog
      title="Sửa rồi nhận"
      subtitle={p.quote ? `AI đọc: "${p.quote}"` : undefined}
      wide
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="submit" form="edit-accept" variant="primary">
            Lưu và nhận
          </Button>
        </>
      }
    >
      <form id="edit-accept" onSubmit={submit} className="space-y-5" noValidate>
        {p.op === 'update_field' ? (
          field === 'gender' ? (
            <ChoiceField label="Giới tính" value={String(value ?? 'unknown')} onChange={setValue} options={[{ value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }, { value: 'unknown', label: 'Chưa rõ' }]} />
          ) : field === 'birth' || field === 'death' ? (
            <DateInput label={FIELD_LABEL[field] ?? field} value={value as PartialDate | undefined} onChange={(d) => setValue(d)} />
          ) : field === 'biography' ? (
            <TextAreaField label={FIELD_LABEL[field] ?? field} value={String(value ?? '')} onChange={(e) => setValue(e.target.value)} />
          ) : (
            <TextField label={FIELD_LABEL[field] ?? field} value={String(value ?? '')} onChange={(e) => setValue(e.target.value)} autoFocus />
          )
        ) : (
          <>
            <TextField label="Họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
            <ChoiceField label="Giới tính" value={gender} onChange={setGender} options={[{ value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }, { value: 'unknown', label: 'Chưa rõ' }]} />
            <DateInput label="Ngày sinh" value={birth ?? undefined} onChange={setBirth} />
            <DateInput label="Ngày mất (ngày giỗ)" value={death ?? undefined} onChange={setDeath} />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Nơi sinh" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} />
              <TextField label="Nơi an táng" value={burialPlace} onChange={(e) => setBurialPlace(e.target.value)} />
            </div>
            {needsAttach && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.07em] text-ink-muted">Gắn vào cây</h3>
                <ChoiceField
                  label="Người này là"
                  value={attachKind}
                  onChange={(v) => setAttachKind(v as Attach['kind'])}
                  options={[
                    { value: 'child', label: 'Con của' },
                    { value: 'spouse', label: 'Vợ/chồng của' },
                    { value: 'parent', label: 'Cha/mẹ của' },
                  ]}
                />
                <SelectField
                  label="Người trong cây"
                  value={attachTo}
                  onChange={setAttachTo}
                  error={error}
                  placeholder="— Chọn —"
                  options={people.filter((x) => attachKind !== 'spouse' || (!x.isOutsider && x.gender !== 'unknown' && spouseIdsOf(doc, x.id).length === 0)).map((x) => ({ value: x.id, label: x.fullName }))}
                />
              </div>
            )}
          </>
        )}
      </form>
    </Dialog>
  )
}
