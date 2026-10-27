import type { EditError } from '@kintree/core'
import { describe, expect, test } from 'vitest'
import { MESSAGES, messageFor } from './messages.ts'
import { backupFileName } from './store.ts'
import { smallDoc } from './testDocs.ts'

describe('bản sao tải về', () => {
  test('tên tệp bản sao', () => {
    expect(backupFileName(smallDoc(), new Date('2026-10-26T10:00:00Z'))).toBe('chi-truong-2026-10-26.json')
  })
})

describe('bảng dịch mã lỗi', () => {
  test('mọi mã đều có câu tiếng Việt không rỗng', () => {
    for (const [code, text] of Object.entries(MESSAGES)) expect(text.trim().length, code).toBeGreaterThan(10)
  })

  test('mã lỗi của core đều có mặt', () => {
    const sample: EditError = 'HAS_CHILDREN'
    expect(messageFor(sample)).toContain('gỡ')
  })

  test('mã lỗi của kho (đăng nhập, quyền, mạng) đều có câu riêng', () => {
    for (const code of ['NOT_SIGNED_IN', 'FORBIDDEN', 'OFFLINE', 'LOAD_FAILED', 'SAVE_FAILED', 'TREE_NOT_FOUND'] as const) {
      expect(messageFor(code).length, code).toBeGreaterThan(10)
    }
  })
})
