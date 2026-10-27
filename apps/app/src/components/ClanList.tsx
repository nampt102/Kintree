import { ChevronRight, Landmark, ShieldCheck, TreeDeciduous, Users } from 'lucide-react'
import type { Directory, Role } from '../lib/cloudStore.ts'
import { Button, CardButton, EmptyState, ErrorText, PageHeader, Skeleton, TopBar } from '../ui/index.ts'
import { AccountMenu } from './AccountMenu.tsx'
import { REGION_LABEL } from './TreeManage.tsx'

export const ROLE_LABEL: Record<Role, string> = { admin: 'Quản trị', viewer: 'Chỉ xem' }

export const pageClass = 'mx-auto w-full max-w-5xl space-y-6 py-6 md:py-8'
export const pagePad = { paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }

/** Logo chữ + biểu tượng cây (thanh trên, thanh bên). */
export function Brand() {
  return (
    <span className="flex items-center gap-2 px-2">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-accent text-white shadow-pill">
        <TreeDeciduous size={18} strokeWidth={2} />
      </span>
      <span className="text-lg font-semibold tracking-[-0.01em] text-accent">Kintree</span>
    </span>
  )
}

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
        <h1 className="flex-1">
          <Brand />
        </h1>
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
              <section className="space-y-4">
                <PageHeader title="Dòng họ của bạn" subtitle={`${dir.clans.length} dòng họ`} />
                <ul className="grid gap-3 md:grid-cols-2">
                  {dir.clans.map((c) => {
                    const trees = dir.trees.filter((t) => t.clanId === c.id).length
                    return (
                      <li key={c.id}>
                        <CardButton onClick={() => onOpenClan(c.id)}>
                          <span aria-hidden className={`grid size-12 shrink-0 place-items-center rounded-xl ${c.role === 'admin' ? 'bg-accent-soft text-accent' : 'bg-surface-muted text-ink-muted'}`}>
                            <Landmark size={22} strokeWidth={1.8} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{c.name}</span>
                            <span className="mt-0.5 block text-sm text-ink-muted">
                              {trees} cuốn · {ROLE_LABEL[c.role]}
                            </span>
                          </span>
                          <ChevronRight aria-hidden size={18} className="shrink-0 text-connector" />
                        </CardButton>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
            {orphanTrees.length > 0 && (
              <section className="space-y-4">
                <PageHeader title="Cuốn được chia sẻ" subtitle={`${orphanTrees.length} cuốn`} />
                <ul className="grid gap-3 md:grid-cols-2">
                  {orphanTrees.map((t) => (
                    <li key={t.id}>
                      <CardButton onClick={() => onOpenTree(null, t.id)}>
                        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                          <TreeDeciduous size={22} strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{t.name}</span>
                          <span className="mt-0.5 block text-sm text-ink-muted">
                            {REGION_LABEL[t.region]} · {t.personCount} người · {ROLE_LABEL[t.role]}
                          </span>
                        </span>
                        <ChevronRight aria-hidden size={18} className="shrink-0 text-connector" />
                      </CardButton>
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
