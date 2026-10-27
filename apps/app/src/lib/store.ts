import { serialize, type TreeDoc } from '@kintree/core'

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
