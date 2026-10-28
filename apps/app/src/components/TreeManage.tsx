import type { Region } from '@kintree/core'
import { useRef, useState } from 'react'
import type { CloudStore, TreeInfo } from '../lib/cloudStore.ts'
import { messageFor } from '../lib/messages.ts'
import { Button, ChoiceField, Dialog, TextAreaField, TextField, useToast } from '../ui/index.ts'

export const REGION_LABEL: Record<Region, string> = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam' }

const RegionSelect = ({ value, onChange }: { value: Region; onChange: (r: Region) => void }) => (
  <ChoiceField
    label="Vùng miền (quyết định cách xưng hô)"
    value={value}
    onChange={(v) => onChange(v as Region)}
    options={Object.entries(REGION_LABEL).map(([v, l]) => ({ value: v, label: l }))}
  />
)

/** Tạo cuốn trong một dòng họ (chỉ quản trị dòng họ; cơ sở dữ liệu cưỡng chế). */
export function CreateTreeDialog({ cloud, clanId, onClose, onCreated }: { cloud: CloudStore; clanId: string; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [region, setRegion] = useState<Region>('north')
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError(messageFor('MISSING_NAME'))
      nameRef.current?.focus()
      return
    }
    const r = await cloud.createTree(clanId, name.trim(), region)
    if (!r.ok) return setError(messageFor(r.error))
    toast(`Đã tạo cuốn ${name.trim()}`)
    onCreated(r.value)
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
        <RegionSelect value={region} onChange={setRegion} />
      </form>
    </Dialog>
  )
}

/** Sửa tên, vùng miền, mô tả của cuốn (chỉ quản trị). */
export function EditTreeInfoDialog({ cloud, tree, onClose, onSaved }: { cloud: CloudStore; tree: Pick<TreeInfo, 'id' | 'name' | 'region' | 'description'>; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(tree.name)
  const [region, setRegion] = useState<Region>(tree.region)
  const [description, setDescription] = useState(tree.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const dirty = name !== tree.name || region !== tree.region || description !== (tree.description ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError(messageFor('MISSING_NAME'))
      nameRef.current?.focus()
      return
    }
    const r = await cloud.updateTreeInfo(tree.id, { name: name.trim(), region, description })
    if (!r.ok) return setError(messageFor(r.error))
    toast('Đã lưu thông tin cuốn')
    onSaved()
  }

  return (
    <Dialog
      title="Sửa thông tin cuốn"
      onClose={onClose}
      dirty={dirty}
      footer={
        <>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="submit" form="edit-tree" variant="primary">
            Lưu
          </Button>
        </>
      }
    >
      <form id="edit-tree" onSubmit={submit} className="space-y-4" noValidate>
        <TextField ref={nameRef} label="Tên cuốn" value={name} onChange={(e) => setName(e.target.value)} error={error} autoFocus />
        <RegionSelect value={region} onChange={setRegion} />
        <TextAreaField label="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} />
      </form>
    </Dialog>
  )
}

/** Xoá cuốn = đánh dấu đã xoá; phải gõ lại đúng tên cuốn mới bật nút (spec "Chỉ quản trị sửa thông tin và xoá cuốn"). */
export function DeleteTreeDialog({ cloud, tree, onClose, onDeleted }: { cloud: CloudStore; tree: Pick<TreeInfo, 'id' | 'name'>; onClose: () => void; onDeleted: () => void }) {
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const match = typed.trim() === tree.name.trim()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!match) return
    const r = await cloud.removeTree(tree.id)
    if (!r.ok) return setError(messageFor(r.error))
    toast(`Đã xoá cuốn ${tree.name}`)
    onDeleted()
  }

  return (
    <Dialog
      title="Xoá cuốn gia phả"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="submit" form="delete-tree" variant="danger" disabled={!match}>
            Xoá cuốn
          </Button>
        </>
      }
    >
      <form id="delete-tree" onSubmit={submit} className="space-y-4" noValidate>
        <p>
          Cuốn <strong>{tree.name}</strong> sẽ biến khỏi danh sách của mọi thành viên. Dữ liệu vẫn được giữ trên máy chủ.
        </p>
        <TextField label="Gõ lại tên cuốn để xác nhận" value={typed} onChange={(e) => setTyped(e.target.value)} error={error} autoFocus />
      </form>
    </Dialog>
  )
}
