import { deserialize, serialize, type Region, type TreeDoc } from '@kintree/core'
import type { StoreError } from './messages.ts'

export type TreeSummary = { id: string; name: string; region: Region; updatedAt: string }

export type LoadResult = { ok: true; doc: TreeDoc } | { ok: false; error: StoreError | 'NOT_FOUND' }
export type SaveResult = { ok: true } | { ok: false; error: 'STORAGE_FULL' }

/** Giao diện lưu cây (design D1). Change đăng nhập sẽ thêm bản cài đặt Supabase, giao diện còn lại không đổi. */
export interface TreeStore {
  list(): Promise<TreeSummary[]>
  load(treeId: string): Promise<LoadResult>
  save(doc: TreeDoc): Promise<SaveResult>
}

const INDEX_KEY = 'kintree:index'
const docKey = (id: string) => `kintree:doc:${id}`

type KV = Pick<Storage, 'getItem' | 'setItem'>

function readIndex(kv: KV): TreeSummary[] {
  try {
    const raw = kv.getItem(INDEX_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as TreeSummary[]) : []
  } catch {
    return []
  }
}

/** Bản lưu bằng localStorage. Dữ liệu hỏng không bao giờ bị xoá hay ghi đè. */
export function localStorageStore(kv: KV = localStorage, now: () => string = () => new Date().toISOString()): TreeStore {
  return {
    async list() {
      return readIndex(kv)
    },
    async load(treeId) {
      const text = kv.getItem(docKey(treeId))
      if (text === null) return { ok: false, error: 'NOT_FOUND' }
      return deserialize(text)
    },
    async save(doc) {
      try {
        kv.setItem(docKey(doc.meta.id), serialize(doc))
        const rest = readIndex(kv).filter((t) => t.id !== doc.meta.id)
        const entry: TreeSummary = { id: doc.meta.id, name: doc.meta.name, region: doc.meta.region, updatedAt: now() }
        kv.setItem(INDEX_KEY, JSON.stringify([...rest, entry]))
        return { ok: true }
      } catch {
        return { ok: false, error: 'STORAGE_FULL' }
      }
    },
  }
}

/** Tên tệp bản sao: ten-cuon-gia-pha-2026-10-26.json */
export function backupFileName(doc: TreeDoc, date = new Date()): string {
  const slug = doc.meta.name
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'gia-pha'}-${date.toISOString().slice(0, 10)}.json`
}

function download(fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

/** Tải bản sao JSON (gồm cả người đã gỡ) về máy. */
export const downloadBackup = (doc: TreeDoc): void => download(backupFileName(doc), serialize(doc))

/** Tải nguyên văn dữ liệu đã lưu, kể cả khi không đọc được, để người dùng giữ bản của mình. */
export function downloadRaw(treeId: string, kv: KV = localStorage): boolean {
  const text = kv.getItem(docKey(treeId))
  if (text === null) return false
  download(`gia-pha-${treeId}-loi.json`, text)
  return true
}
