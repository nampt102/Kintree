import { ArrowLeft, MoreHorizontal, Pencil, Plus, Trash2, TreeDeciduous } from 'lucide-react'
import { useState } from 'react'
import type { CloudStore, Directory, TreeInfo } from '../lib/cloudStore.ts'
import { Badge, EmptyState, IconButton, OverflowMenu, TopBar } from '../ui/index.ts'
import { AccountMenu } from './AccountMenu.tsx'
import { pageClass, pagePad, ROLE_LABEL } from './ClanList.tsx'
import { CreateTreeDialog, DeleteTreeDialog, EditTreeInfoDialog, REGION_LABEL } from './TreeManage.tsx'

type Dialog = { kind: 'create' } | { kind: 'edit' | 'delete'; tree: TreeInfo } | null

/** Hình cây thu nhỏ trang trí trên thẻ cuốn (không phải dữ liệu thật). */
function MiniTree({ wide }: { wide: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 240 96" className="h-full w-full" fill="none">
      <g stroke="#cfc6bb" strokeWidth="1.5">
        <path d={wide ? 'M120 30 V48 H70 V64 M120 48 H170 V64' : 'M120 30 V64'} />
      </g>
      <g fill="#fff" stroke="#e2dbd2">
        <rect x="96" y="16" width="48" height="14" rx="5" />
        {wide ? (
          <>
            <rect x="46" y="64" width="48" height="14" rx="5" />
            <rect x="146" y="64" width="48" height="14" rx="5" />
          </>
        ) : (
          <rect x="96" y="64" width="48" height="14" rx="5" />
        )}
      </g>
    </svg>
  )
}

/** Trang nhà dòng họ: khối tiêu đề có số liệu, rồi các cuốn. Tạo cuốn chỉ với quản trị dòng họ; sửa/xoá cuốn chỉ với quản trị của cuốn ấy. */
export function ClanScreen({
  cloud,
  email,
  dir,
  clanId,
  hideBack = false,
  onBack,
  onOpenTree,
  onOpenMembers,
  reload,
}: {
  cloud: CloudStore
  email: string
  dir: Directory
  clanId: string
  /** Có thanh bên (màn rất rộng) thì không cần nút quay lại. */
  hideBack?: boolean
  onBack: () => void
  onOpenTree: (treeId: string) => void
  onOpenMembers: () => void
  reload: () => void
}) {
  const clan = dir.clans.find((c) => c.id === clanId)
  const trees = dir.trees.filter((t) => t.clanId === clanId)
  const [dialog, setDialog] = useState<Dialog>(null)
  const canCreate = clan?.role === 'admin'
  const people = trees.reduce((n, t) => n + t.personCount, 0)
  const done = () => {
    setDialog(null)
    reload()
  }

  const stats: { value: number; label: string; onClick?: () => void }[] = [
    { value: people, label: 'người' },
    { value: trees.length, label: 'cuốn gia phả' },
    ...(clan?.memberCount !== undefined ? [{ value: clan.memberCount, label: 'thành viên', onClick: onOpenMembers }] : []),
  ]

  return (
    <>
      {/* Có thanh bên thì nó đã có logo, dòng họ và tài khoản. */}
      {!hideBack && (
        <TopBar>
          <IconButton icon={ArrowLeft} label="Về danh sách dòng họ" onClick={onBack} />
          <span className="flex-1" />
          <AccountMenu email={email} />
        </TopBar>
      )}
      <main className={pageClass} style={pagePad}>
        <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(120deg,var(--color-accent),#7e1f1a)] px-6 py-7 text-white shadow-2 md:px-10 md:py-9">
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-6 h-56 w-56 opacity-[0.12]" viewBox="0 0 100 100" fill="none" stroke="#fff" strokeWidth="1.2">
            <path d="M50 92 V58 M50 58 C50 46 34 42 24 34 M50 58 C50 46 66 42 76 34 M24 34 C20 26 14 22 8 18 M24 34 C26 26 30 20 36 14 M76 34 C72 26 68 20 62 14 M76 34 C82 26 88 22 94 18" />
          </svg>
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/75">Dòng họ của bạn · {clan ? ROLE_LABEL[clan.role] : ''}</p>
              <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-[40px]">{clan?.name ?? 'Dòng họ'}</h1>
            </div>
            {canCreate && (
              <button
                type="button"
                data-variant="primary"
                onClick={() => setDialog({ kind: 'create' })}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-accent shadow-[0_8px_18px_-6px_rgb(0_0_0/0.35)] transition-transform duration-150 active:scale-[0.98]"
              >
                <Plus aria-hidden size={18} strokeWidth={2} />
                Tạo cuốn gia phả
              </button>
            )}
          </div>
          <dl className="relative mt-6 grid grid-cols-3 gap-2.5 md:grid-cols-4 md:gap-3">
            {stats.map((s) => (
              <div key={s.label} className="relative flex flex-col-reverse rounded-2xl bg-white/10 px-3 py-3 transition-colors duration-150 has-[button:hover]:bg-white/20 md:px-5 md:py-4">
                <dd className="tabular text-2xl font-semibold md:text-3xl">{s.value}</dd>
                <dt className="text-xs text-white/75 md:text-sm">{s.label}</dt>
                {s.onClick && (
                  // Cả ô là lối vào màn Thành viên của quản trị (vùng chạm = cả ô).
                  <button type="button" aria-label="Xem danh sách thành viên" onClick={s.onClick} className="absolute inset-0 cursor-pointer rounded-2xl" />
                )}
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">Các cuốn gia phả</h2>
          {trees.length === 0 ? (
            <EmptyState
              icon={TreeDeciduous}
              title="Chưa có cuốn gia phả nào"
              text={canCreate ? 'Mỗi chi hoặc nhánh của dòng họ là một cuốn. Bắt đầu bằng cuốn của chi nhà mình.' : 'Người quản trị dòng họ chưa tạo cuốn nào.'}
            />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {trees.map((t) => (
                <li key={t.id} className="relative overflow-hidden rounded-xl bg-surface shadow-1 ring-1 ring-line/60 transition-shadow duration-150 hover:shadow-2">
                  <button type="button" onClick={() => onOpenTree(t.id)} className="block w-full cursor-pointer text-left">
                    <span aria-hidden className="block h-24 bg-canvas [background-image:radial-gradient(#e5dfd7_1px,transparent_1px)] [background-size:18px_18px]">
                      <MiniTree wide={t.personCount > 2} />
                    </span>
                    <span className="block px-4 pb-4 pt-3 pr-14">
                      <span className="block truncate font-semibold">{t.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                        <span>
                          {REGION_LABEL[t.region]} · {t.personCount} người
                        </span>
                        <Badge tone={t.role === 'admin' ? 'accent' : 'neutral'}>{ROLE_LABEL[t.role]}</Badge>
                      </span>
                    </span>
                  </button>
                  {t.role === 'admin' && (
                    <div className="absolute bottom-3 right-2">
                      <OverflowMenu
                        trigger={(p) => <IconButton icon={MoreHorizontal} label={`Thêm cho cuốn ${t.name}`} {...p} />}
                        items={[
                          { label: 'Sửa thông tin cuốn', icon: Pencil, onSelect: () => setDialog({ kind: 'edit', tree: t }) },
                          { label: 'Xoá cuốn', icon: Trash2, danger: true, onSelect: () => setDialog({ kind: 'delete', tree: t }) },
                        ]}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      {dialog?.kind === 'create' && (
        <CreateTreeDialog
          cloud={cloud}
          clanId={clanId}
          onClose={() => setDialog(null)}
          onCreated={(id) => {
            done()
            onOpenTree(id)
          }}
        />
      )}
      {dialog?.kind === 'edit' && <EditTreeInfoDialog cloud={cloud} tree={dialog.tree} onClose={() => setDialog(null)} onSaved={done} />}
      {dialog?.kind === 'delete' && <DeleteTreeDialog cloud={cloud} tree={dialog.tree} onClose={() => setDialog(null)} onDeleted={done} />}
    </>
  )
}
