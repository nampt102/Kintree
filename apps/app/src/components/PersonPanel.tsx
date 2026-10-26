import { findPerson, spouseIdsOf, type TreeDoc, type TreePerson } from '@kintree/core'
import type { PersonActions } from '../lib/actions.ts'
import { formatPartialDate, lifespan } from '../lib/format.ts'
import { Button } from './ui.tsx'

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
      <dt className="text-sm text-[#6b5d4a]">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/** Bảng thông tin một người: ở cạnh phải trên máy tính, ở chân màn hình trên điện thoại. */
export function PersonPanel({
  doc,
  person,
  actions,
  collapsed,
  onAction,
  onClose,
}: {
  doc: TreeDoc
  person: TreePerson
  actions: PersonActions
  collapsed: boolean
  onAction: (a: PanelAction) => void
  onClose: () => void
}) {
  const spouses = spouseIdsOf(doc, person.id).map((id) => findPerson(doc, id)?.fullName).filter(Boolean)
  const btn = (label: string, action: PanelAction, variant: 'secondary' | 'danger' = 'secondary') => (
    <Button variant={variant} className="w-full justify-start" onClick={() => onAction(action)}>
      {label}
    </Button>
  )
  return (
    <aside
      aria-label={`Thông tin ${person.fullName}`}
      className="fixed inset-x-0 bottom-0 z-20 max-h-[45dvh] space-y-3 overflow-y-auto border-t border-line bg-white p-4 shadow-lg md:static md:max-h-none md:w-80 md:shrink-0 md:border-l md:border-t-0 md:shadow-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xl font-semibold">{person.fullName}</h3>
          <p className="text-sm text-[#6b5d4a]">
            {[person.gender === 'male' ? 'Nam' : person.gender === 'female' ? 'Nữ' : 'Chưa rõ giới tính', person.isRoot ? 'Thuỷ tổ' : '', person.isOutsider ? (person.gender === 'male' ? 'Rể' : 'Dâu') : '', lifespan(person)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <Button variant="ghost" aria-label="Đóng bảng thông tin" className="-mr-2 px-3" onClick={onClose}>
          ✕
        </Button>
      </div>

      <dl className="space-y-2">
        <Row label="Ngày sinh" value={formatPartialDate(person.birth)} />
        <Row label="Ngày mất" value={formatPartialDate(person.death)} />
        <Row label="Nơi sinh" value={person.birthPlace} />
        <Row label="Nơi an táng" value={person.burialPlace} />
        <Row label="Vợ/chồng" value={spouses.join(', ')} />
      </dl>

      <div className="grid gap-2">
        {btn('Sửa hồ sơ', 'edit')}
        {actions.canAddChild && btn('Thêm con', 'addChild')}
        {actions.canAddSpouse && btn('Thêm vợ/chồng', 'addSpouse')}
        {actions.canAddParent && btn('Thêm cha/mẹ còn thiếu', 'addParent')}
        {actions.canReorderChildren && btn('Sắp thứ tự các con', 'reorderChildren')}
        {actions.canReorderSiblings && btn('Sắp thứ tự anh chị em', 'reorderSiblings')}
        {actions.canReorderSpouses && btn('Sắp thứ tự vợ/chồng', 'reorderSpouses')}
        {actions.hasChildren && btn(collapsed ? 'Mở nhánh con cháu' : 'Thu gọn nhánh con cháu', 'toggleCollapse')}
        {btn('Xem riêng nhánh này', 'focus')}
        {actions.canRemove && btn('Gỡ người này', 'remove', 'danger')}
        {actions.canRemoveBranch && btn('Gỡ cả nhánh', 'removeBranch', 'danger')}
      </div>
    </aside>
  )
}
