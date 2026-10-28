import { ArrowLeft, Ban, Check, Clock, Copy, Eye, KeyRound, Link as LinkIcon, MailCheck, MoreHorizontal, Share2, Shield, TriangleAlert, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Role, TreeInfo } from '../lib/cloudStore.ts'
import { inviteUrl, type InviteLink, type Member, type MemberStore } from '../lib/memberStore.ts'
import { messageFor } from '../lib/messages.ts'
import { Badge, Button, ChoiceField, Dialog, ErrorText, GroupLabel, IconButton, OverflowMenu, PageHeader, Segmented, SelectField, Skeleton, Switch, TextField, TopBar, useToast } from '../ui/index.ts'
import { AccountMenu } from './AccountMenu.tsx'
import { pageClass, pagePad } from './ClanList.tsx'

// Màn Thành viên của quản trị dòng họ (change clan-invites, bản mẫu `mockup.html` mục A–D).

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const EMAIL_HINT = 'Email chưa đúng. Ví dụ: ten@gmail.com'
const CLAN_SCOPE = ''

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const roleLabel = (m: Pick<Member, 'role' | 'treeId'>) => (m.role === 'admin' ? (m.treeId ? 'Quản trị cuốn' : 'Quản trị') : 'Người xem')

/** Nhóm theo phạm vi: cả dòng họ trước, rồi từng cuốn theo tên. */
function groupByScope(members: Member[]): { key: string; title: string; items: Member[] }[] {
  const groups = new Map<string, { key: string; title: string; items: Member[] }>()
  for (const m of members) {
    const key = m.treeId ?? CLAN_SCOPE
    const g = groups.get(key) ?? { key, title: m.treeName ?? 'Cả dòng họ', items: [] }
    g.items.push(m)
    groups.set(key, g)
  }
  return [...groups.values()].sort((a, b) => (a.key === CLAN_SCOPE ? -1 : b.key === CLAN_SCOPE ? 1 : a.title.localeCompare(b.title, 'vi')))
}

function ScopeSelect({ trees, value, onChange }: { trees: TreeInfo[]; value: string; onChange: (v: string) => void }) {
  return (
    <SelectField label="Phạm vi" value={value} onChange={onChange} options={[{ value: CLAN_SCOPE, label: 'Cả dòng họ (mọi cuốn)' }, ...trees.map((t) => ({ value: t.id, label: t.name }))]} />
  )
}

function MemberRow({ m, onSetRole, onRemove }: { m: Member; onSetRole: (role: Role) => void; onRemove: () => void }) {
  const pending = m.kind === 'invite'
  const items = pending
    ? [{ label: 'Huỷ lời mời', icon: X, onSelect: onRemove }]
    : [
        m.role === 'admin' ? { label: 'Đổi thành người xem', icon: Eye, onSelect: () => onSetRole('viewer') } : { label: 'Đổi thành quản trị', icon: Shield, onSelect: () => onSetRole('admin') },
        { label: m.treeId ? 'Gỡ khỏi cuốn' : 'Gỡ khỏi dòng họ', icon: UserMinus, onSelect: onRemove },
      ]
  return (
    <li className="flex min-h-16 items-center gap-3 py-2 pl-4 pr-1" data-testid="member-row">
      <span
        aria-hidden
        className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${pending ? 'border-[1.5px] border-dashed border-line-input bg-surface text-ink-muted' : m.role === 'admin' ? 'bg-accent-soft text-accent' : 'bg-surface-muted text-ink-muted'}`}
      >
        {m.email[0]?.toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {m.email}
          {m.isMe && <span className="font-normal text-ink-muted"> (bạn)</span>}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted md:hidden">
          {roleLabel(m)}
          {pending && ' · chờ đăng nhập'}
        </p>
        {pending && (
          <p className="hidden items-center gap-1 text-sm text-ink-muted md:flex">
            <Clock aria-hidden size={14} />
            Chờ đăng nhập lần đầu
          </p>
        )}
      </div>
      <Badge tone={m.role === 'admin' ? 'accent' : 'neutral'} icon={m.role === 'admin' ? Shield : Eye} className="max-md:hidden">
        {roleLabel(m)}
      </Badge>
      <OverflowMenu trigger={(p) => <IconButton icon={MoreHorizontal} label={`Thao tác với ${m.email}`} {...p} />} items={items} />
    </li>
  )
}

function LinkCard({ link, onRevoke }: { link: InviteLink; onRevoke: () => void }) {
  const ms = new Date(link.expiresAt).getTime() - Date.now()
  const left = ms > 86_400_000 ? `còn ${Math.ceil(ms / 86_400_000)} ngày` : `còn ${Math.max(1, Math.ceil(ms / 3_600_000))} giờ`
  const locked = link.lockedUntil && new Date(link.lockedUntil).getTime() > Date.now()
  return (
    <li className="rounded-xl bg-surface p-4 shadow-1 ring-1 ring-line/60" data-testid="link-card">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <LinkIcon size={20} strokeWidth={1.85} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{link.treeName ?? 'Cả dòng họ'}</p>
          <p className="text-sm text-ink-muted">Hết hạn: {left}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge icon={Users}>{link.acceptedCount} người đã nhận</Badge>
        {link.hasCode && (
          <Badge tone="accent" icon={KeyRound}>
            Có mã mời
          </Badge>
        )}
        {locked && (
          <Badge tone="danger">Tạm khoá đến {new Date(link.lockedUntil!).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Badge>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <Button variant="danger" icon={Ban} onClick={onRevoke}>
          Thu hồi
        </Button>
      </div>
    </li>
  )
}

/** Danh sách thành viên và link mời; chỉ quản trị dòng họ tới được màn này (cơ sở dữ liệu cưỡng chế). */
export function MembersScreen({
  members: store,
  clanId,
  clanName,
  trees,
  email,
  hideBack = false,
  onBack,
  onChanged,
}: {
  members: MemberStore
  clanId: string
  clanName: string
  trees: TreeInfo[]
  email: string
  hideBack?: boolean
  onBack: () => void
  /** Số thành viên trên trang nhà đổi theo. */
  onChanged: () => void
}) {
  const [tab, setTab] = useState<'members' | 'links'>('members')
  const [members, setMembers] = useState<Member[] | null>(null)
  const [links, setLinks] = useState<InviteLink[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'invite' | 'link' | null>(null)
  const toast = useToast()

  const load = useCallback(async () => {
    const [m, l] = await Promise.all([store.list(clanId), store.links(clanId)])
    if (!m.ok) return setError(messageFor(m.error))
    if (!l.ok) return setError(messageFor(l.error))
    setError(null)
    setMembers(m.value)
    setLinks(l.value)
  }, [store, clanId])
  useEffect(() => {
    void load()
  }, [load])

  const run = async (r: Promise<{ ok: true } | { ok: false; error: Parameters<typeof messageFor>[0] }>, done: string) => {
    const out = await r
    if (!out.ok) return toast(messageFor(out.error))
    toast(done)
    onChanged()
    void load()
  }

  const setRole = (m: Member, role: Role) => {
    if (role === 'viewer' && !window.confirm(m.isMe ? 'Bạn sẽ không còn sửa được dòng họ này. Tiếp tục?' : `Hạ ${m.email} xuống người xem?`)) return
    void run(store.setRole(m.id, role), role === 'admin' ? `${m.email} là quản trị` : `${m.email} là người xem`)
  }
  const remove = (m: Member) => {
    if (m.kind === 'invite') return void run(store.cancelInvite(m.id), `Đã huỷ lời mời ${m.email}`)
    if (!window.confirm(`Gỡ ${m.email}? Người này sẽ không còn xem được ${m.treeName ?? 'dòng họ'}.`)) return
    void run(store.remove(m.id), `Đã gỡ ${m.email}`)
  }
  const revoke = (l: InviteLink) => {
    if (!window.confirm('Thu hồi link này? Người chưa nhận sẽ không dùng được nữa.')) return
    void run(store.revokeLink(l.id), 'Đã thu hồi link')
  }

  const people = members?.filter((m) => m.kind === 'member').length ?? 0
  const waiting = members?.filter((m) => m.kind === 'invite').length ?? 0
  const primary =
    tab === 'members' ? (
      <Button variant="primary" icon={UserPlus} onClick={() => setDialog('invite')}>
        Mời người
      </Button>
    ) : (
      <Button variant="primary" icon={LinkIcon} onClick={() => setDialog('link')}>
        Tạo link mời
      </Button>
    )

  return (
    <>
      {!hideBack && (
        <TopBar>
          <IconButton icon={ArrowLeft} label="Về trang dòng họ" onClick={onBack} />
          <span className="flex-1" />
          <AccountMenu email={email} />
        </TopBar>
      )}
      <main className={pageClass} style={pagePad}>
        <PageHeader title="Thành viên" subtitle={members ? `${clanName} · ${people} người${waiting ? ` · ${waiting} lời mời đang chờ` : ''}` : clanName} action={primary} />
        <Segmented
          label="Xem"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'members', label: `Thành viên${members ? ` ${members.length}` : ''}`, icon: Users },
            { value: 'links', label: `Link mời${links ? ` ${links.length}` : ''}`, icon: LinkIcon },
          ]}
        />
        {error ? (
          <ErrorText>{error}</ErrorText>
        ) : !members || !links ? (
          <Skeleton lines={3} />
        ) : tab === 'members' ? (
          groupByScope(members).map((g) => (
            <section key={g.key} aria-label={g.title}>
              <GroupLabel>
                {g.title} · {g.items.length}
              </GroupLabel>
              <ul className="divide-y divide-line rounded-xl bg-surface shadow-1 ring-1 ring-line/60">
                {g.items.map((m) => (
                  <MemberRow key={m.id} m={m} onSetRole={(r) => setRole(m, r)} onRemove={() => remove(m)} />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <>
            <p className="flex items-start gap-2.5 rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">
              <Eye aria-hidden size={18} className="mt-0.5 shrink-0" />
              <span>
                Link mời chỉ cấp quyền <strong className="text-ink">xem</strong>. Muốn thêm quản trị, hãy dùng "Mời người" bằng email.
              </span>
            </p>
            {links.length === 0 ? (
              <p className="text-ink-muted">Chưa có link nào đang hiệu lực.</p>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {links.map((l) => (
                  <LinkCard key={l.id} link={l} onRevoke={() => revoke(l)} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
      {dialog === 'invite' && (
        <InviteDialog
          store={store}
          clanId={clanId}
          clanName={clanName}
          trees={trees}
          onClose={() => setDialog(null)}
          onDone={() => {
            onChanged()
            void load()
          }}
        />
      )}
      {dialog === 'link' && <LinkDialog store={store} clanId={clanId} trees={trees} onClose={() => setDialog(null)} onDone={() => void load()} />}
    </>
  )
}

function RoleChoice({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  const opts: { value: Role; label: string; text: string; icon: typeof Eye }[] = [
    { value: 'viewer', label: 'Người xem', text: 'Xem cây và hồ sơ, không sửa.', icon: Eye },
    { value: 'admin', label: 'Quản trị', text: 'Thêm, sửa người; mời người khác.', icon: Shield },
  ]
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">Vai trò</legend>
      <div className="grid gap-2 md:grid-cols-2">
        {opts.map((o) => {
          const on = o.value === value
          const Icon = o.icon
          return (
            <label key={o.value} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-3.5 ring-inset ${on ? 'bg-accent-soft/50 ring-2 ring-accent' : 'ring-1 ring-line hover:bg-surface-muted'}`}>
              <input type="radio" name="role" value={o.value} checked={on} onChange={() => onChange(o.value)} className="sr-only" />
              <Icon aria-hidden size={18} className={`mt-0.5 ${on ? 'text-accent' : 'text-ink-muted'}`} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{o.label}</span>
                <span className="block text-sm text-ink-muted">{o.text}</span>
              </span>
              <span aria-hidden className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${on ? 'bg-accent text-white' : 'ring-[1.5px] ring-line-input'}`}>
                {on && <Check size={13} strokeWidth={3} />}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Mời bằng email; không gửi thư, sau khi mời cho sao chép lời nhắn (design D7). */
function InviteDialog({ store, clanId, clanName, trees, onClose, onDone }: { store: MemberStore; clanId: string; clanName: string; trees: TreeInfo[]; onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [scope, setScope] = useState(CLAN_SCOPE)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<'added' | 'pending' | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const target = email.trim().toLowerCase()
  const scopeName = trees.find((t) => t.id === scope)?.name
  const message = `Chào bạn, mình đã mời bạn ${role === 'admin' ? 'cùng quản trị' : 'xem'} gia phả ${clanName}${scopeName ? ` (cuốn ${scopeName})` : ''} trên Kintree. Vào ${location.origin} và đăng nhập bằng email ${target} nhé.`

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(target)) {
      setError(EMAIL_HINT)
      ref.current?.focus()
      return
    }
    setBusy(true)
    const r = await store.invite(clanId, scope || null, target, role)
    setBusy(false)
    if (!r.ok) {
      setError(r.error === 'EMAIL_INVALID' ? EMAIL_HINT : messageFor(r.error))
      return
    }
    setResult(r.value)
    onDone()
  }

  if (result) {
    const who = role === 'admin' ? (scopeName ? 'quản trị cuốn ' + scopeName : 'quản trị') : 'người xem'
    return (
      <Dialog
        title={result === 'added' ? 'Đã thêm vào dòng họ' : 'Đã ghi lời mời'}
        onClose={onClose}
        footer={
          <>
            <Button icon={Copy} onClick={() => void copyText(message).then((ok) => toast(ok ? 'Đã sao chép lời nhắn' : 'Không sao chép được, hãy chọn chữ và sao chép tay'))}>
              Sao chép lời nhắn
            </Button>
            <Button variant="primary" onClick={onClose}>
              Xong
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span aria-hidden className="grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
            <MailCheck size={26} strokeWidth={1.75} />
          </span>
          <p className="text-ink-muted" data-testid="invite-result">
            {result === 'added' ? (
              <>
                <strong className="text-ink">{target}</strong> đã là <strong className="text-ink">{who}</strong> của {clanName}, vào được ngay.
              </>
            ) : (
              <>
                <strong className="text-ink">{target}</strong> chưa có tài khoản Kintree. Khi người ấy đăng nhập lần đầu bằng email này sẽ thành <strong className="text-ink">{who}</strong> của {clanName}.
              </>
            )}
          </p>
        </div>
        <p className="rounded-lg bg-surface-muted p-4 text-[15px] leading-relaxed">{message}</p>
        <p className="text-sm text-ink-muted">Kintree không gửi thư. Hãy gửi lời nhắn này cho người được mời qua Zalo, Messenger hay tin nhắn.</p>
      </Dialog>
    )
  }

  return (
    <Dialog
      title="Mời người vào dòng họ"
      onClose={onClose}
      dirty={email.trim() !== ''}
      footer={
        <>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="submit" form="invite-member" variant="primary" disabled={busy}>
            Mời
          </Button>
        </>
      }
    >
      <form id="invite-member" onSubmit={submit} className="space-y-5" noValidate>
        <TextField
          ref={ref}
          label="Email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoComplete="off"
          hint="Người được mời đăng nhập bằng đúng email này."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          autoFocus
        />
        <RoleChoice value={role} onChange={setRole} />
        <ScopeSelect trees={trees} value={scope} onChange={setScope} />
      </form>
    </Dialog>
  )
}

/** Tạo link mời xem; link chỉ hiện một lần (máy chủ chỉ giữ bản băm). */
function LinkDialog({ store, clanId, trees, onClose, onDone }: { store: MemberStore; clanId: string; trees: TreeInfo[]; onClose: () => void; onDone: () => void }) {
  const [scope, setScope] = useState(CLAN_SCOPE)
  const [days, setDays] = useState<'1' | '7' | '30'>('7')
  const [useCode, setUseCode] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const toast = useToast()
  const scopeName = trees.find((t) => t.id === scope)?.name ?? 'cả dòng họ'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (useCode && code.trim().length < 4) return setError(messageFor('CODE_TOO_SHORT'))
    setBusy(true)
    const r = await store.createLink(clanId, scope || null, Number(days) as 1 | 7 | 30, useCode ? code.trim() : null)
    setBusy(false)
    if (!r.ok) return setError(messageFor(r.error))
    setUrl(inviteUrl(location.origin, r.value))
    onDone()
  }

  if (url) {
    const share = typeof navigator.share === 'function'
    return (
      <Dialog
        title="Link đã sẵn sàng"
        onClose={onClose}
        footer={
          <>
            {share && (
              <Button icon={Share2} onClick={() => void navigator.share({ title: 'Lời mời xem gia phả', url }).catch(() => {})}>
                Chia sẻ
              </Button>
            )}
            <Button onClick={onClose}>Xong</Button>
          </>
        }
      >
        <p className="text-ink-muted">
          Xem <strong className="text-ink">{scopeName}</strong> · hết hạn sau {days} ngày{useCode ? ' · có mã mời' : ''}
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-surface-muted p-1.5 pl-4">
          <span className="min-w-0 flex-1 truncate font-mono text-sm" data-testid="invite-url">
            {url}
          </span>
          <Button variant="primary" icon={Copy} onClick={() => void copyText(url).then((ok) => toast(ok ? 'Đã sao chép link' : 'Không sao chép được, hãy chọn chữ và sao chép tay'))}>
            Sao chép
          </Button>
        </div>
        <p className="flex items-start gap-2 rounded-lg bg-[#FFF7E6] p-3 text-sm text-[#7A4B00]">
          <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0" />
          Link chỉ hiện lần này. Đóng hộp thoại là không xem lại được; mất link thì tạo link mới.
        </p>
        {useCode && <p className="text-sm text-ink-muted">Gửi mã mời riêng, đừng gửi cùng tin nhắn với link.</p>}
      </Dialog>
    )
  }

  return (
    <Dialog
      title="Tạo link mời xem"
      onClose={onClose}
      dirty={code.trim() !== ''}
      footer={
        <>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="submit" form="create-link" variant="primary" disabled={busy}>
            Tạo link
          </Button>
        </>
      }
    >
      <form id="create-link" onSubmit={submit} className="space-y-5" noValidate>
        <ScopeSelect trees={trees} value={scope} onChange={setScope} />
        <ChoiceField
          label="Hạn dùng"
          value={days}
          onChange={(v) => setDays(v as '1' | '7' | '30')}
          options={[
            { value: '1', label: '1 ngày' },
            { value: '7', label: '7 ngày' },
            { value: '30', label: '30 ngày' },
          ]}
        />
        <Switch
          label="Đặt mã mời"
          description="Người mở link phải nhập đúng mã"
          checked={useCode}
          onChange={(on) => {
            setUseCode(on)
            setError(null)
          }}
        />
        {useCode && (
          <TextField
            label="Mã mời"
            hint="Ít nhất 4 ký tự. Sai 5 lần thì link khoá 15 phút."
            value={code}
            autoComplete="off"
            onChange={(e) => setCode(e.target.value)}
            error={error}
            autoFocus
          />
        )}
        {!useCode && error && <ErrorText>{error}</ErrorText>}
        <p className="flex items-center gap-2 rounded-lg bg-surface-muted px-4 py-3 text-sm text-ink-muted">
          <Eye aria-hidden size={18} />
          Link chỉ cấp quyền xem.
        </p>
      </form>
    </Dialog>
  )
}
