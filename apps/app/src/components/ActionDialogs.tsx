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
  type Gender,
  type ParentRole,
  type PartialDate,
  type Result,
  type TreeDoc,
  type TreePerson,
} from '@kintree/core'
import { useState, type FormEvent, type ReactNode } from 'react'
import { messageFor } from '../lib/messages.ts'
import { DateInput } from './DateInput.tsx'
import { Dialog, DialogActions } from './Dialog.tsx'
import { Button, ErrorNote, Field, Select, TextInput } from './ui.tsx'

export type EditFn = <T extends object>(op: (doc: TreeDoc) => Result<T>) => Result<T>

type Common = {
  doc: TreeDoc
  edit: EditFn
  person: TreePerson
  /** Gọi khi đóng; `newId` là người vừa được thêm (để chọn và cuộn tới). */
  onClose: (newId?: string) => void
}

const newId = () => crypto.randomUUID()

function useFormError() {
  const [error, setError] = useState<string | null>(null)
  return { error, fail: (e: Parameters<typeof messageFor>[0]) => setError(messageFor(e)), clear: () => setError(null) }
}

function Form({ onSubmit, children, error, submitLabel, onClose }: { onSubmit: (e: FormEvent) => void; children: ReactNode; error: string | null; submitLabel: string; onClose: () => void }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {children}
      {error && <ErrorNote>{error}</ErrorNote>}
      <DialogActions>
        <Button onClick={onClose}>Huỷ</Button>
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </DialogActions>
    </form>
  )
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
]

export function AddChildDialog({ doc, edit, person, onClose }: Common) {
  const spouses = spouseIdsOf(doc, person.id).map((id) => findPerson(doc, id)!)
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [kind, setKind] = useState<ChildKind>('biological')
  const [other, setOther] = useState(spouses.length === 1 ? spouses[0]!.id : '')
  const [role, setRole] = useState<ParentRole | ''>('')
  const f = useFormError()

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
    if (r.ok) onClose(r.id)
    else f.fail(r.error)
  }

  return (
    <Dialog title={`Thêm con cho ${person.fullName}`} onClose={() => onClose()}>
      <Form onSubmit={submit} error={f.error} submitLabel="Thêm con" onClose={() => onClose()}>
        <Field label="Họ tên">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Giới tính">
          <Select value={gender} onChange={(e) => setGender(e.target.value as Gender | '')}>
            <option value="">— Chọn —</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Loại quan hệ">
          <Select value={kind} onChange={(e) => setKind(e.target.value as ChildKind)}>
            <option value="biological">Con ruột</option>
            <option value="adopted">Con nuôi</option>
            <option value="step">Con riêng của vợ/chồng</option>
          </Select>
        </Field>
        {spouses.length > 0 && (
          <Field label="Con chung với" hint={spouses.length > 1 ? 'Người này có nhiều vợ/chồng, hãy chọn một người.' : undefined}>
            <Select value={other} onChange={(e) => setOther(e.target.value)}>
              {spouses.length > 1 && <option value="">— Chọn —</option>}
              {spouses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
              {kind !== 'step' && <option value="none">Không ghi (chưa rõ)</option>}
            </Select>
          </Field>
        )}
        {person.gender === 'unknown' && (
          <Field label={`${person.fullName} là cha hay mẹ của người con?`}>
            <Select value={role} onChange={(e) => setRole(e.target.value as ParentRole | '')}>
              <option value="">— Chọn —</option>
              <option value="father">Cha</option>
              <option value="mother">Mẹ</option>
            </Select>
          </Field>
        )}
      </Form>
    </Dialog>
  )
}

export function AddSpouseDialog({ edit, person, onClose }: Common) {
  const [name, setName] = useState('')
  const f = useFormError()
  const label = person.gender === 'male' ? 'vợ' : person.gender === 'female' ? 'chồng' : 'vợ/chồng'

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = edit((d) => addSpouse(d, { personId: person.id, person: { fullName: name } }, newId))
    if (r.ok) onClose(r.id)
    else f.fail(r.error)
  }

  return (
    <Dialog title={`Thêm ${label} cho ${person.fullName}`} onClose={() => onClose()}>
      <Form onSubmit={submit} error={f.error} submitLabel={`Thêm ${label}`} onClose={() => onClose()}>
        <Field label="Họ tên" hint="Người từ họ khác về, được đánh dấu là dâu/rể.">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
      </Form>
    </Dialog>
  )
}

export function AddParentDialog({ doc, edit, person, onClose }: Common) {
  const [name, setName] = useState('')
  const f = useFormError()
  const known = parentLinksOf(doc, person.id).find((l) => l.kind === 'biological')
  const label = known?.role === 'father' ? 'mẹ' : 'cha'

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = edit((d) => addMissingParent(d, { childId: person.id, person: { fullName: name } }, newId))
    if (r.ok) onClose(r.id)
    else f.fail(r.error)
  }

  return (
    <Dialog title={`Thêm ${label} cho ${person.fullName}`} onClose={() => onClose()}>
      <Form onSubmit={submit} error={f.error} submitLabel={`Thêm ${label}`} onClose={() => onClose()}>
        <Field label="Họ tên" hint={`Được nối làm vợ/chồng của ${label === 'mẹ' ? 'cha' : 'mẹ'} đã có.`}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
      </Form>
    </Dialog>
  )
}

export function RemoveDialog({ doc, edit, person, onClose, branch }: Common & { branch: boolean }) {
  const f = useFormError()
  const count = branchSize(doc, person.id)

  function confirm() {
    const now = new Date().toISOString()
    const r = edit((d) => (branch ? removeBranch(d, person.id, now, newId) : removePerson(d, person.id, now, newId)))
    if (r.ok) onClose()
    else f.fail(r.error)
  }

  return (
    <Dialog title={branch ? 'Gỡ cả nhánh?' : 'Gỡ người này?'} onClose={() => onClose()}>
      <div className="space-y-3">
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
        <p className="text-sm text-[#6b5d4a]">Dữ liệu không bị xoá: vẫn nằm trong bản sao tải về, kèm dấu đã gỡ.</p>
        {f.error && <ErrorNote>{f.error}</ErrorNote>}
        <DialogActions>
          <Button onClick={() => onClose()}>Huỷ</Button>
          <Button variant="danger" onClick={confirm}>
            {branch ? `Gỡ ${count} người` : 'Gỡ'}
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  )
}

/** Sắp thứ tự bằng nút lên/xuống (dùng được bằng bàn phím và cảm ứng). */
export function ReorderDialog({
  title,
  items,
  save,
  onClose,
}: {
  title: string
  items: { id: string; label: string }[]
  save: (ids: string[]) => Result
  onClose: () => void
}) {
  const [order, setOrder] = useState(items)
  const f = useFormError()

  const move = (i: number, d: -1 | 1) => {
    const next = [...order]
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    setOrder(next)
  }

  function submit() {
    const r = save(order.map((x) => x.id))
    if (r.ok) onClose()
    else f.fail(r.error)
  }

  return (
    <Dialog title={title} onClose={onClose}>
      <ol className="space-y-2">
        {order.map((it, i) => (
          <li key={it.id} className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-1">
            <span className="w-6 text-sm text-[#6b5d4a]">{i + 1}</span>
            <span className="mr-auto">{it.label}</span>
            <Button variant="ghost" aria-label={`Chuyển ${it.label} lên`} disabled={i === 0} onClick={() => move(i, -1)}>
              ↑
            </Button>
            <Button variant="ghost" aria-label={`Chuyển ${it.label} xuống`} disabled={i === order.length - 1} onClick={() => move(i, 1)}>
              ↓
            </Button>
          </li>
        ))}
      </ol>
      {f.error && <ErrorNote>{f.error}</ErrorNote>}
      <DialogActions>
        <Button onClick={onClose}>Huỷ</Button>
        <Button variant="primary" onClick={submit}>
          Lưu thứ tự
        </Button>
      </DialogActions>
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
  const f = useFormError()

  function submit(e: FormEvent) {
    e.preventDefault()
    if ((birth && !isValidPartialDate(birth)) || (death && !isValidPartialDate(death))) {
      return f.fail('INVALID_DATE')
    }
    const r = edit((d) => updatePerson(d, person.id, { fullName, gender, birth, death, birthPlace, burialPlace, biography, note }))
    if (r.ok) onClose()
    else f.fail(r.error)
  }

  return (
    <Dialog title={`Hồ sơ: ${person.fullName}`} onClose={() => onClose()}>
      <Form onSubmit={submit} error={f.error} submitLabel="Lưu hồ sơ" onClose={() => onClose()}>
        <Field label="Họ tên">
          <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Giới tính">
          <Select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="unknown">Chưa rõ</option>
          </Select>
        </Field>
        <DateInput label="Ngày sinh" value={person.birth} onChange={setBirth} />
        <DateInput label="Ngày mất" value={person.death} onChange={setDeath} />
        <Field label="Nơi sinh">
          <TextInput value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} />
        </Field>
        <Field label="Nơi an táng">
          <TextInput value={burialPlace} onChange={(e) => setBurialPlace(e.target.value)} />
        </Field>
        <Field label="Tiểu sử" hint="Chép thành câu đầy đủ: sau này sẽ in vào sách gia phả.">
          <textarea className="min-h-28 w-full rounded-md border border-line bg-white p-3 text-base" value={biography} onChange={(e) => setBiography(e.target.value)} />
        </Field>
        <Field label="Ghi chú riêng" hint="Chỉ để nhớ, không in vào sách.">
          <textarea className="min-h-20 w-full rounded-md border border-line bg-white p-3 text-base" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Form>
    </Dialog>
  )
}

