import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlatformClan, PlatformStore } from '../lib/cloudStore.ts'
import { messageFor } from '../lib/messages.ts'
import { Button, ErrorText, IconButton, Skeleton, TextField, TopBar, useToast } from '../ui/index.ts'
import { AccountMenu } from './AccountMenu.tsx'
import { pageClass, pagePad } from './ClanList.tsx'

const EMAIL_HINT = 'Email chưa đúng. Ví dụ: ten@gmail.com'
const NAME_HINT = 'Vui lòng nhập tên dòng họ.'

/** Màn của nhà vận hành: cấp dòng họ mới kèm email quản trị, và xem các dòng họ đã cấp. Không đọc được dữ liệu gia phả. */
export function PlatformScreen({ platform, email, onBack }: { platform: PlatformStore; email: string; onBack: () => void }) {
  const [clans, setClans] = useState<PlatformClan[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const load = useCallback(async () => {
    const r = await platform.listClans()
    if (r.ok) {
      setClans(r.value)
      setLoadError(null)
    } else setLoadError(messageFor(r.error))
  }, [platform])
  useEffect(() => {
    void load()
  }, [load])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setNameError(null)
    setEmailError(null)
    if (!name.trim()) {
      setNameError(NAME_HINT)
      nameRef.current?.focus()
      return
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail.trim())) {
      setEmailError(EMAIL_HINT)
      emailRef.current?.focus()
      return
    }
    setBusy(true)
    const r = await platform.createClan(name.trim(), adminEmail.trim())
    setBusy(false)
    if (!r.ok) {
      if (r.error === 'NAME_REQUIRED') setNameError(NAME_HINT)
      else if (r.error === 'EMAIL_INVALID') setEmailError(EMAIL_HINT)
      else setNameError(messageFor(r.error))
      return
    }
    toast(`Đã tạo dòng họ ${name.trim()}`)
    setName('')
    setAdminEmail('')
    void load()
  }

  return (
    <>
      <TopBar>
        <IconButton icon={ArrowLeft} label="Về danh sách dòng họ" onClick={onBack} />
        <h1 className="min-w-0 flex-1 truncate px-1 text-lg font-semibold">Quản trị nền tảng</h1>
        <AccountMenu email={email} />
      </TopBar>
      <main className={pageClass} style={pagePad}>
        <form onSubmit={submit} className="space-y-4 rounded-md border border-line bg-surface p-4" noValidate>
          <h2 className="text-xl font-semibold">Tạo dòng họ mới</h2>
          <TextField ref={nameRef} label="Tên dòng họ" hint="Ví dụ: Họ Nguyễn Văn" value={name} onChange={(e) => setName(e.target.value)} error={nameError} />
          <TextField
            ref={emailRef}
            label="Email người quản trị đầu tiên"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            error={emailError}
          />
          <Button type="submit" variant="primary" disabled={busy}>
            Tạo dòng họ
          </Button>
        </form>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Dòng họ đã cấp</h2>
          {loadError ? (
            <ErrorText>{loadError}</ErrorText>
          ) : clans === null ? (
            <Skeleton lines={2} />
          ) : clans.length === 0 ? (
            <p className="text-ink-muted">Chưa cấp dòng họ nào.</p>
          ) : (
            <ul className="space-y-2" data-testid="platform-clans">
              {clans.map((c) => (
                <li key={c.id} className="rounded-md border border-line-strong bg-surface px-4 py-3">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-ink-muted">
                    {c.slug} · {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                  <p className="text-sm">Quản trị: {c.adminEmails.join(', ') || '—'}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  )
}
