import { ChevronsUpDown, Landmark, LogOut, Network, Plus, Users } from 'lucide-react'
import { useAuth } from '../auth.tsx'
import type { Directory } from '../lib/cloudStore.ts'
import { Avatar } from '../ui/index.ts'
import { Brand, ROLE_LABEL } from './ClanList.tsx'

/**
 * Thanh bên cố định (màn rất rộng ≥ 1200 px, spec `responsive-layout`): dòng họ đang mở, các cuốn của nó
 * kèm số người (cuốn đang mở được làm nổi), tạo cuốn (quản trị dòng họ) và tài khoản.
 */
export function AppRail({
  email,
  dir,
  clanId,
  treeId,
  membersOpen,
  onSwitchClan,
  onOpenClan,
  onOpenMembers,
  onOpenTree,
  onCreateTree,
}: {
  email: string
  dir: Directory
  clanId: string
  treeId: string | null
  membersOpen: boolean
  onSwitchClan: () => void
  onOpenClan: () => void
  onOpenMembers: () => void
  onOpenTree: (id: string) => void
  onCreateTree: () => void
}) {
  const { signOut } = useAuth()
  const clan = dir.clans.find((c) => c.id === clanId)
  const trees = dir.trees.filter((t) => t.clanId === clanId)
  return (
    <nav aria-label="Điều hướng dòng họ" className="flex h-dvh w-[248px] shrink-0 flex-col bg-rail px-3 py-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <Brand />
      <button
        type="button"
        onClick={onSwitchClan}
        aria-label={`Đổi dòng họ (đang mở ${clan?.name ?? ''})`}
        className="mt-5 flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5 text-left shadow-1 ring-1 ring-line/60"
      >
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
          <Landmark size={17} strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight">{clan?.name}</span>
          <span className="block text-xs text-ink-muted">{clan ? ROLE_LABEL[clan.role] : ''}</span>
        </span>
        <ChevronsUpDown aria-hidden size={16} className="shrink-0 text-ink-muted" />
      </button>

      <button type="button" onClick={onOpenClan} className={`mt-4 min-h-11 cursor-pointer rounded-lg px-2 text-left text-xs font-semibold uppercase tracking-[0.07em] ${treeId || membersOpen ? 'text-ink-muted hover:text-ink' : 'text-accent'}`}>
        Cuốn gia phả
      </button>
      <ul className="mt-1 space-y-0.5">
        {trees.map((t) => {
          const on = t.id === treeId
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => onOpenTree(t.id)}
                className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[15px] transition-colors duration-100 ${
                  on ? 'bg-surface font-medium text-ink shadow-1' : 'text-ink-muted hover:bg-surface/60 hover:text-ink'
                }`}
              >
                <Network aria-hidden size={17} strokeWidth={1.9} className={on ? 'text-accent' : ''} />
                <span className="min-w-0 flex-1 truncate">{t.name}</span>
                <span className="tabular text-xs text-ink-muted">{t.personCount}</span>
              </button>
            </li>
          )
        })}
        {clan?.role === 'admin' && (
          <li>
            <button type="button" onClick={onCreateTree} className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[15px] text-accent hover:bg-surface/60">
              <Plus aria-hidden size={17} strokeWidth={2} />
              Thêm cuốn mới
            </button>
          </li>
        )}
      </ul>

      {clan?.role === 'admin' && (
        <>
          <p className="mt-5 px-2 text-xs font-semibold uppercase tracking-[0.07em] text-ink-muted">Dòng họ</p>
          <button
            type="button"
            aria-current={membersOpen ? 'page' : undefined}
            onClick={onOpenMembers}
            className={`mt-1 flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[15px] transition-colors duration-100 ${
              membersOpen ? 'bg-surface font-medium text-ink shadow-1' : 'text-ink-muted hover:bg-surface/60 hover:text-ink'
            }`}
          >
            <Users aria-hidden size={17} strokeWidth={1.9} className={membersOpen ? 'text-accent' : ''} />
            <span className="min-w-0 flex-1">Thành viên</span>
            {clan.memberCount !== undefined && <span className="tabular text-xs text-ink-muted">{clan.memberCount}</span>}
          </button>
        </>
      )}

      <div className="mt-auto flex items-center gap-2 rounded-xl px-1 pt-3">
        <Avatar name={email} size={32} />
        <span className="min-w-0 flex-1 truncate text-sm" title={email}>
          {email}
        </span>
        <button type="button" aria-label="Đăng xuất" title="Đăng xuất" onClick={() => void signOut()} className="grid size-11 cursor-pointer place-items-center rounded-full text-ink-muted hover:bg-surface">
          <LogOut aria-hidden size={18} />
        </button>
      </div>
    </nav>
  )
}
