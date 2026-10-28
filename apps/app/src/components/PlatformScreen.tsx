import { ArrowLeft, Clock, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlatformClan, PlatformClanAdmin, PlatformStore } from '../lib/cloudStore.ts'
import { messageFor } from '../lib/messages.ts'
import { Button, CardButton, Dialog, ErrorText, GroupLabel, IconButton, Skeleton, TextField, TopBar, useToast } from '../ui/index.ts'
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
  const [open, setOpen] = useState<PlatformClan | null>(null)
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
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-surface p-5 shadow-1 ring-1 ring-line/60 md:p-6" noValidate>
          <h2 className="text-xl font-semibold tracking-[-0.01em]">Tạo dòng họ mới</h2>
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

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">Dòng họ đã cấp</h2>
          {loadError ? (
            <ErrorText>{loadError}</ErrorText>
          ) : clans === null ? (
            <Skeleton lines={2} />
          ) : clans.length === 0 ? (
            <p className="text-ink-muted">Chưa cấp dòng họ nào.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2" data-testid="platform-clans">
              {clans.map((c) => (
                <li key={c.id}>
                  <CardButton onClick={() => setOpen(c)} className="flex-col items-start gap-0 py-3.5">
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-sm text-ink-muted">
                      {c.slug} · {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="mt-1 text-sm">Quản trị: {c.adminEmails.join(', ') || '—'}</span>
                  </CardButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      {open && (
        <ClanAdminsDialog
          platform={platform}
          clan={open}
          onClose={() => {
            setOpen(null)
            void load()
          }}
        />
      )}
    </>
  )
}

/** Chi tiết một dòng họ cho quản trị nền tảng: chỉ quản trị cấp dòng họ, không có người xem (bản mẫu mục F). */
function ClanAdminsDialog({ platform, clan, onClose }: { platform: PlatformStore; clan: PlatformClan; onClose: () => void }) {
  const [admins, setAdmins] = useState<PlatformClanAdmin[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const load = useCallback(async () => {
    const r = await platform.listClanAdmins(clan.id)
    if (r.ok) setAdmins(r.value)
    else setError(messageFor(r.error))
  }, [platform, clan.id])
  useEffect(() => {
    void load()
  }, [load])

  // Chỉ quản trị đã vào mới giữ dòng họ; lời mời chờ không tính (design D4).
  const joined = admins?.filter((a) => a.kind === 'member').length ?? 0

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setEmailError(EMAIL_HINT)
      emailRef.current?.focus()
      return
    }
    setBusy(true)
    const r = await platform.addClanAdmin(clan.id, email.trim())
    setBusy(false)
    if (!r.ok) return setEmailError(r.error === 'EMAIL_INVALID' ? EMAIL_HINT : messageFor(r.error))
    toast(r.value === 'added' ? `${email.trim()} là quản trị của ${clan.name}` : `Đã ghi lời mời quản trị cho ${email.trim()}`)
    setEmail('')
    setEmailError(null)
    void load()
  }

  async function remove(a: PlatformClanAdmin) {
    if (a.kind === 'member' && !window.confirm(`Gỡ quyền quản trị của ${a.email} ở ${clan.name}?`)) return
    const r = await platform.removeClanAdmin(a)
    if (!r.ok) return toast(messageFor(r.error))
    toast(a.kind === 'member' ? `Đã gỡ ${a.email}` : `Đã huỷ lời mời ${a.email}`)
    void load()
  }

  return (
    <Dialog title={clan.name} onClose={onClose} dirty={email.trim() !== ''}>
      <p className="-mt-3 text-sm text-ink-muted">
        {clan.slug} · tạo {new Date(clan.createdAt).toLocaleDateString('vi-VN')}
      </p>
      {error ? (
        <ErrorText>{error}</ErrorText>
      ) : !admins ? (
        <Skeleton lines={2} />
      ) : (
        <section aria-label="Quản trị dòng họ">
          <GroupLabel>Quản trị dòng họ · {admins.length}</GroupLabel>
          <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
            {admins.map((a) => {
              const last = a.kind === 'member' && joined === 1
              return (
                <li key={a.id} className="flex min-h-16 items-center gap-3 py-2 pl-4 pr-1" data-testid="admin-row">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.email}</p>
                    {a.kind === 'invite' ? (
                      <p className="flex items-center gap-1 text-sm text-ink-muted">
                        <Clock aria-hidden size={14} />
                        Chờ đăng nhập
                      </p>
                    ) : (
                      last && <p className="text-sm text-ink-muted">Quản trị cuối · không gỡ được</p>
                    )}
                  </div>
                  <Button variant="danger" disabled={last} onClick={() => void remove(a)} aria-label={`${a.kind === 'invite' ? 'Huỷ lời mời' : 'Gỡ'} ${a.email}`}>
                    {a.kind === 'invite' ? 'Huỷ' : 'Gỡ'}
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      <form onSubmit={add} noValidate className="flex items-start gap-3 max-md:flex-col max-md:items-stretch">
        <div className="min-w-0 flex-1">
          <TextField
            ref={emailRef}
            label="Thêm quản trị bằng email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
          />
        </div>
        <Button type="submit" variant="primary" disabled={busy} className="md:mt-6">
          Thêm quản trị
        </Button>
      </form>
      <p className="flex items-start gap-2 text-sm text-ink-muted">
        <ShieldCheck aria-hidden size={16} className="mt-0.5 shrink-0" />
        Quản trị nền tảng chỉ thấy quản trị của dòng họ. Người xem do quản trị dòng họ tự mời.
      </p>
    </Dialog>
  )
}
