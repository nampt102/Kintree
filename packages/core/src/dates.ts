import { isValidSolar, lunarMonthLength, lunarToSolar, MAX_YEAR, MIN_YEAR, solarToLunar, type SolarDate } from './lunar.ts';

/** Ngày biết đến đâu ghi đến đó: chỉ năm, năm–tháng, hoặc đầy đủ; âm hoặc dương. */
export type PartialDate = {
  year: number;
  month?: number;
  day?: number;
  lunar: boolean;
  leap?: boolean;
};

const ok = (fn: () => unknown) => {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
};

export function isValidPartialDate(d: PartialDate): boolean {
  const { year, month, day, lunar, leap } = d;
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return false;
  if (day !== undefined && month === undefined) return false;
  if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) return false;
  if (leap && (!lunar || month === undefined)) return false;
  if (!lunar) return day === undefined || isValidSolar({ year, month: month!, day });
  return ok(() => lunarToSolar({ year, month: month ?? 1, day: day ?? 1, leap: !!leap }));
}

export type AnniversaryKind = 'Giỗ đầu' | 'Giỗ hết' | 'Giỗ thường';

export type AnniversaryResult =
  | { ok: true; date: SolarDate; lunarDay: number; lunarMonth: number; kind: AnniversaryKind }
  | { ok: false; error: 'INCOMPLETE_DEATH_DATE' | 'INVALID_DATE' | 'BEFORE_FIRST_ANNIVERSARY' };

/** Ngày giỗ (dương lịch) trong năm âm lịch `lunarYear` của người mất vào ngày `death`. */
export function deathAnniversary(death: PartialDate, lunarYear: number): AnniversaryResult {
  if (death.month === undefined || death.day === undefined) return { ok: false, error: 'INCOMPLETE_DEATH_DATE' };
  if (!isValidPartialDate(death)) return { ok: false, error: 'INVALID_DATE' };

  // Tháng nhuận làm giỗ vào tháng thường cùng số, nên bỏ cờ nhuận.
  const { year, month, day } = death.lunar
    ? { year: death.year, month: death.month, day: death.day }
    : solarToLunar({ year: death.year, month: death.month, day: death.day });

  const n = lunarYear - year;
  if (n < 1) return { ok: false, error: 'BEFORE_FIRST_ANNIVERSARY' };
  const kind: AnniversaryKind = n === 1 ? 'Giỗ đầu' : n === 2 ? 'Giỗ hết' : 'Giỗ thường';

  // Mất ngày 30 mà năm nay tháng ấy thiếu thì làm giỗ ngày 29, không sang tháng sau.
  const lunarDay = day === 30 ? lunarMonthLength(lunarYear, month) : day;
  const date = lunarToSolar({ year: lunarYear, month, day: lunarDay, leap: false });
  return { ok: true, date, lunarDay, lunarMonth: month, kind };
}
