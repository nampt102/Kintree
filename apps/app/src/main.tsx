import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { captureInvite } from './lib/memberStore.ts'

// Trước khi Supabase đọc địa chỉ: cất mã link mời rồi xoá khỏi thanh địa chỉ (design D6).
captureInvite(location, sessionStorage, history)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
