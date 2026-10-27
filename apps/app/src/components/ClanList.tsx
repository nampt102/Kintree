import { ChevronRight, ShieldCheck, TreeDeciduous, Users } from 'lucide-react'
import type { Directory, Role } from '../lib/cloudStore.ts'
import { Button, EmptyState, ErrorText, Skeleton, TopBar } from '../ui/index.ts'
import { AccountMenu } from './AccountMenu.tsx'
import { REGION_LABEL } from './TreeManage.tsx'

export const ROLE_LABEL: Record<Role, string> = { admin: 'Quản trị', viewer: 'Chỉ xem' }

export const rowClass =
  'flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md border border-line-strong bg-surface px-4 py-3 text-left transition-colors duration-100 hover:bg-surface-muted'
export const pageClass = 'mx-auto w-full max-w-2xl space-y-4 py-4'
export const pagePad = { paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }

/** Màn đầu sau đăng nhập: các dòng họ của người dùng. Không có nút tạo dòng họ (chỉ quản trị nền tảng tạo). */
export function ClanList({
  email,
  dir,
  error,
  isPlatformAdmin,
  onOpenClan,
  onOpenTree,
  onPlatform,
  onRetry,
}: {
  email: string
  dir: Directory | null
  error: string | null
  isPlatformAdmin: boolean
  onOpenClan: (id: string) => void
  onOpenTree: (clanId: string | null, treeId: string) => void
  onPlatform: () => void
  onRetry: () => void
}) {
  // Cuốn mà người dùng chỉ có vai trò ở tầng cuốn (không thấy được dòng họ chứa nó).
  const orphanTrees = dir ? dir.trees.filter((t) => !dir.clans.some((c) => c.id === t.clanId)) : []
  const noAccess = dir && dir.clans.length === 0 && orphanTrees.length === 0

  return (
    <>
      <TopBar>
        <h1 className="flex-1 px-2 text-xl font-semibold text-accent">Kintree</h1>
        {isPlatformAdmin && (
          <Button variant="ghost" icon={ShieldCheck} onClick={onPlatform}>
            Quản trị nền tảng
          </Button>
        )}
        <AccountMenu email={email} />
      </TopBar>
      <main className={pageClass} style={pagePad}>
        {error ? (
          <div className="space-y-3">
            <ErrorText>{error}</ErrorText>
            <Button onClick={onRetry}>Thử lại</Button>
          </div>
        ) : dir === null ? (
          <Skeleton lines={3} />
        ) : noAccess ? (
          isPlatformAdmin ? (
            <EmptyState icon={Users} title="Bạn chưa thuộc dòng họ nào" text="Dùng Quản trị nền tảng để tạo dòng họ và chỉ định người quản trị." />
          ) : (
            <EmptyState
              icon={Users}
              title="Bạn chưa được cấp quyền"
              text="Tài khoản này chưa thuộc dòng họ nào. Hãy liên hệ người quản trị dòng họ của bạn hoặc nhà vận hành Kintree để được thêm vào."
            />
          )
        ) : (
          <>
            {dir.clans.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Dòng họ của bạn</h2>
                <ul className="space-y-2">
                  {dir.clans.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => onOpenClan(c.id)} className={rowClass}>
                        <Users aria-hidden size={24} strokeWidth={1.75} className="shrink-0 text-accent" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{c.name}</span>
                          <span className="block text-sm text-ink-muted">{ROLE_LABEL[c.role]}</span>
                        </span>
                        <ChevronRight aria-hidden size={20} className="shrink-0 text-ink-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {orphanTrees.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Cuốn được chia sẻ</h2>
                <ul className="space-y-2">
                  {orphanTrees.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => onOpenTree(null, t.id)} className={rowClass}>
                        <TreeDeciduous aria-hidden size={24} strokeWidth={1.75} className="shrink-0 text-accent" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{t.name}</span>
                          <span className="block text-sm text-ink-muted">
                            {REGION_LABEL[t.region]} · {ROLE_LABEL[t.role]}
                          </span>
                        </span>
                        <ChevronRight aria-hidden size={20} className="shrink-0 text-ink-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </>
  )
}
