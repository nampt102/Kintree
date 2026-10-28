import { CircleAlert, FileSearch, ImagePlus, Inbox, Image as ImageIcon, LoaderCircle, RotateCw, ShieldCheck, TriangleAlert, X, Check } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatPartialDate } from '../lib/format.ts'
import { messageFor } from '../lib/messages.ts'
import type { Anchor, Proposal } from '../lib/proposals.ts'
import { effectiveStatus, IMAGE_KIND_LABEL, isAcceptedImage, shrinkImage, type FieldSource, type ImageKind, type Source, type SourceStore } from '../lib/sourceStore.ts'
import { Badge, Button, ChoiceField, Dialog, ErrorText, IconButton, Segmented, TextField, useToast } from '../ui/index.ts'

// Ngăn Tư liệu, hộp đưa ảnh vào và hộp nguồn (change ai-image-proposals, bản mẫu `mockup.html` mục A, B, F).

export const FIELD_LABEL: Record<string, string> = {
  fullName: 'Họ tên',
  gender: 'Giới tính',
  birth: 'Ngày sinh',
  death: 'Ngày mất',
  birthPlace: 'Nơi sinh',
  burialPlace: 'Nơi an táng',
  biography: 'Tiểu sử',
}

/** Giá trị một trường dạng chữ để hiện (ngày thì định dạng, giới tính thì chữ). */
export function formatFieldValue(field: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return 'chưa ghi'
  if (field === 'birth' || field === 'death') return formatPartialDate(value as Parameters<typeof formatPartialDate>[0])
  if (field === 'gender') return ({ male: 'Nam', female: 'Nữ', unknown: 'Chưa rõ' } as Record<string, string>)[String(value)] ?? String(value)
  return String(value)
}

/** Tư liệu và đề xuất đang chờ của cuốn; tự làm mới mỗi 2 giây khi còn tư liệu đang đọc (không có Realtime). */
export function useSources(store: SourceStore, treeId: string, enabled: boolean) {
  const [sources, setSources] = useState<Source[]>([])
  const [pending, setPending] = useState<Proposal[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!enabled) return
    const [s, p] = await Promise.all([store.list(treeId), store.pending(treeId)])
    if (!s.ok) return setError(messageFor(s.error))
    if (!p.ok) return setError(messageFor(p.error))
    setError(null)
    setSources(s.value)
    setPending(p.value)
  }, [store, treeId, enabled])

  useEffect(() => {
    void load()
  }, [load])

  const busy = sources.some((s) => ['queued', 'processing'].includes(effectiveStatus(s)))
  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => void load(), 2000)
    return () => clearInterval(t)
  }, [busy, load])

  return { sources, pending, error, reload: load }
}

/** Ảnh nguồn có tô vùng chữ AI đọc được; phần ngoài vùng tối đi khi `dim`. */
export function AnchoredImage({ url, anchor, dim = true, className = '', alt, maxHeight }: { url: string | null; anchor: Anchor | null; dim?: boolean; className?: string; alt: string; maxHeight?: string }) {
  if (!url) return <div className={`grid place-items-center rounded-xl bg-surface-muted text-sm text-ink-muted ${className}`}>Đang tải ảnh…</div>
  return (
    <div className={`relative inline-block max-w-full overflow-hidden rounded-xl ${className}`}>
      <img src={url} alt={alt} className="block max-w-full" style={{ maxHeight: maxHeight ?? '100%' }} />
      {anchor && (
        <div
          aria-hidden
          data-testid="anchor-box"
          className={`absolute rounded-md border-[2.5px] border-accent bg-accent/10 ${dim ? 'shadow-[0_0_0_9999px_rgb(31_26_23/0.28)]' : ''}`}
          style={{ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%`, width: `${anchor.w * 100}%`, height: `${anchor.h * 100}%` }}
        />
      )}
    </div>
  )
}

/** Địa chỉ ảnh có hạn dùng của một tư liệu (null khi đang tải hoặc lỗi). */
export function useImageUrl(store: SourceStore, source: Pick<Source, 'clanId' | 'treeId' | 'id'> | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  const key = source ? `${source.clanId}/${source.treeId}/${source.id}` : null
  useEffect(() => {
    let alive = true
    setUrl(null)
    if (source) void store.imageUrl(source).then((r) => alive && setUrl(r.ok ? r.value : null))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, key])
  return url
}

function Thumb({ store, source }: { store: SourceStore; source: Source }) {
  const url = useImageUrl(store, source)
  return <span aria-hidden className="size-14 shrink-0 overflow-hidden rounded-xl bg-surface-muted">{url && <img src={url} alt="" className="size-full object-cover" />}</span>
}

const ago = (iso: string) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (min < 1) return 'vừa xong'
  if (min < 60) return `${min} phút trước`
  if (min < 1440) return `${Math.round(min / 60)} giờ trước`
  return `${Math.round(min / 1440)} ngày trước`
}

function SourceCard({ store, source, onRetry, onOpen }: { store: SourceStore; source: Source; onRetry: () => void; onOpen: () => void }) {
  const status = effectiveStatus(source)
  const label = source.title || IMAGE_KIND_LABEL[source.imageKind]
  return (
    <li className="rounded-xl bg-surface p-3 shadow-1 ring-1 ring-line/60" data-testid="source-card" data-status={status}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onOpen} disabled={status !== 'done' || source.proposalCount === 0} aria-label={`Xem đề xuất từ ${label}`} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default">
          <Thumb store={store} source={source} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{label}</span>
            <span className="block text-sm text-ink-muted">
              {IMAGE_KIND_LABEL[source.imageKind]} · {ago(source.createdAt)}
            </span>
          </span>
        </button>
        {status === 'done' && (
          <Badge tone="accent" icon={Check}>
            {source.proposalCount} đề xuất
          </Badge>
        )}
        {(status === 'queued' || status === 'processing') && (
          <Badge icon={LoaderCircle} className="[&>svg]:animate-spin">
            Đang đọc
          </Badge>
        )}
        {status === 'failed' && (
          <Badge tone="danger" icon={CircleAlert}>
            Đọc lỗi
          </Badge>
        )}
      </div>
      {status === 'failed' && (
        <div className="mt-2 space-y-1.5">
          <p className="text-sm text-ink-muted">{source.error ?? 'Đang đọc quá lâu, hãy thử lại.'}</p>
          <div className="flex justify-end">
            <Button icon={RotateCw} onClick={onRetry}>
              Đọc lại
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

/** Ngăn nổi hai tab: Đề xuất (mở màn duyệt) và Tư liệu. */
export function SourcesPanel({
  store,
  sources,
  pending,
  error,
  tab,
  setTab,
  onUpload,
  onReload,
  onReview,
  onClose,
}: {
  store: SourceStore
  sources: Source[]
  pending: Proposal[]
  error: string | null
  tab: 'proposals' | 'sources'
  setTab: (t: 'proposals' | 'sources') => void
  onUpload: () => void
  onReload: () => void
  onReview: (sourceId: string | null) => void
  onClose: () => void
}) {
  const toast = useToast()
  const bySource = (id: string) => pending.filter((p) => p.source_id === id).length
  const retry = async (s: Source) => {
    const r = await store.retry(s.id)
    if (!r.ok) toast(messageFor(r.error))
    onReload()
  }
  return (
    <aside aria-label="Tư liệu" className="absolute bottom-3 right-3 top-[5.25rem] z-[30] flex w-[384px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[24px] bg-surface shadow-3 ring-1 ring-line/60 max-md:inset-0 max-md:w-auto max-md:max-w-none max-md:rounded-none">
      <div className="flex items-center gap-2 px-5 pb-2 pt-4">
        <h2 className="flex-1 text-xl font-semibold">Tư liệu</h2>
        <IconButton icon={X} label="Đóng ngăn tư liệu" variant="secondary" onClick={onClose} />
      </div>
      <div className="px-5">
        <Segmented
          label="Đề xuất hay tư liệu"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'proposals', label: `Đề xuất ${pending.length}`, icon: Inbox },
            { value: 'sources', label: 'Tư liệu', icon: ImageIcon },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
        {error && <ErrorText>{error}</ErrorText>}
        {pending.some((p) => p.provider === 'mock') && (
          <p className="flex items-start gap-2 rounded-xl bg-[#fff7e6] p-3 text-sm text-[#7a4b00]">
            <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0" />
            Đang chạy bộ giả lập: kết quả đọc là dữ liệu mẫu cố định, không phải chữ trong ảnh.
          </p>
        )}
        {tab === 'sources' ? (
          <>
            <Button variant="primary" icon={ImagePlus} full onClick={onUpload}>
              Đưa ảnh vào
            </Button>
            {sources.length === 0 ? (
              <p className="text-ink-muted">Chưa có tư liệu nào. Chụp bia mộ hoặc trang phả cũ để AI đề xuất người và quan hệ.</p>
            ) : (
              <ul className="space-y-3">
                {sources.map((s) => (
                  <SourceCard key={s.id} store={store} source={s} onRetry={() => void retry(s)} onOpen={() => onReview(s.id)} />
                ))}
              </ul>
            )}
          </>
        ) : pending.length === 0 ? (
          <div className="grid place-items-center rounded-xl bg-surface-muted py-8 text-center">
            <span aria-hidden className="grid size-12 place-items-center rounded-full bg-[#e8f3ec] text-[#1f7a45]">
              <Check size={22} />
            </span>
            <p className="mt-2 font-semibold">Không có đề xuất nào chờ duyệt</p>
            <p className="px-6 text-sm text-ink-muted">Đưa ảnh vào ở tab Tư liệu để AI đọc.</p>
          </div>
        ) : (
          <>
            <Button variant="primary" full onClick={() => onReview(null)}>
              Duyệt {pending.length} đề xuất
            </Button>
            <ul className="space-y-2">
              {sources
                .filter((s) => bySource(s.id) > 0)
                .map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => onReview(s.id)} className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl bg-surface p-3 text-left shadow-1 ring-1 ring-line/60">
                      <Thumb store={store} source={s} />
                      <span className="min-w-0 flex-1 font-semibold">{s.title || IMAGE_KIND_LABEL[s.imageKind]}</span>
                      <Badge tone="accent">{bySource(s.id)} chờ</Badge>
                    </button>
                  </li>
                ))}
            </ul>
          </>
        )}
      </div>
    </aside>
  )
}

/** Đưa ảnh vào: chụp hoặc chọn tệp, loại tư liệu, tên gọi; thu nhỏ rồi tải lên và gọi AI. */
export function UploadDialog({ store, clanId, treeId, treeName, onClose, onDone }: { store: SourceStore; clanId: string; treeId: string; treeName: string; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [shrunk, setShrunk] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [kind, setKind] = useState<ImageKind>('grave')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const toast = useToast()

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  async function pick(f: File | undefined) {
    if (!f) return
    if (!isAcceptedImage(f.type)) {
      setError(messageFor('FILE_TYPE'))
      return
    }
    setError(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    try {
      setShrunk(await shrinkImage(f))
    } catch {
      setError('Không đọc được ảnh này. Hãy thử ảnh khác.')
      setFile(null)
      setPreview(null)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!shrunk) {
      setError('Hãy chụp hoặc chọn một ảnh.')
      return
    }
    setBusy(true)
    const r = await store.add({ clanId, treeId, kind, title, image: shrunk })
    setBusy(false)
    if (!r.ok) return setError(messageFor(r.error))
    toast('Đã đưa ảnh vào, AI đang đọc')
    onDone()
    onClose()
  }

  const size = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1000))} KB`)
  return (
    <Dialog
      title="Đưa ảnh vào"
      subtitle={treeName}
      onClose={onClose}
      dirty={file !== null}
      footer={
        <>
          {file && shrunk && <span className="mr-auto text-sm text-ink-muted">{size(file.size)} → {size(shrunk.size)} sau khi thu nhỏ</span>}
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="submit" form="upload-source" variant="primary" disabled={busy || !shrunk}>
            {busy ? 'Đang tải lên…' : 'Đưa vào và đọc'}
          </Button>
        </>
      }
    >
      <form id="upload-source" onSubmit={submit} className="space-y-5" noValidate>
        <div className="relative grid h-52 place-items-center overflow-hidden rounded-2xl bg-surface-muted">
          {preview ? <img src={preview} alt="Ảnh đã chọn" className="size-full object-contain" /> : <ImagePlus aria-hidden size={36} className="text-ink-muted" />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => camera.current?.click()}>Chụp ảnh</Button>
          <Button onClick={() => gallery.current?.click()}>Chọn từ máy</Button>
        </div>
        {/* Hai ô chọn tệp ẩn: một mở camera sau trên điện thoại, một mở thư viện/tệp. */}
        <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void pick(e.target.files?.[0])} />
        <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Chọn ảnh từ máy" className="sr-only" data-testid="image-file" tabIndex={-1} onChange={(e) => void pick(e.target.files?.[0])} />
        {error && <ErrorText>{error}</ErrorText>}
        <ChoiceField
          label="Loại tư liệu"
          value={kind}
          onChange={(v) => setKind(v as ImageKind)}
          options={(Object.keys(IMAGE_KIND_LABEL) as ImageKind[]).map((k) => ({ value: k, label: IMAGE_KIND_LABEL[k] }))}
        />
        <TextField label="Tên gọi (tuỳ chọn)" hint="Giúp nhớ ảnh này là gì khi duyệt đề xuất sau này." value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
        <p className="flex items-start gap-2 rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">
          <ShieldCheck aria-hidden size={18} className="mt-0.5 shrink-0" />
          Ảnh lưu riêng tư, chỉ người trong dòng họ thấy. AI chỉ đề xuất, bạn duyệt rồi mới vào cây.
        </p>
      </form>
    </Dialog>
  )
}

/** Dấu "nguồn" cạnh một trường trong bảng thông tin người (biểu tượng + chữ, không chỉ màu). */
export function SourceChip({ field, sources, onOpen }: { field: string; sources: FieldSource[]; onOpen: () => void }) {
  if (sources.length === 0) return null
  const conflict = new Set(sources.map((s) => JSON.stringify(s.value))).size > 1
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Nguồn của ${FIELD_LABEL[field] ?? field}`}
      className={`-my-2.5 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full px-2.5 text-xs font-semibold ${conflict ? 'bg-accent-soft text-accent' : 'bg-surface-muted text-ink-muted hover:bg-line'}`}
    >
      <FileSearch aria-hidden size={14} />
      {sources.length > 1 ? `${sources.length} nguồn` : 'nguồn'}
    </button>
  )
}

/** Hộp nguồn của một trường: mỗi nguồn là giá trị, ảnh có vùng, người duyệt; nguồn được chọn đứng đầu. */
export function SourceBoxDialog({ store, personName, field, sources, sourceList, onClose }: { store: SourceStore; personName: string; field: string; sources: FieldSource[]; sourceList: Source[]; onClose: () => void }) {
  const ordered = [...sources].sort((a, b) => Number(b.accepted) - Number(a.accepted))
  return (
    <Dialog title={`Nguồn: ${FIELD_LABEL[field] ?? field}`} subtitle={`${personName} · ${sources.length} nguồn`} onClose={onClose} footer={<Button onClick={onClose}>Đóng</Button>}>
      <ul className="space-y-4">
        {ordered.map((s) => (
          <SourceBoxItem key={s.id} store={store} item={s} source={sourceList.find((x) => x.id === s.sourceId) ?? null} />
        ))}
      </ul>
    </Dialog>
  )
}

function SourceBoxItem({ store, item, source }: { store: SourceStore; item: FieldSource; source: Source | null }) {
  const fallback = item.clanId && item.treeId ? { clanId: item.clanId, treeId: item.treeId, id: item.sourceId } : null
  const url = useImageUrl(store, source ?? fallback)
  return (
    <li data-testid="source-item" className={`rounded-2xl p-4 ${item.accepted ? 'bg-accent-soft/40 ring-2 ring-accent' : 'ring-1 ring-line'}`}>
      <div className="flex items-center gap-2">
        {item.accepted ? <Badge tone="accent" icon={Check}>Được chọn</Badge> : <Badge icon={X}>Không chọn</Badge>}
        <b className={`text-lg ${item.accepted ? '' : 'text-ink-muted'}`}>{formatFieldValue(item.field, item.value)}</b>
      </div>
      <AnchoredImage url={url} anchor={item.anchor} dim={false} alt={`Ảnh nguồn ${item.sourceTitle ?? ''}`} className="mt-3 max-h-44" />
      <p className="mt-2 text-sm text-ink-muted">
        {item.sourceTitle ?? (item.imageKind ? IMAGE_KIND_LABEL[item.imageKind] : 'Tư liệu')} · {item.accepted ? 'nhận' : 'bỏ'} {new Date(item.reviewedAt).toLocaleDateString('vi-VN')}
      </p>
      {item.note && (
        <p className="mt-1 rounded-lg bg-surface px-3 py-2 text-sm">
          <span className="text-ink-muted">Ghi chú:</span> {item.note}
        </p>
      )}
    </li>
  )
}
