import type { User } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthGate, AuthProvider } from './auth.tsx'
import { ClanList } from './components/ClanList.tsx'
import { ClanScreen } from './components/ClanScreen.tsx'
import { PlatformScreen } from './components/PlatformScreen.tsx'
import { TreeScreen } from './components/TreeScreen.tsx'
import { cloudStore, platformStore, type Directory } from './lib/cloudStore.ts'
import { messageFor } from './lib/messages.ts'
import { supabase } from './lib/supabase.ts'
import { ToastProvider, useBackToClose } from './ui/index.ts'

/** Ba tầng: danh sách dòng họ → các cuốn của dòng họ → một cuốn; thêm màn quản trị nền tảng. */
function Home({ user }: { user: User }) {
  const email = user.email ?? ''
  const cloud = useMemo(() => cloudStore(supabase!, user.id), [user.id])
  const platform = useMemo(() => platformStore(supabase!), [])
  const [dir, setDir] = useState<Directory | null>(null)
  const [dirError, setDirError] = useState<string | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [clanId, setClanId] = useState<string | null>(null)
  const [treeId, setTreeId] = useState<string | null>(null)
  const [showPlatform, setShowPlatform] = useState(false)

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
  useBackToClose(treeId !== null, closeTree)

  if (treeId) return <TreeScreen key={treeId} cloud={cloud} treeId={treeId} onBack={closeTree} />
  if (showPlatform) return <PlatformScreen platform={platform} email={email} onBack={() => setShowPlatform(false)} />
  if (clanId && dir) {
    return <ClanScreen cloud={cloud} email={email} dir={dir} clanId={clanId} onBack={() => setClanId(null)} onOpenTree={setTreeId} reload={() => void reload()} />
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
