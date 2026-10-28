import type { User } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthGate, AuthProvider } from './auth.tsx'
import { AcceptInvite } from './components/AcceptInvite.tsx'
import { AppRail } from './components/AppRail.tsx'
import { ClanList } from './components/ClanList.tsx'
import { ClanScreen } from './components/ClanScreen.tsx'
import { MembersScreen } from './components/Members.tsx'
import { PlatformScreen } from './components/PlatformScreen.tsx'
import { CreateTreeDialog } from './components/TreeManage.tsx'
import { TreeScreen } from './components/TreeScreen.tsx'
import { cloudStore, platformStore, type Directory } from './lib/cloudStore.ts'
import { captureInvite, clearInvite, memberStore, pendingInvite } from './lib/memberStore.ts'
import { messageFor } from './lib/messages.ts'
import { supabase } from './lib/supabase.ts'
import { ToastProvider, useBackToClose, useMinWidth, useToast } from './ui/index.ts'

/** Ba tầng: danh sách dòng họ → các cuốn của dòng họ → một cuốn; thêm màn thành viên, quản trị nền tảng và nhận lời mời. */
function Home({ user }: { user: User }) {
  const email = user.email ?? ''
  const cloud = useMemo(() => cloudStore(supabase!, user.id), [user.id])
  const platform = useMemo(() => platformStore(supabase!), [])
  const members = useMemo(() => memberStore(supabase!), [])
  const toast = useToast()
  // Mã link mời cất từ lúc mở app (main.tsx), còn qua bước đăng nhập.
  const [invite, setInvite] = useState(() => pendingInvite(sessionStorage))
  const [showMembers, setShowMembers] = useState(false)
  // Dán link mời vào thẻ đang mở app: chỉ đổi hash, trang không tải lại nên main.tsx không chạy lại.
  useEffect(() => {
    const onHash = () => {
      captureInvite(location, sessionStorage, history)
      setInvite(pendingInvite(sessionStorage))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const [dir, setDir] = useState<Directory | null>(null)
  const [dirError, setDirError] = useState<string | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [clanId, setClanId] = useState<string | null>(null)
  const [treeId, setTreeId] = useState<string | null>(null)
  const [showPlatform, setShowPlatform] = useState(false)
  const [creating, setCreating] = useState(false)
  // Thanh bên chỉ ở màn rất rộng và khi đang ở trong một dòng họ (spec responsive-layout).
  const wide = useMinWidth(1200)

  const reload = useCallback(async () => {
    const r = await cloud.directory()
    if (r.ok) {
      setDir(r.value)
      setDirError(null)
    } else setDirError(messageFor(r.error))
  }, [cloud])

  useEffect(() => {
    void reload()
    void platform.isPlatformAdmin().then(setIsPlatformAdmin)
  }, [reload, platform])

  const closeTree = useCallback(() => {
    setTreeId(null)
    void reload()
  }, [reload])
  // Back của trình duyệt / Android, vuốt quay lại trên iOS: đóng từng tầng một.
  useBackToClose(showPlatform, () => setShowPlatform(false))
  useBackToClose(clanId !== null, () => setClanId(null))
  useBackToClose(showMembers, () => setShowMembers(false))
  useBackToClose(treeId !== null, closeTree)

  const rail = wide && clanId && dir && !showPlatform
  const withRail = (screen: React.ReactNode) =>
    rail ? (
      <div className="flex h-dvh">
        <AppRail
          email={email}
          dir={dir}
          clanId={clanId}
          treeId={treeId}
          membersOpen={showMembers && !treeId}
          onSwitchClan={() => {
            setTreeId(null)
            setShowMembers(false)
            setClanId(null)
          }}
          onOpenClan={() => {
            setShowMembers(false)
            closeTree()
          }}
          onOpenMembers={() => {
            setTreeId(null)
            setShowMembers(true)
          }}
          onOpenTree={(id) => {
            setShowMembers(false)
            setTreeId(id)
          }}
          onCreateTree={() => setCreating(true)}
        />
        <div className="min-w-0 flex-1 overflow-y-auto">{screen}</div>
        {creating && (
          <CreateTreeDialog
            cloud={cloud}
            clanId={clanId}
            onClose={() => setCreating(false)}
            onCreated={(id) => {
              setCreating(false)
              void reload()
              setTreeId(id)
            }}
          />
        )}
      </div>
    ) : (
      screen
    )

  const dropInvite = () => {
    clearInvite(sessionStorage)
    setInvite(null)
  }
  if (invite) {
    return (
      <AcceptInvite
        members={members}
        token={invite}
        onDismiss={dropInvite}
        onAccepted={(to) => {
          dropInvite()
          toast('Đã nhận lời mời')
          void reload().then(() => {
            setShowMembers(false)
            // Link một cuốn: người nhận không đọc được dòng họ, mở thẳng cuốn.
            setClanId(to.treeId ? null : to.clanId)
            setTreeId(to.treeId)
          })
        }}
      />
    )
  }
  if (treeId) return withRail(<TreeScreen key={treeId} cloud={cloud} treeId={treeId} onBack={closeTree} hideBack={!!rail} />)
  if (showPlatform) return <PlatformScreen platform={platform} email={email} onBack={() => setShowPlatform(false)} />
  const clan = dir?.clans.find((c) => c.id === clanId)
  if (showMembers && clanId && dir && clan?.role === 'admin') {
    return withRail(
      <MembersScreen
        members={members}
        clanId={clanId}
        clanName={clan.name}
        trees={dir.trees.filter((t) => t.clanId === clanId)}
        email={email}
        hideBack={!!rail}
        onBack={() => setShowMembers(false)}
        onChanged={() => void reload()}
      />,
    )
  }
  if (clanId && dir) {
    return withRail(
      <ClanScreen cloud={cloud} email={email} dir={dir} clanId={clanId} hideBack={!!rail} onBack={() => setClanId(null)} onOpenTree={setTreeId} onOpenMembers={() => setShowMembers(true)} reload={() => void reload()} />,
    )
  }
  return (
    <ClanList
      email={email}
      dir={dir}
      error={dirError}
      isPlatformAdmin={isPlatformAdmin}
      onOpenClan={setClanId}
      onOpenTree={(_clan, id) => setTreeId(id)}
      onPlatform={() => setShowPlatform(true)}
      onRetry={() => void reload()}
    />
  )
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <div className="min-h-dvh bg-canvas">
          {/* key theo người dùng: đổi/đăng xuất thì huỷ sạch state dòng họ và cuốn trong bộ nhớ. */}
          <AuthGate>{(user) => <Home key={user.id} user={user} />}</AuthGate>
        </div>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
