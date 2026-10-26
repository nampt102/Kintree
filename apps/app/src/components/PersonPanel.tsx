import { findPerson, spouseIdsOf, type TreeDoc, type TreePerson } from '@kintree/core'
import { ArrowUp, ArrowUpDown, ChevronsDownUp, ChevronsUpDown, Crosshair, Heart, Pencil, Trash2, UserPlus, X } from 'lucide-react'
import type { PersonActions } from '../lib/actions.ts'
import { formatPartialDate, lifespan } from '../lib/format.ts'
import { Button, IconButton } from '../ui/index.ts'

export type PanelAction =
  | 'edit'
  | 'addChild'
  | 'addSpouse'
  | 'addParent'
  | 'reorderChildren'
  | 'reorderSpouses'
  | 'reorderSiblings'
  | 'toggleCollapse'
  | 'focus'
  | 'remove'
  | 'removeBranch'

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

type Props = {
  doc: TreeDoc
  person: TreePerson
  actions: PersonActions
  collapsed: boolean
  onAction: (a: PanelAction) => void
}

/** Nội dung bảng thông tin một người: dùng chung cho tấm trượt (cỡ gọn) và ngăn bên (cỡ vừa/rộng). */
export function PersonDetails({ doc, person, actions, collapsed, onAction }: Props) {
  const spouses = spouseIdsOf(doc, person.id)
    .map((id) => findPerson(doc, id)?.fullName)
    .filter(Boolean)
  const btn = (label: string, action: PanelAction, icon: Parameters<typeof Button>[0]['icon']) => (
    <Button block icon={icon} onClick={() => onAction(action)}>
      {label}
    </Button>
  )
  const meta = [
    person.gender === 'male' ? 'Nam' : person.gender === 'female' ? 'Nữ' : 'Chưa rõ giới tính',
    person.isRoot ? 'Thuỷ tổ' : '',
    person.isOutsider ? (person.gender === 'male' ? 'Rể' : 'Dâu') : '',
    lifespan(person),
  ].filter(Boolean)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold leading-snug">{person.fullName}</h2>
        <p className="text-sm text-ink-muted">{meta.join(' · ')}</p>
      </div>

      <dl className="space-y-2">
        <Row label="Ngày sinh" value={formatPartialDate(person.birth)} />
        <Row label="Ngày mất" value={formatPartialDate(person.death)} />
        <Row label="Nơi sinh" value={person.birthPlace} />
        <Row label="Nơi an táng" value={person.burialPlace} />
        <Row label="Vợ/chồng" value={spouses.join(', ')} />
      </dl>

      <div className="grid gap-2">
        {btn('Sửa hồ sơ', 'edit', Pencil)}
        {actions.canAddChild && btn('Thêm con', 'addChild', UserPlus)}
        {actions.canAddSpouse && btn('Thêm vợ/chồng', 'addSpouse', Heart)}
        {actions.canAddParent && btn('Thêm cha/mẹ còn thiếu', 'addParent', ArrowUp)}
        {actions.canReorderChildren && btn('Sắp thứ tự các con', 'reorderChildren', ArrowUpDown)}
        {actions.canReorderSiblings && btn('Sắp thứ tự anh chị em', 'reorderSiblings', ArrowUpDown)}
        {actions.canReorderSpouses && btn('Sắp thứ tự vợ/chồng', 'reorderSpouses', ArrowUpDown)}
        {actions.hasChildren && btn(collapsed ? 'Mở nhánh con cháu' : 'Thu gọn nhánh con cháu', 'toggleCollapse', collapsed ? ChevronsUpDown : ChevronsDownUp)}
        {btn('Xem riêng nhánh này', 'focus', Crosshair)}
      </div>

      {(actions.canRemove || actions.canRemoveBranch) && (
        <div className="grid gap-2 border-t border-line pt-4">
          {actions.canRemove && (
            <Button block variant="danger" icon={Trash2} onClick={() => onAction('remove')}>
              Gỡ người này
            </Button>
          )}
          {actions.canRemoveBranch && (
            <Button block variant="danger" icon={Trash2} onClick={() => onAction('removeBranch')}>
              Gỡ cả nhánh
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/** Ngăn bên (cỡ vừa/rộng, hoặc đoạn phải khi có hai đoạn vùng nhìn). */
export function PersonSidePane({ width, onClose, ...props }: Props & { width: number; onClose: () => void }) {
  return (
    <aside
      aria-label={`Thông tin ${props.person.fullName}`}
      className="flex shrink-0 flex-col border-l border-line bg-surface"
      style={{ width, paddingRight: 'env(safe-area-inset-right)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-end px-2 pt-2">
        <IconButton icon={X} label="Đóng bảng thông tin" onClick={onClose} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <PersonDetails {...props} />
      </div>
    </aside>
  )
}
