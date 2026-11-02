// Đặt lịch nhắc giỗ cho Supabase local (container DB gọi function qua mạng Docker). REMINDER_CRON_KEY lấy từ biến môi trường, không có thì từ supabase/.env (không in ra).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const url = process.env.REMINDER_URL ?? 'http://supabase_kong_kintree:8000/functions/v1/send-reminders'
import { existsSync } from 'node:fs'
const envFile = new URL('../supabase/.env', import.meta.url)
const key = process.env.REMINDER_CRON_KEY ?? (existsSync(envFile) ? (readFileSync(envFile, 'utf8').match(/^REMINDER_CRON_KEY=(.*)$/m)?.[1] ?? '').trim() : '')
const sql = readFileSync(new URL('../supabase/schedule-reminders.sql', import.meta.url), 'utf8')
const out = execFileSync('docker', ['exec', '-i', 'supabase_db_kintree', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-v', `url=${url}`, '-v', `key=${key}`], { input: sql, encoding: 'utf8' })
console.log(out.trim().split('\n').slice(-6).join('\n'))
