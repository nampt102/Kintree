import { findPerson, spouseIdsOf, type TreeDoc, type TreePerson } from '@kintree/core'
import { ArrowUp, ArrowUpDown, ChevronsDownUp, ChevronsUpDown, Crosshair, Heart, Landmark, Mars, Pencil, Trash2, UserPlus, Venus, X } from 'lucide-react'
import type { PersonActions } from '../lib/actions.ts'
import { formatPartialDate, lifespan } from '../lib/format.ts'
import type { FieldSource } from '../lib/sourceStore.ts'
import { ActionList, Avatar, Badge, Button, IconButton, InfoList, type ActionItem } from '../ui/index.ts'
import { SourceChip } from './Sources.tsx'

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

type Props = {
  doc: TreeDoc
  person: TreePerson
  actions: PersonActions
  collapsed: boolean
  /** Người xem: hồ sơ chỉ đọc, không có nút sửa. */
  readOnly?: boolean
  onAction: (a: PanelAction) => void
  /** Nguồn của các trường (từ ảnh được AI đọc và duyệt); bấm dấu nguồn mở hộp nguồn. */
  fieldSources?: FieldSource[]
  onOpenSource?: (field: string) => void
}

const GENDER_LABEL = { male: 'Nam', female: 'Nữ', unknown: 'Chưa rõ giới tính' } as const

/** Đầu bảng: ảnh chữ cái, tên, giới tính (biểu tượng + chữ), năm sống, dấu thuỷ tổ / dâu / rể. */
function Head({ person, size }: { person: TreePerson; size: number }) {
  const GenderIcon = person.gender === 'male' ? Mars : person.gender === 'female' ? Venus : null
  const years = lifespan(person)
  return (
    <div className="flex items-center gap-3.5">
      <Avatar name={person.fullName} gender={person.gender} muted={person.death !== undefined} size={size} />
      <div className="min-w-0">
        <h2 className="text-xl font-semibold leading-tight tracking-[-0.01em]">{person.fullName}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-muted">
          {GenderIcon && <GenderIcon aria-hidden size={14} strokeWidth={2.2} className={person.gender === 'male' ? 'text-male' : 'text-female'} />}
          <span>{GENDER_LABEL[person.gender]}</span>
          {years && <span className="tabular">· {years}</span>}
        </p>
        {(person.isRoot || person.isOutsider) && (
          <div className="mt-1.5 flex gap-1.5">
            {person.isRoot && (
              <Badge tone="accent" icon={Landmark}>
                Thuỷ tổ
              </Badge>
            )}
            {person.isOutsider && <Badge>{person.gender === 'male' ? 'Rể' : 'Dâu'}</Badge>}
          </div>
        )}
      </div>
    </div>
  )
}

/** Hàng nút nhanh: "Sửa hồ sơ" là nút chính duy nhất; các việc hay dùng khác là nút tròn có tên. */
function QuickRow({ actions, readOnly, onAction }: Pick<Props, 'actions' | 'readOnly' | 'onAction'>) {
  return (
    <div className="flex items-center gap-2">
      {!readOnly && (
        <Button variant="primary" icon={Pencil} className="flex-1 whitespace-nowrap" onClick={() => onAction('edit')}>
          Sửa hồ sơ
        </Button>
      )}
      {actions.canAddChild && <IconButton icon={UserPlus} label="Thêm con" variant="secondary" onClick={() => onAction('addChild')} />}
      {actions.canAddSpouse && <IconButton icon={Heart} label="Thêm vợ/chồng" variant="secondary" onClick={() => onAction('addSpouse')} />}
      {readOnly ? (
        <Button variant="secondary" icon={Crosshair} onClick={() => onAction('focus')}>
          Xem riêng nhánh này
        </Button>
      ) : (
        <IconButton icon={Crosshair} label="Xem riêng nhánh này" variant="secondary" onClick={() => onAction('focus')} />
      )}
    </div>
  )
}

/** Thẻ gọn trên điện thoại (nấc thấp của tấm trượt). */
export function PersonPeek({ person, actions, readOnly, onAction }: Props) {
  return (
    <div className="space-y-3">
      <Head person={person} size={48} />
      <QuickRow actions={actions} readOnly={readOnly} onAction={onAction} />
    </div>
  )
}

/** Nội dung đầy đủ của bảng thông tin một người: dùng chung cho tấm trượt (mở rộng) và ngăn bên. */
export function PersonDetails({ doc, person, actions, collapsed, readOnly, onAction, fieldSources = [], onOpenSource }: Props) {
  const chip = (field: string) => {
    const list = fieldSources.filter((s) => s.field === field)
    return onOpenSource && list.length > 0 ? <SourceChip field={field} sources={list} onOpen={() => onOpenSource(field)} /> : undefined
  }
  const spouses = spouseIdsOf(doc, person.id)
    .map((id) => findPerson(doc, id)?.fullName)
    .filter(Boolean)
    .join(', ')

  const more: ActionItem[] = [
    ...(actions.canAddParent ? [{ label: 'Thêm cha/mẹ còn thiếu', icon: ArrowUp, onSelect: () => onAction('addParent') }] : []),
    ...(actions.canReorderChildren ? [{ label: 'Sắp thứ tự các con', icon: ArrowUpDown, onSelect: () => onAction('reorderChildren') }] : []),
    ...(actions.canReorderSiblings ? [{ label: 'Sắp thứ tự anh chị em', icon: ArrowUpDown, onSelect: () => onAction('reorderSiblings') }] : []),
    ...(actions.canReorderSpouses ? [{ label: 'Sắp thứ tự vợ/chồng', icon: ArrowUpDown, onSelect: () => onAction('reorderSpouses') }] : []),
    ...(actions.hasChildren
      ? [{ label: collapsed ? 'Mở nhánh con cháu' : 'Thu gọn nhánh con cháu', icon: collapsed ? ChevronsUpDown : ChevronsDownUp, onSelect: () => onAction('toggleCollapse') }]
      : []),
  ]

  return (
    <div className="space-y-5">
      <Head person={person} size={64} />
      <QuickRow actions={actions} readOnly={readOnly} onAction={onAction} />
      <InfoList
        rows={[
          { label: 'Ngày sinh', value: formatPartialDate(person.birth), extra: chip('birth') },
          { label: 'Ngày mất', value: formatPartialDate(person.death), extra: chip('death') },
          { label: 'Nơi sinh', value: person.birthPlace, extra: chip('birthPlace') },
          { label: 'Nơi an táng', value: person.burialPlace, extra: chip('burialPlace') },
          { label: 'Vợ/chồng', value: spouses },
        ]}
      />
      {readOnly && person.biography && (
        <div className="rounded-xl bg-canvas px-4 py-3 text-sm ring-1 ring-line/60">
          <p className="text-ink-muted">Tiểu sử</p>
          <p className="mt-1 whitespace-pre-line">{person.biography}</p>
        </div>
      )}
      <ActionList items={more} />
      {(actions.canRemove || actions.canRemoveBranch) && (
        <div className="flex flex-col items-center gap-1 pt-1">
          {actions.canRemove && (
            <Button variant="danger" icon={Trash2} onClick={() => onAction('remove')}>
              Gỡ người này
            </Button>
          )}
          {actions.canRemoveBranch && (
            <Button variant="danger" icon={Trash2} onClick={() => onAction('removeBranch')}>
              Gỡ cả nhánh
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/** Ngăn nổi bên phải (cỡ vừa/rộng, hoặc đoạn phải khi có hai đoạn vùng nhìn). Giữ cột riêng nên khung người không dịch. */
export function PersonSidePane({ width, onClose, ...props }: Props & { width: number; onClose: () => void }) {
  const tint = props.person.gender === 'male' ? 'from-male-soft' : props.person.gender === 'female' ? 'from-female-soft' : 'from-surface-muted'
  return (
    <aside
      aria-label={`Thông tin ${props.person.fullName}`}
      className="flex shrink-0 flex-col p-3"
      style={{ width, paddingRight: 'max(0.75rem, env(safe-area-inset-right))', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-surface shadow-3 ring-1 ring-line/60">
        <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${tint} to-transparent`} />
        <div className="relative flex justify-end px-3 pt-3">
          <IconButton icon={X} label="Đóng bảng thông tin" variant="raised" onClick={onClose} />
        </div>
        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <PersonDetails {...props} />
        </div>
      </div>
    </aside>
  )
}
