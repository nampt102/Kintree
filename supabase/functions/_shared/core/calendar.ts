// Lịch tháng âm–dương, giỗ và sinh nhật (change lunar-calendar-view, design D1). Hàm thuần, dùng chung app và (sau này) thông báo đẩy.
import { deathAnniversary, isValidPartialDate, type AnniversaryKind, type PartialDate } from './dates.ts';
import { fromJdn, jdn, lunarMonthLength, lunarToSolar, MAX_YEAR, MIN_YEAR, solarToLunar, type LunarDate, type SolarDate } from './lunar.ts';

export type CalendarPerson = { id: string; fullName: string; birth?: PartialDate; death?: PartialDate };

export type CalendarEvent<P extends CalendarPerson = CalendarPerson> = {
  date: SolarDate;
  lunar: LunarDate;
  kind: 'death' | 'birthday';
  /** Kỳ giỗ (chỉ với giỗ). */
  anniversary?: AnniversaryKind;
  /** Tuổi (chỉ với sinh nhật): số năm kể từ năm sinh theo lịch đã nhập. */
  age?: number;
  person: P;
};

/** Một ô của lưới tháng; `lunar` là null khi ngày nằm ngoài phạm vi lịch âm hỗ trợ (1800–2199). */
export type GridCell = { date: SolarDate; inMonth: boolean; lunar: LunarDate | null };

/** Sinh nhật chỉ tính cho người chưa mất sinh trong vòng chừng này năm (không có cờ "còn sống"). */
export const BIRTHDAY_MAX_AGE = 100;

const lunarOrNull = (d: SolarDate): LunarDate | null => {
  try {
    return solarToLunar(d);
  } catch {
    return null;
  }
};

const daysInMonth = (year: number, month: number) => jdn({ year: month === 12 ? year + 1 : year, month: month === 12 ? 1 : month + 1, day: 1 }) - jdn({ year, month, day: 1 });

function checkMonth(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError(`Tháng ${month}/${year} ngoài phạm vi lịch ${MIN_YEAR}–${MAX_YEAR}`);
  }
}

/** Lưới tháng 6 hàng × 7 cột, thứ Hai đầu tuần; ô ngoài tháng là ngày của tháng kề. */
export function monthGrid(year: number, month: number): GridCell[] {
  checkMonth(year, month);
  const first = jdn({ year, month, day: 1 });
  // JDN chia 7 dư 0 là thứ Hai.
  const start = first - (first % 7);
  const len = daysInMonth(year, month);
  return Array.from({ length: 42 }, (_, i) => {
    const date = fromJdn(start + i);
    return { date, inMonth: start + i >= first && start + i < first + len, lunar: lunarOrNull(date) };
  });
}

const inMonth = (d: SolarDate, year: number, month: number) => d.year === year && d.month === month;

/** Một tháng dương nằm trong tối đa hai năm âm lịch: năm âm của ngày đầu và của ngày cuối tháng. */
function lunarYearsOf(year: number, month: number): number[] {
  const a = lunarOrNull({ year, month, day: 1 });
  const b = lunarOrNull({ year, month, day: daysInMonth(year, month) });
  return [...new Set([a?.year, b?.year].filter((y): y is number => y !== undefined))];
}

const safe = <T>(fn: () => T): T | null => {
  try {
    return fn();
  } catch {
    return null;
  }
};

function birthdayEligible(p: CalendarPerson, today: SolarDate): p is CalendarPerson & { birth: PartialDate & { month: number; day: number } } {
  const b = p.birth;
  if (p.death || !b || b.month === undefined || b.day === undefined) return false;
  if (!isValidPartialDate(b) || b.year > today.year || today.year - b.year > BIRTHDAY_MAX_AGE) return false;
  return true;
}

/**
 * Giỗ và sinh nhật rơi vào tháng dương `year/month`, theo thứ tự ngày (cùng ngày: giỗ trước, rồi theo tên).
 * Người có ngày không hợp lệ hoặc ngoài phạm vi lịch âm bị bỏ qua, không ném lỗi.
 */
export function calendarEvents<P extends CalendarPerson>(people: readonly P[], year: number, month: number, today: SolarDate): CalendarEvent<P>[] {
  checkMonth(year, month);
  const lunarYears = lunarYearsOf(year, month);
  const out: CalendarEvent<P>[] = [];
  const push = (e: Omit<CalendarEvent<P>, 'lunar'>) => {
    const lunar = lunarOrNull(e.date);
    if (lunar && inMonth(e.date, year, month)) out.push({ ...e, lunar });
  };

  for (const p of people) {
    if (p.death) {
      for (const ly of lunarYears) {
        const r = safe(() => deathAnniversary(p.death!, ly));
        if (r?.ok) push({ date: r.date, kind: 'death', anniversary: r.kind, person: p });
      }
      continue;
    }
    if (!birthdayEligible(p, today)) continue;
    const b = p.birth;
    if (!b.lunar) {
      // Sinh 29/2 dương: năm không nhuận rơi vào 28/2.
      const date = safe(() => (b.month === 2 && b.day === 29 && daysInMonth(year, 2) === 28 ? { year, month: 2, day: 28 } : { year, month: b.month, day: b.day }));
      if (date && year > b.year && inMonth(date, year, month) && jdn(date) > 0) push({ date, kind: 'birthday', age: year - b.year, person: p });
      continue;
    }
    for (const ly of lunarYears) {
      if (ly <= b.year) continue;
      // Sinh ngày 30 âm mà tháng ấy năm đang xem chỉ có 29 ngày thì rơi vào ngày 29 (như quy tắc giỗ); tháng nhuận tính tháng thường.
      const date = safe(() => lunarToSolar({ year: ly, month: b.month, day: b.day === 30 ? lunarMonthLength(ly, b.month) : b.day, leap: false }));
      if (date) push({ date, kind: 'birthday', age: ly - b.year, person: p });
    }
  }
  return out.sort((x, y) => jdn(x.date) - jdn(y.date) || (x.kind === y.kind ? 0 : x.kind === 'death' ? -1 : 1) || x.person.fullName.localeCompare(y.person.fullName, 'vi'));
}

/** Sự kiện trong `days` ngày kể từ `from` (kể cả ngày `from`), theo thứ tự ngày. */
export function upcomingEvents<P extends CalendarPerson>(people: readonly P[], from: SolarDate, days = 30): CalendarEvent<P>[] {
  const start = jdn(from);
  const end = start + days - 1;
  const last = fromJdn(end);
  const out: CalendarEvent<P>[] = [];
  for (let y = from.year, m = from.month; y < last.year || (y === last.year && m <= last.month); m === 12 ? (y++, (m = 1)) : m++) {
    if (y < MIN_YEAR || y > MAX_YEAR) continue;
    for (const e of calendarEvents(people, y, m, from)) {
      const j = jdn(e.date);
      if (j >= start && j <= end) out.push(e);
    }
  }
  return out;
}

/** Người có ghi chép mất nhưng thiếu ngày hoặc tháng nên chưa tính được giỗ. */
export function incompleteDeaths<P extends CalendarPerson>(people: readonly P[]): P[] {
  return people.filter((p) => p.death !== undefined && (p.death.month === undefined || p.death.day === undefined));
}
