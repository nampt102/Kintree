import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

export type WindowClass = 'compact' | 'medium' | 'expanded'

/** Cỡ cửa sổ theo bề rộng (design D3): gọn < 600, vừa 600–839, rộng ≥ 840. */
export function windowClassOf(width: number): WindowClass {
  if (width < 600) return 'compact'
  if (width < 840) return 'medium'
  return 'expanded'
}

const subscribeResize = (cb: () => void) => {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}

export function useWindowClass(): WindowClass {
  return useSyncExternalStore(
    subscribeResize,
    () => windowClassOf(window.innerWidth),
    () => 'expanded',
  )
}

export type Segment = { left: number; width: number }

type ViewportWithSegments = { segments?: { x: number; width: number }[] | null }

/**
 * Các đoạn vùng nhìn theo chiều ngang (máy gập / màn kép), qua Viewport Segments API.
 * Trả `null` khi trình duyệt không báo hoặc chỉ có một đoạn; khi đó dùng bố cục theo bề rộng.
 */
export function readSegments(): Segment[] | null {
  const segs = (window as unknown as { viewport?: ViewportWithSegments }).viewport?.segments
  if (!segs || segs.length < 2) return null
  const horizontal = [...segs].sort((a, b) => a.x - b.x)
  // Chỉ nhận chia trái/phải (nếp gập dọc); chia trên/dưới coi như một màn.
  if (horizontal[0]!.x === horizontal[1]!.x) return null
  return horizontal.map((s) => ({ left: s.x, width: s.width }))
}

export function useViewportSegments(): Segment[] | null {
  const [segments, setSegments] = useState(() => readSegments())
  useEffect(() => {
    const update = () => setSegments(readSegments())
    window.addEventListener('resize', update)
    const mq = window.matchMedia?.('(horizontal-viewport-segments: 2)')
    mq?.addEventListener?.('change', update)
    return () => {
      window.removeEventListener('resize', update)
      mq?.removeEventListener?.('change', update)
    }
  }, [])
  return segments
}

/** Chiều cao phần nhìn thấy thật (trừ bàn phím ảo trên Safari iOS). */
export function useVisualViewportHeight(): number | null {
  const [h, setH] = useState<number | null>(() => window.visualViewport?.height ?? null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setH(vv.height)
    vv.addEventListener('resize', update)
    return () => vv.removeEventListener('resize', update)
  }, [])
  return h
}

/**
 * Nút Back của trình duyệt / Android (và vuốt quay lại trên iOS) đóng lớp đang mở (design D7):
 * khi mở thì đẩy một mục vào lịch sử; Back thì gọi `onBack`; đóng bằng nút thì tự lùi mục ấy.
 */
let released: { key: string; timer: ReturnType<typeof setTimeout> } | null = null

export function useBackToClose(active: boolean, onBack: () => void) {
  const cb = useRef(onBack)
  cb.current = onBack
  useEffect(() => {
    if (!active) return
    // Lớp vừa đóng rồi mở lại ngay (StrictMode chạy hiệu ứng hai lần, hoặc đổi hộp thoại này sang hộp thoại khác):
    // dùng lại mục lịch sử của nó thay vì lùi rồi đẩy mục mới, vì history.back() chạy bất đồng bộ.
    let key: string
    if (released && history.state?.kt === released.key) {
      clearTimeout(released.timer)
      key = released.key
      released = null
    } else {
      key = Math.random().toString(36).slice(2)
      const below: string[] = history.state?.kts ?? []
      // `kts`: chồng các lớp đang mở tại mục lịch sử này (màn cây → tấm trượt → hộp thoại).
      history.pushState({ ...(history.state ?? {}), kt: key, kts: [...below, key] }, '')
    }
    let poppedByBack = false
    const onPop = () => {
      // Lớp phía trên (vd. hộp thoại mở từ tấm trượt) tự lùi lịch sử khi đóng: lớp của ta vẫn còn trong chồng thì bỏ qua.
      if ((history.state?.kts as string[] | undefined)?.includes(key)) return
      poppedByBack = true
      cb.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (poppedByBack || history.state?.kt !== key) return
      const timer = setTimeout(() => {
        if (released?.key !== key) return
        released = null
        if (history.state?.kt === key) history.back()
      }, 0)
      released = { key, timer }
    }
  }, [active])
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}
