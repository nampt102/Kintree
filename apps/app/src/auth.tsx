import type { Session, User } from '@supabase/supabase-js'
import { Mail } from 'lucide-react'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
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
    <main
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 py-8"
      style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
    >
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-accent">Kintree</h1>
        <p className="text-ink-muted">Đăng nhập để xem và giữ gìn gia phả dòng họ.</p>
      </div>

      {step === 'email' ? (
        <form onSubmit={send} className="space-y-4" noValidate>
          <TextField
            ref={emailRef}
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            autoFocus
          />
          <Button type="submit" variant="primary" icon={Mail} block disabled={busy}>
            Gửi mã đăng nhập
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4" noValidate>
          <p>
            Đã gửi mã 6 số tới <strong>{email}</strong>.
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
          />
          <Button type="submit" variant="primary" block disabled={busy}>
            Đăng nhập
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button disabled={cooldown > 0 || busy} onClick={() => void send()}>
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
        <div className="space-y-2 border-t border-line pt-4">
          <Button block onClick={() => void supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })}>
            Đăng nhập bằng Google
          </Button>
        </div>
      )}
    </main>
  )
}
