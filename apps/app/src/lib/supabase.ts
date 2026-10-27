import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Thiếu cấu hình thì `supabase` là null; giao diện hiện hướng dẫn chạy `pnpm db:env` thay vì lỗi trắng trang. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

/** Nút Google chỉ hiện khi nhà vận hành đã bật (design D1). */
export const googleEnabled = import.meta.env.VITE_AUTH_GOOGLE === '1'
