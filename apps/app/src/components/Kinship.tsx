import { findPerson, kinship, searchPersons, type Kinship, type TreeDoc } from '@kintree/core'
import { Check, Route, UserRoundCheck, X } from 'lucide-react'
import { useState } from 'react'
import { lifespan } from '../lib/format.ts'
import { Avatar, Button, Dialog, TextField } from '../ui/index.ts'

// "Tôi là ai", nhãn xưng hô và tra quan hệ (change kinship-terms, bản mẫu `mockup.html`).

/** Chọn một người trong cuốn: ô tìm tên và danh sách kết quả; đã chọn thì hiện người ấy kèm nút "Đổi". */
export function PersonPicker({ doc, label, value, onChange }: { doc: TreeDoc; label: string; value: string | null; onChange: (id: string | null) => void }) {
  const [query, setQuery] = useState('')
  const person = value ? findPerson(doc, value) : undefined
  if (person) {
    return (
      <div>
        <p className="text-sm font-medium">{label}</p>
        <div className="mt-1 flex min-h-12 items-center gap-3 rounded-xl px-3 ring-1 ring-line-input">
          <Avatar name={person.fullName} gender={person.gender} muted={person.death !== undefined} size={28} />
          <span className="min-w-0 flex-1 truncate font-medium">{person.fullName}</span>
          <button type="button" aria-label={`Đổi ${label.toLowerCase()}`} onClick={() => onChange(null)} className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted">
            <X aria-hidden size={18} />
          </button>
        </div>
      </div>
    )
  }
  const results = query.trim() ? searchPersons(doc, query).slice(0, 6) : []
  return (
    <div>
      <TextField label={label} placeholder="Gõ tên (không dấu cũng được)" value={query} onChange={(e) => setQuery(e.target.value)} type="search" />
      {results.length > 0 && (
        <ul aria-label={`Kết quả cho ${label.toLowerCase()}`} className="mt-2 divide-y divide-line overflow-hidden rounded-xl ring-1 ring-line">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(p.id)
                  setQuery('')
                }}
                className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 text-left hover:bg-surface-muted"
              >
                <Avatar name={p.fullName} gender={p.gender} muted={p.death !== undefined} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.fullName}</span>
                  <span className="block truncate text-xs text-ink-muted">{lifespan(p)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() !== '' && results.length === 0 && <p className="mt-2 text-sm text-ink-muted">Không tìm thấy ai.</p>}
    </div>
  )
}

/** Hộp "Bạn là ai?": chọn (hoặc đổi, bỏ) người của mình trong cuốn. */
export function SelfDialog({ doc, current, onPick, onClear, onClose }: { doc: TreeDoc; current: string | null; onPick: (id: string) => void; onClear: () => void; onClose: () => void }) {
  const [id, setId] = useState<string | null>(current)
  return (
    <Dialog
      title="Bạn là ai?"
      subtitle={doc.meta.name}
      onClose={onClose}
      footer={
        <>
          {current && (
            <Button variant="danger" onClick={onClear}>
              Bỏ lựa chọn
            </Button>
          )}
          <span className="flex-1" />
          <Button onClick={onClose}>Huỷ</Button>
          <Button variant="primary" icon={Check} disabled={!id} onClick={() => id && onPick(id)}>
            Chọn
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-ink-muted">Chọn tên của bạn để thấy bạn gọi mỗi người trong cuốn là gì. Chỉ bạn thấy lựa chọn này.</p>
      <PersonPicker doc={doc} label="Tên của bạn" value={id} onChange={setId} />
    </Dialog>
  )
}

/** Thẻ nhắc nhỏ khi chưa chọn "Tôi là ai". */
export function SelfPrompt({ onChoose, onSkip }: { onChoose: () => void; onSkip: () => void }) {
  return (
    <div role="region" aria-label="Bạn là ai trong cây này?" className="kt-glass flex flex-wrap items-center justify-end gap-2 rounded-3xl py-2 pl-4 pr-2">
      <p className="flex min-w-0 basis-full items-start gap-2 text-sm font-medium md:basis-0 md:flex-1 md:items-center">
        <UserRoundCheck aria-hidden size={18} className="mt-0.5 shrink-0 text-accent md:mt-0" />
        <span>Bạn là ai trong cây này? Chọn tên để thấy bạn gọi mỗi người là gì.</span>
      </p>
      <Button variant="primary" onClick={onChoose}>
        Chọn tên của tôi
      </Button>
      <Button onClick={onSkip}>Để sau</Button>
    </div>
  )
}

function TermCard({ who, term, known }: { who: string; term: string; known: boolean }) {
  return (
    <div className="rounded-xl bg-surface p-3 shadow-1">
      <p className="text-xs text-ink-muted">{who}</p>
      <p className={`text-xl font-semibold ${known ? 'text-accent' : ''}`}>{term}</p>
    </div>
  )
}

/** Kết quả quan hệ của hai người: đường quan hệ bằng chữ và từ gọi hai chiều (dùng ở hộp tra và có thể dùng ở bảng người). */
export function KinshipResult({ doc, aId, bId, selfIsA = false }: { doc: TreeDoc; aId: string; bId: string; selfIsA?: boolean }) {
  const a = findPerson(doc, aId)
  const b = findPerson(doc, bId)
  if (!a || !b) return null
  if (aId === bId) return <p className="rounded-xl bg-surface-muted p-4 text-sm text-ink-muted">Hãy chọn hai người khác nhau.</p>
  const k: Kinship = kinship(doc, aId, bId)
  if (!k.relation) return <p className="rounded-xl bg-surface-muted p-4 text-sm text-ink-muted">Hai người này chưa nối với nhau trong cuốn.</p>
  const first = (n: string) => n.trim().split(/\s+/).at(-1) ?? n
  const aName = selfIsA ? 'Bạn' : first(a.fullName)
  return (
    <div className="space-y-3 rounded-xl bg-surface-muted p-4" data-testid="kinship-result">
      <p className="text-sm text-ink-muted">
        {b.fullName} là <b className="text-ink">{k.description}</b> {selfIsA ? 'của bạn' : `của ${a.fullName}`}
      </p>
      {k.term.known ? (
        <div className="grid grid-cols-2 gap-3">
          <TermCard who={`${aName} gọi ${first(b.fullName)} là`} term={k.term.term} known />
          <TermCard who={`${first(b.fullName)} gọi ${selfIsA ? 'bạn' : first(a.fullName)} là`} term={k.reverse.term} known={k.reverse.known} />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-1">
          <Route aria-hidden size={20} className="shrink-0 text-ink-muted" />
          <div>
            <p className="text-lg font-semibold">Họ hàng xa</p>
            <p className="text-sm text-ink-muted">Quan hệ này chưa có cách gọi trong bảng, nên không đoán.</p>
          </div>
        </div>
      )}
    </div>
  )
}

/** Hộp "Tra quan hệ": hai người bất kỳ trong cuốn, không cần đã chọn "Tôi là ai". */
export function LookupDialog({ doc, selfId, onClose }: { doc: TreeDoc; selfId: string | null; onClose: () => void }) {
  const [a, setA] = useState<string | null>(selfId)
  const [b, setB] = useState<string | null>(null)
  return (
    <Dialog title="Tra quan hệ" subtitle={doc.meta.name} onClose={onClose} footer={<Button onClick={onClose}>Đóng</Button>}>
      <div className="space-y-4">
        <PersonPicker doc={doc} label="Người thứ nhất" value={a} onChange={setA} />
        <PersonPicker doc={doc} label="Người thứ hai" value={b} onChange={setB} />
        {a && b && <KinshipResult doc={doc} aId={a} bId={b} selfIsA={a === selfId} />}
      </div>
    </Dialog>
  )
}
