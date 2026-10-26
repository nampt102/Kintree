import { useMemo, useState } from 'react'
import { TreeList } from './components/TreeList.tsx'
import { TreeScreen } from './components/TreeScreen.tsx'
import { localStorageStore } from './lib/store.ts'
import { ToastProvider, useBackToClose } from './ui/index.ts'

function App() {
  const store = useMemo(() => localStorageStore(), [])
  const [openId, setOpenId] = useState<string | null>(null)
  // Back của trình duyệt / Android, vuốt quay lại trên iOS: từ một cuốn về danh sách cuốn.
  useBackToClose(openId !== null, () => setOpenId(null))

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-canvas">
        {openId ? (
          <TreeScreen key={openId} store={store} treeId={openId} onBack={() => setOpenId(null)} />
        ) : (
          <TreeList store={store} onOpen={setOpenId} />
        )}
      </div>
    </ToastProvider>
  )
}

export default App
