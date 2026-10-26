import { canChiDay, canChiYear, solarToLunar } from '@kintree/core'

// Ngày hôm nay theo giờ Việt Nam, bất kể máy đặt múi giờ nào.
const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  .format(new Date())
  .split('-')
  .map(Number) as [number, number, number]

function App() {
  const today = { year, month, day }
  const lunar = solarToLunar(today)
  return (
    <main style={{ padding: 24 }}>
      <h1>Kintree</h1>
      <p>
        Hôm nay {day}/{month}/{year} là ngày {lunar.day}/{lunar.month}
        {lunar.leap ? ' (nhuận)' : ''} năm {canChiYear(lunar.year)} âm lịch, ngày {canChiDay(today)}.
      </p>
    </main>
  )
}

export default App
