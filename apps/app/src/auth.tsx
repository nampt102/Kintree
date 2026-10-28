import type { Session, User } from '@supabase/supabase-js'
import { Mail, MailOpen, TreeDeciduous } from 'lucide-react'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { pendingInvite } from './lib/memberStore.ts'
import { googleEnabled, supabase } from './lib/supabase.ts'
import { Button, Skeleton, TextField } from './ui/index.ts'

type AuthState = { status: 'loading' } | { status: 'out' } | { status: 'in'; user: User }

const AuthContext = createContext<{ state: AuthState; signOut: () => Promise<void> }>({ state: { status: 'loading' }, signOut: async () => {} })
export const useAuth = () => useContext(AuthContext)

const fromSession = (s: Session | null): AuthState => (s ? { status: 'in', user: s.user } : { status: 'out' })

/** Theo dõi phiên đăng nhập của Supabase (token phiên nằm trong localStorage của SDK; nội dung cây thì không). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    if (!supabase) return setState({ status: 'out' })
    void supabase.auth.getSession().then(({ data }) => setState(fromSession(data.session)))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState(fromSession(session)))
    return () => data.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase?.auth.signOut()
    setState({ status: 'out' })
  }
  return <AuthContext.Provider value={{ state, signOut }}>{children}</AuthContext.Provider>
}

/** Chưa có phiên thì chỉ dựng màn đăng nhập: không màn dữ liệu nào được dựng hay tải (spec "Cổng đăng nhập"). */
export function AuthGate({ children }: { children: (user: User) => ReactNode }) {
  const { state } = useAuth()
  if (!supabase) return <ConfigMissing />
  if (state.status === 'loading') return <Skeleton lines={2} />
  if (state.status === 'out') return <LoginScreen />
  return <>{children(state.user)}</>
}

function ConfigMissing() {
  return (
    <main className="mx-auto max-w-md space-y-3 p-6">
      <h1 className="text-xl font-semibold">Chưa cấu hình máy chủ</h1>
      <p>
        Ứng dụng cần Supabase. Chạy <code>pnpm db:start</code> rồi <code>pnpm db:env</code> (ghi <code>apps/app/.env.local</code>) và khởi động lại.
      </p>
    </main>
  )
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const RESEND_SECONDS = 30

function otpMessage(error: { message: string; status?: number }): string {
  if (error.status === 429 || /rate limit|too many/i.test(error.message)) return 'Bạn thử quá nhiều lần. Hãy đợi một lúc rồi thử lại.'
  if (/expired|invalid/i.test(error.message)) return 'Mã không đúng hoặc đã hết hạn. Hãy nhập lại hoặc gửi mã mới.'
  if (/fetch|network/i.test(error.message)) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'
  return 'Không thực hiện được. Hãy thử lại.'
}

function LoginScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [hasInvite] = useState(() => pendingInvite(sessionStorage) !== null)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Hạn khoá nút gửi lại tính theo giờ thật (không đếm lùi từng giây) nên tab nền hay đồng hồ giả vẫn đúng.
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const cooldown = Math.max(0, Math.ceil((until - now) / 1000))
  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (until <= Date.now()) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [until])

  async function send(e?: React.FormEvent) {
    e?.preventDefault()
    const value = email.trim()
    if (!EMAIL.test(value)) {
      setError('Email chưa đúng. Ví dụ: ten@gmail.com')
      emailRef.current?.focus()
      return
    }
    setBusy(true)
    setError(null)
    const { error: err } = await supabase!.auth.signInWithOtp({ email: value, options: { shouldCreateUser: true } })
    setBusy(false)
    if (err) {
      setError(otpMessage(err))
      emailRef.current?.focus()
      return
    }
    setEmail(value)
    setCode('')
    setNow(Date.now())
    setUntil(Date.now() + RESEND_SECONDS * 1000)
    setStep('code')
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Mã gồm 6 chữ số.')
      codeRef.current?.focus()
      return
    }
    setBusy(true)
    setError(null)
    const { error: err } = await supabase!.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    setBusy(false)
    if (err) {
      setError(otpMessage(err))
      codeRef.current?.focus()
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-canvas">
      {/* Hoạ tiết cây nhạt phía trên (trang trí). */}
      <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[340px] w-full max-w-xl" viewBox="0 0 390 340" fill="none" preserveAspectRatio="xMidYMin slice">
        <defs>
          <linearGradient id="kt-login-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3ece6" />
            <stop offset="1" stopColor="#faf8f5" />
          </linearGradient>
        </defs>
        <rect width="390" height="340" fill="url(#kt-login-bg)" />
        <g stroke="#e0d3c9" strokeWidth="1.2">
          <path d="M195 290 V200 M195 200 C195 170 150 160 120 140 M195 200 C195 170 240 160 270 140 M120 140 C110 120 90 110 70 100 M120 140 C125 118 135 105 150 90 M270 140 C260 118 250 105 240 90 M270 140 C285 120 305 110 325 102" />
        </g>
        <g fill="#e0d3c9">
          <circle cx="70" cy="100" r="5" />
          <circle cx="150" cy="90" r="5" />
          <circle cx="240" cy="90" r="5" />
          <circle cx="325" cy="102" r="5" />
          <circle cx="120" cy="140" r="5" />
          <circle cx="270" cy="140" r="5" />
          <circle cx="195" cy="200" r="6" fill="var(--color-accent)" opacity="0.35" />
        </g>
      </svg>
      <main
        className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-7 py-10"
        style={{ paddingLeft: 'max(1.25rem, env(safe-area-inset-left))', paddingRight: 'max(1.25rem, env(safe-area-inset-right))' }}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="grid size-11 place-items-center rounded-xl bg-accent text-white shadow-pill">
              <TreeDeciduous size={22} strokeWidth={2} />
            </span>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-accent">Kintree</h1>
          </div>
          <p className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">
            Gia phả của dòng họ,
            <br />
            gìn giữ cho đời sau
          </p>
          <p className="text-ink-muted">Đăng nhập để xem và cùng gìn giữ gia phả.</p>
        </div>

        {/* Có link mời đang chờ: nhắc đăng nhập; không có tên dòng họ vì xem trước link cần đã đăng nhập (design D6). */}
        {hasInvite && (
          <p data-testid="invite-hint" className="flex items-start gap-3 rounded-2xl bg-accent-soft p-4 font-medium text-accent">
            <MailOpen aria-hidden size={20} strokeWidth={1.85} className="mt-0.5 shrink-0" />
            Bạn có lời mời vào một dòng họ. Đăng nhập để nhận lời mời.
          </p>
        )}

        <div className="rounded-2xl bg-surface p-5 shadow-2 ring-1 ring-line/60">
          {step === 'email' ? (
            <form onSubmit={send} className="space-y-4" noValidate>
              <TextField
                ref={emailRef}
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                placeholder="ten@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                autoFocus
              />
              <Button type="submit" variant="primary" icon={Mail} full disabled={busy}>
                Gửi mã đăng nhập
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4" noValidate>
              <p className="text-sm text-ink-muted">
                Đã gửi mã 6 số tới <strong className="text-ink">{email}</strong>.
              </p>
              <TextField
                ref={codeRef}
                label="Mã 6 số"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                error={error}
                autoFocus
                className="tabular text-center text-xl tracking-[0.4em]"
              />
              <Button type="submit" variant="primary" full disabled={busy}>
                Đăng nhập
              </Button>
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="ghost" disabled={cooldown > 0 || busy} onClick={() => void send()}>
                  {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : 'Gửi lại mã'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep('email')
                    setError(null)
                  }}
                >
                  Đổi email
                </Button>
              </div>
            </form>
          )}

          {googleEnabled && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-ink-muted">
                <span className="h-px flex-1 bg-line" />
                hoặc
                <span className="h-px flex-1 bg-line" />
              </div>
              <Button full onClick={() => void supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })}>
                <svg aria-hidden width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
                  <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8z" />
                  <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.5 1.3L15 2.4A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
                </svg>
                Đăng nhập bằng Google
              </Button>
            </>
          )}
        </div>
        <p className="text-center text-xs text-ink-muted">Dữ liệu gia phả chỉ người được dòng họ cấp quyền mới xem được.</p>
      </main>
    </div>
  )
}
