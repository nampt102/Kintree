import { useMemo, useState } from 'react'
import { TreeList } from './components/TreeList.tsx'
import { TreeScreen } from './components/TreeScreen.tsx'
import { localStorageStore } from './lib/store.ts'

function App() {
  const store = useMemo(() => localStorageStore(), [])
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white px-4 py-3">
        <h1 className="text-2xl font-semibold text-seal">Kintree</h1>
      </header>
      <main>
        {openId ? (
          <TreeScreen store={store} treeId={openId} onBack={() => setOpenId(null)} />
        ) : (
          <TreeList store={store} onOpen={setOpenId} />
        )}
      </main>
    </div>
  )
}

export default App
