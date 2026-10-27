import { ArrowLeft, ChevronRight, MoreVertical, Pencil, Plus, Trash2, TreeDeciduous } from 'lucide-react'
import { useState } from 'react'
import type { CloudStore, Directory, TreeInfo } from '../lib/cloudStore.ts'
import { Button, EmptyState, IconButton, OverflowMenu, TopBar } from '../ui/index.ts'
import { AccountMenu } from './AccountMenu.tsx'
import { pageClass, pagePad, ROLE_LABEL, rowClass } from './ClanList.tsx'
import { CreateTreeDialog, DeleteTreeDialog, EditTreeInfoDialog, REGION_LABEL } from './TreeManage.tsx'

type Dialog = { kind: 'create' } | { kind: 'edit' | 'delete'; tree: TreeInfo } | null

/** Các cuốn của một dòng họ. Tạo cuốn chỉ hiện cho quản trị dòng họ; sửa/xoá cuốn chỉ hiện cho quản trị của cuốn ấy. */
export function ClanScreen({
  cloud,
  email,
  dir,
  clanId,
  onBack,
  onOpenTree,
  reload,
}: {
  cloud: CloudStore
  email: string
  dir: Directory
  clanId: string
  onBack: () => void
  onOpenTree: (treeId: string) => void
  reload: () => void
}) {
  const clan = dir.clans.find((c) => c.id === clanId)
  const trees = dir.trees.filter((t) => t.clanId === clanId)
  const [dialog, setDialog] = useState<Dialog>(null)
  const canCreate = clan?.role === 'admin'
  const done = () => {
    setDialog(null)
    reload()
  }
  const createButton = (
    <Button variant="primary" icon={Plus} onClick={() => setDialog({ kind: 'create' })}>
      Tạo cuốn gia phả
    </Button>
  )

  return (
    <>
      <TopBar>
        <IconButton icon={ArrowLeft} label="Về danh sách dòng họ" onClick={onBack} />
        <h1 className="min-w-0 flex-1 truncate px-1 text-lg font-semibold">{clan?.name ?? 'Dòng họ'}</h1>
        <AccountMenu email={email} />
      </TopBar>
      <main className={pageClass} style={pagePad}>
        {trees.length === 0 ? (
          <EmptyState
            icon={TreeDeciduous}
            title="Chưa có cuốn gia phả nào"
            text={canCreate ? 'Mỗi chi hoặc nhánh của dòng họ là một cuốn. Bắt đầu bằng cuốn của chi nhà mình.' : 'Người quản trị dòng họ chưa tạo cuốn nào.'}
            action={canCreate ? createButton : undefined}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Các cuốn gia phả</h2>
              {canCreate && createButton}
            </div>
            <ul className="space-y-2">
              {trees.map((t) => (
                <li key={t.id} className="flex items-center gap-1">
                  <button type="button" onClick={() => onOpenTree(t.id)} className={`${rowClass} flex-1`}>
                    <TreeDeciduous aria-hidden size={24} strokeWidth={1.75} className="shrink-0 text-accent" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{t.name}</span>
                      <span className="block text-sm text-ink-muted">
                        {REGION_LABEL[t.region]} · {ROLE_LABEL[t.role]}
                      </span>
                    </span>
                    <ChevronRight aria-hidden size={20} className="shrink-0 text-ink-muted" />
                  </button>
                  {t.role === 'admin' && (
                    <OverflowMenu
                      trigger={(p) => <IconButton icon={MoreVertical} label={`Thêm cho cuốn ${t.name}`} {...p} />}
                      items={[
                        { label: 'Sửa thông tin cuốn', icon: Pencil, onSelect: () => setDialog({ kind: 'edit', tree: t }) },
                        { label: 'Xoá cuốn', icon: Trash2, onSelect: () => setDialog({ kind: 'delete', tree: t }) },
                      ]}
                    />
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
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
