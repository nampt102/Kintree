import { Ban, Eye, Hourglass, Landmark, Lock, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { LinkPeek, LinkStatus, MemberStore } from '../lib/memberStore.ts'
import { messageFor, type StoreError } from '../lib/messages.ts'
import { Badge, Button, ErrorText, Skeleton, TextField } from '../ui/index.ts'

// Màn nhận lời mời qua link (bản mẫu `mockup.html` mục E). Hiện sau khi đăng nhập, khi có mã link đang chờ.

const DEAD: Partial<Record<LinkStatus, { icon: LucideIcon; title: string; error: StoreError }>> = {
  invalid: { icon: Ban, title: 'Link không hợp lệ', error: 'LINK_INVALID' },
  expired: { icon: Hourglass, title: 'Link đã hết hạn', error: 'LINK_EXPIRED' },
  revoked: { icon: Ban, title: 'Link đã bị thu hồi', error: 'LINK_REVOKED' },
  locked: { icon: Lock, title: 'Link đang tạm khoá', error: 'LINK_LOCKED' },
}

export function AcceptInvite({
  members,
  token,
  onAccepted,
  onDismiss,
}: {
  members: MemberStore
  token: string
  onAccepted: (to: { clanId: string; treeId: string | null }) => void
  /** Bỏ qua hoặc link hỏng: xoá mã đang chờ rồi về trang chính. */
  onDismiss: () => void
}) {
  const [peek, setPeek] = useState<LinkPeek | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void members.peek(token).then((r) => (r.ok ? setPeek(r.value) : setLoadError(messageFor(r.error))))
  }, [members, token])

  async function accept(e: React.FormEvent) {
    e.preventDefault()
    if (peek?.hasCode && !code.trim()) {
      setError('Vui lòng nhập mã mời.')
      codeRef.current?.focus()
      return
    }
    setBusy(true)
    const r = await members.accept(token, peek?.hasCode ? code.trim() : null)
    setBusy(false)
    if (r.ok) return onAccepted(r.value)
    if (r.error === 'WRONG_CODE') {
      setError(messageFor('WRONG_CODE'))
      codeRef.current?.focus()
      return
    }
    // Link vừa hết hạn / bị khoá / thu hồi giữa chừng: chuyển sang màn báo lỗi tương ứng.
    const status = (Object.entries(DEAD).find(([, d]) => d.error === r.error)?.[0] as LinkStatus | undefined) ?? null
    if (status) setPeek({ status })
    else setError(messageFor(r.error))
  }

  const dead = peek ? DEAD[peek.status] : undefined
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      {loadError ? (
        <div className="space-y-4 text-center">
          <ErrorText>{loadError}</ErrorText>
          <Button onClick={onDismiss}>Về trang chính</Button>
        </div>
      ) : !peek ? (
        <Skeleton lines={2} />
      ) : dead ? (
        <section className="rounded-3xl bg-surface p-6 text-center shadow-2 ring-1 ring-line/60" aria-labelledby="invite-title">
          <span aria-hidden className={`mx-auto grid size-14 place-items-center rounded-2xl ${peek.status === 'locked' ? 'bg-danger-soft text-danger' : 'bg-surface-muted text-ink-muted'}`}>
            <dead.icon size={26} strokeWidth={1.75} />
          </span>
          <h1 id="invite-title" className="mt-4 text-xl font-semibold">
            {dead.title}
          </h1>
          <p className="mt-1 text-ink-muted">{messageFor(dead.error)}</p>
          <Button full className="mt-5" onClick={onDismiss}>
            Về trang chính
          </Button>
        </section>
      ) : (
        <form onSubmit={accept} noValidate className="rounded-3xl bg-surface p-6 text-center shadow-2 ring-1 ring-line/60" aria-labelledby="invite-title">
          <span aria-hidden className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Landmark size={28} strokeWidth={1.75} />
          </span>
          <p className="mt-4 text-sm font-medium text-ink-muted">Bạn được mời xem gia phả</p>
          <h1 id="invite-title" className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em]">
            {peek.clanName}
          </h1>
          {peek.treeName && <p className="mt-1 text-ink-muted">Cuốn: {peek.treeName}</p>}
          <Badge icon={Eye} className="mt-3">
            Người xem
          </Badge>
          {peek.hasCode && (
            <div className="mt-6 text-left">
              <TextField ref={codeRef} label="Mã mời" hint="Hỏi người gửi link để biết mã." autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} error={error} autoFocus />
            </div>
          )}
          {!peek.hasCode && error && (
            <div className="mt-4 text-left">
              <ErrorText>{error}</ErrorText>
            </div>
          )}
          <Button type="submit" variant="primary" full className="mt-6" disabled={busy}>
            Nhận lời mời
          </Button>
          <Button variant="ghost" full className="mt-1" onClick={onDismiss}>
            Bỏ qua
          </Button>
        </form>
      )}
    </main>
  )
}
