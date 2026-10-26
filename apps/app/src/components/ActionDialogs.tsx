import {
  addChild,
  addMissingParent,
  addSpouse,
  branchSize,
  findPerson,
  isValidPartialDate,
  parentLinksOf,
  removeBranch,
  removePerson,
  spouseIdsOf,
  updatePerson,
  type ChildKind,
  type EditError,
  type Gender,
  type ParentRole,
  type PartialDate,
  type Result,
  type TreeDoc,
  type TreePerson,
} from '@kintree/core'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import { messageFor } from '../lib/messages.ts'
import { Button, Dialog, ErrorText, IconButton, SelectField, TextAreaField, TextField, useToast } from '../ui/index.ts'
import { DateInput } from './DateInput.tsx'

export type EditFn = <T extends object>(op: (doc: TreeDoc) => Result<T>) => Result<T>

type Common = {
  doc: TreeDoc
  edit: EditFn
  person: TreePerson
  /** Gọi khi đóng; `newId` là người vừa được thêm (để chọn và cuộn tới). */
  onClose: (newId?: string) => void
}

const newId = () => crypto.randomUUID()

/**
 * Lỗi gắn với ô nhập: hiện ngay dưới ô và chuyển con trỏ tới ô ấy (design D6).
 * `fields` ánh xạ mã lỗi → tên ô; mã không có trong bảng hiện ở đầu hộp thoại.
 */
function useFieldErrors<F extends string>(fields: Partial<Record<EditError, F>>, refs: Partial<Record<F, RefObject<HTMLElement | null>>>) {
  const [error, setError] = useState<{ field: F | null; text: string } | null>(null)
  const refsRef = useRef(refs)
  refsRef.current = refs
  // Chỉ chuyển con trỏ khi có lỗi mới, không giành lại con trỏ ở mỗi lần gõ.
  useEffect(() => {
    if (error?.field) refsRef.current[error.field]?.current?.focus()
  }, [error])
  return {
    general: error && !error.field ? error.text : null,
    on: (f: F) => (error?.field === f ? error.text : null),
    fail: (e: EditError) => setError({ field: fields[e] ?? null, text: messageFor(e) }),
    clear: () => setError(null),
  }
}

function Actions({ submitLabel, form, onCancel }: { submitLabel: string; form: string; onCancel: () => void }) {
  return (
    <>
      <Button onClick={onCancel}>Huỷ</Button>
      <Button type="submit" form={form} variant="primary">
        {submitLabel}
      </Button>
    </>
  )
}

function Form({ id, onSubmit, general, children }: { id: string; onSubmit: (e: FormEvent) => void; general: string | null; children: ReactNode }) {
  return (
    <form id={id} onSubmit={onSubmit} className="space-y-4" noValidate>
      {general && <ErrorText>{general}</ErrorText>}
      {children}
    </form>
  )
}

export function AddChildDialog({ doc, edit, person, onClose }: Common) {
  const spouses = spouseIdsOf(doc, person.id).map((id) => findPerson(doc, id)!)
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [kind, setKind] = useState<ChildKind>('biological')
  const [other, setOther] = useState(spouses.length === 1 ? spouses[0]!.id : '')
  const [role, setRole] = useState<ParentRole | ''>('')
  const refs = { name: useRef<HTMLInputElement>(null), gender: useRef<HTMLSelectElement>(null), other: useRef<HTMLSelectElement>(null), role: useRef<HTMLSelectElement>(null) }
  const f = useFieldErrors({ MISSING_NAME: 'name', MISSING_GENDER: 'gender', OTHER_PARENT_REQUIRED: 'other', NOT_SPOUSE: 'other', MISSING_ROLE: 'role' }, refs)
  const toast = useToast()

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = edit((d) =>
      addChild(
        d,
        {
          parentId: person.id,
          person: { fullName: name, ...(gender ? { gender } : {}) },
          kind,
          ...(other === '' ? {} : { other: other === 'none' ? null : other }),
          ...(role ? { parentRole: role } : {}),
        },
        newId,
      ),
    )
    if (!r.ok) return f.fail(r.error)
    toast(`Đã thêm ${name.trim()}`)
    onClose(r.id)
  }

  return (
    <Dialog title={`Thêm con cho ${person.fullName}`} onClose={() => onClose()} dirty={name.trim() !== ''} footer={<Actions form="add-child" submitLabel="Thêm con" onCancel={() => onClose()} />}>
      <Form id="add-child" onSubmit={submit} general={f.general}>
        <TextField ref={refs.name} label="Họ tên" value={name} onChange={(e) => setName(e.target.value)} error={f.on('name')} autoFocus autoComplete="off" />
        <SelectField ref={refs.gender} label="Giới tính" value={gender} onChange={(e) => setGender(e.target.value as Gender | '')} error={f.on('gender')}>
          <option value="">— Chọn —</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
        </SelectField>
        <SelectField label="Loại quan hệ" value={kind} onChange={(e) => setKind(e.target.value as ChildKind)}>
          <option value="biological">Con ruột</option>
          <option value="adopted">Con nuôi</option>
          <option value="step">Con riêng của vợ/chồng</option>
        </SelectField>
        {spouses.length > 0 && (
          <SelectField
            ref={refs.other}
            label="Con chung với"
            hint={spouses.length > 1 ? 'Người này có nhiều vợ/chồng, hãy chọn một người.' : undefined}
            value={other}
            onChange={(e) => setOther(e.target.value)}
            error={f.on('other')}
          >
            {spouses.length > 1 && <option value="">— Chọn —</option>}
            {spouses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
            {kind !== 'step' && <option value="none">Không ghi (chưa rõ)</option>}
          </SelectField>
        )}
        {person.gender === 'unknown' && (
          <SelectField ref={refs.role} label={`${person.fullName} là cha hay mẹ của người con?`} value={role} onChange={(e) => setRole(e.target.value as ParentRole | '')} error={f.on('role')}>
            <option value="">— Chọn —</option>
            <option value="father">Cha</option>
            <option value="mother">Mẹ</option>
          </SelectField>
        )}
      </Form>
    </Dialog>
  )
}

export function AddSpouseDialog({ edit, person, onClose }: Common) {
  const [name, setName] = useState('')
  const refs = { name: useRef<HTMLInputElement>(null) }
  const f = useFieldErrors({ MISSING_NAME: 'name' }, refs)
  const toast = useToast()
  const label = person.gender === 'male' ? 'vợ' : person.gender === 'female' ? 'chồng' : 'vợ/chồng'

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = edit((d) => addSpouse(d, { personId: person.id, person: { fullName: name } }, newId))
    if (!r.ok) return f.fail(r.error)
    toast(`Đã thêm ${name.trim()}`)
    onClose(r.id)
  }

  return (
    <Dialog title={`Thêm ${label} cho ${person.fullName}`} onClose={() => onClose()} dirty={name.trim() !== ''} footer={<Actions form="add-spouse" submitLabel={`Thêm ${label}`} onCancel={() => onClose()} />}>
      <Form id="add-spouse" onSubmit={submit} general={f.general}>
        <TextField ref={refs.name} label="Họ tên" hint="Người từ họ khác về, được đánh dấu là dâu/rể." value={name} onChange={(e) => setName(e.target.value)} error={f.on('name')} autoFocus autoComplete="off" />
      </Form>
    </Dialog>
  )
}

export function AddParentDialog({ doc, edit, person, onClose }: Common) {
  const [name, setName] = useState('')
  const refs = { name: useRef<HTMLInputElement>(null) }
  const f = useFieldErrors({ MISSING_NAME: 'name' }, refs)
  const toast = useToast()
  const known = parentLinksOf(doc, person.id).find((l) => l.kind === 'biological')
  const label = known?.role === 'father' ? 'mẹ' : 'cha'

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = edit((d) => addMissingParent(d, { childId: person.id, person: { fullName: name } }, newId))
    if (!r.ok) return f.fail(r.error)
    toast(`Đã thêm ${name.trim()}`)
    onClose(r.id)
  }

  return (
    <Dialog title={`Thêm ${label} cho ${person.fullName}`} onClose={() => onClose()} dirty={name.trim() !== ''} footer={<Actions form="add-parent" submitLabel={`Thêm ${label}`} onCancel={() => onClose()} />}>
      <Form id="add-parent" onSubmit={submit} general={f.general}>
        <TextField
          ref={refs.name}
          label="Họ tên"
          hint={`Được nối làm vợ/chồng của ${label === 'mẹ' ? 'cha' : 'mẹ'} đã có.`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={f.on('name')}
          autoFocus
          autoComplete="off"
        />
      </Form>
    </Dialog>
  )
}

export function RemoveDialog({ doc, edit, person, onClose, branch }: Common & { branch: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const count = branchSize(doc, person.id)

  function confirm() {
    const now = new Date().toISOString()
    const r = edit((d) => (branch ? removeBranch(d, person.id, now, newId) : removePerson(d, person.id, now, newId)))
    if (!r.ok) return setError(messageFor(r.error))
    toast(branch ? `Đã gỡ ${count} người (vẫn giữ trong bản sao)` : `Đã gỡ ${person.fullName} (vẫn giữ trong bản sao)`)
    onClose()
  }

  return (
    <Dialog
      title={branch ? 'Gỡ cả nhánh?' : 'Gỡ người này?'}
      onClose={() => onClose()}
      footer={
        <>
          <Button onClick={() => onClose()}>Huỷ</Button>
          <Button variant="danger" icon={Trash2} onClick={confirm}>
            {branch ? `Gỡ ${count} người` : 'Gỡ'}
          </Button>
        </>
      }
    >
      <p>
        {branch ? (
          <>
            Sẽ gỡ <strong>{count} người</strong>: {person.fullName}, con cháu và vợ/chồng chỉ gắn với nhánh này.
          </>
        ) : (
          <>
            Sẽ gỡ <strong>{person.fullName}</strong> khỏi sơ đồ.
          </>
        )}
      </p>
      <p className="text-sm text-ink-muted">Dữ liệu không bị xoá: vẫn nằm trong bản sao tải về, kèm dấu đã gỡ.</p>
      {error && <ErrorText>{error}</ErrorText>}
    </Dialog>
  )
}

/** Sắp thứ tự bằng nút lên/xuống (dùng được bằng bàn phím và cảm ứng). */
export function ReorderDialog({ title, items, save, onClose }: { title: string; items: { id: string; label: string }[]; save: (ids: string[]) => Result; onClose: () => void }) {
  const [order, setOrder] = useState(items)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const changed = order.some((x, i) => x.id !== items[i]!.id)

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    setOrder(next)
  }

  function submit() {
    const r = save(order.map((x) => x.id))
    if (!r.ok) return setError(messageFor(r.error))
    toast('Đã lưu thứ tự')
    onClose()
  }

  return (
    <Dialog
      title={title}
      onClose={onClose}
      dirty={changed}
      footer={
        <>
          <Button onClick={onClose}>Huỷ</Button>
          <Button variant="primary" onClick={submit}>
            Lưu thứ tự
          </Button>
        </>
      }
    >
      <ol className="space-y-2">
        {order.map((it, i) => (
          <li key={it.id} className="flex items-center gap-2 rounded-md border border-line-strong bg-surface py-1 pl-3 pr-1">
            <span className="tabular w-6 text-sm text-ink-muted">{i + 1}</span>
            <span className="min-w-0 flex-1">{it.label}</span>
            <IconButton icon={ArrowUp} label={`Chuyển ${it.label} lên`} disabled={i === 0} onClick={() => move(i, -1)} />
            <IconButton icon={ArrowDown} label={`Chuyển ${it.label} xuống`} disabled={i === order.length - 1} onClick={() => move(i, 1)} />
          </li>
        ))}
      </ol>
      {error && <ErrorText>{error}</ErrorText>}
    </Dialog>
  )
}

export function ProfileDialog({ edit, person, onClose }: Common) {
  const [fullName, setFullName] = useState(person.fullName)
  const [gender, setGender] = useState<Gender>(person.gender)
  const [birth, setBirth] = useState<PartialDate | null>(person.birth ?? null)
  const [death, setDeath] = useState<PartialDate | null>(person.death ?? null)
  const [birthPlace, setBirthPlace] = useState(person.birthPlace ?? '')
  const [burialPlace, setBurialPlace] = useState(person.burialPlace ?? '')
  const [biography, setBiography] = useState(person.biography ?? '')
  const [note, setNote] = useState(person.note ?? '')
  const refs = { name: useRef<HTMLInputElement>(null), gender: useRef<HTMLSelectElement>(null), birth: useRef<HTMLInputElement>(null), death: useRef<HTMLInputElement>(null) }
  const f = useFieldErrors<'name' | 'gender' | 'birth' | 'death'>({ MISSING_NAME: 'name', ROLE_GENDER_MISMATCH: 'gender' }, refs)
  const [dateError, setDateError] = useState<'birth' | 'death' | null>(null)
  const toast = useToast()

  const dirty =
    fullName !== person.fullName ||
    gender !== person.gender ||
    JSON.stringify(birth) !== JSON.stringify(person.birth ?? null) ||
    JSON.stringify(death) !== JSON.stringify(person.death ?? null) ||
    birthPlace !== (person.birthPlace ?? '') ||
    burialPlace !== (person.burialPlace ?? '') ||
    biography !== (person.biography ?? '') ||
    note !== (person.note ?? '')

  function submit(e: FormEvent) {
    e.preventDefault()
    const bad = birth && !isValidPartialDate(birth) ? 'birth' : death && !isValidPartialDate(death) ? 'death' : null
    setDateError(bad)
    if (bad) {
      refs[bad].current?.focus()
      return
    }
    const r = edit((d) => updatePerson(d, person.id, { fullName, gender, birth, death, birthPlace, burialPlace, biography, note }))
    if (!r.ok) return f.fail(r.error)
    toast('Đã lưu hồ sơ')
    onClose()
  }

  return (
    <Dialog title={`Hồ sơ: ${person.fullName}`} onClose={() => onClose()} dirty={dirty} footer={<Actions form="profile" submitLabel="Lưu hồ sơ" onCancel={() => onClose()} />}>
      <Form id="profile" onSubmit={submit} general={f.general}>
        <TextField ref={refs.name} label="Họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} error={f.on('name')} autoComplete="off" />
        <SelectField ref={refs.gender} label="Giới tính" value={gender} onChange={(e) => setGender(e.target.value as Gender)} error={f.on('gender')}>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="unknown">Chưa rõ</option>
        </SelectField>
        <DateInput label="Ngày sinh" value={person.birth} onChange={setBirth} inputRef={refs.birth} />
        <DateInput label="Ngày mất" value={person.death} onChange={setDeath} inputRef={refs.death} />
        {dateError && <span className="sr-only">Ngày {dateError === 'birth' ? 'sinh' : 'mất'} không hợp lệ.</span>}
        <TextField label="Nơi sinh" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} />
        <TextField label="Nơi an táng" value={burialPlace} onChange={(e) => setBurialPlace(e.target.value)} />
        <TextAreaField label="Tiểu sử" hint="Chép thành câu đầy đủ: sau này sẽ in vào sách gia phả." value={biography} onChange={(e) => setBiography(e.target.value)} />
        <TextAreaField label="Ghi chú riêng" hint="Chỉ để nhớ, không in vào sách." value={note} onChange={(e) => setNote(e.target.value)} />
      </Form>
    </Dialog>
  )
}
