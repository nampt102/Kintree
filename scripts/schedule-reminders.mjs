// Đặt lịch nhắc giỗ cho Supabase local (container DB gọi function qua mạng Docker). REMINDER_CRON_KEY lấy từ biến môi trường của lệnh, không đọc supabase/.env.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const url = process.env.REMINDER_URL ?? 'http://supabase_kong_kintree:8000/functions/v1/send-reminders'
const key = process.env.REMINDER_CRON_KEY ?? ''
const sql = readFileSync(new URL('../supabase/schedule-reminders.sql', import.meta.url), 'utf8')
const out = execFileSync('docker', ['exec', '-i', 'supabase_db_kintree', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-v', `url=${url}`, '-v', `key=${key}`], { input: sql, encoding: 'utf8' })
console.log(out.trim().split('\n').slice(-6).join('\n'))
