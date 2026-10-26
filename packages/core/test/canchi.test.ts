import { expect, test } from 'vitest';
import { canChiDay, canChiMonth, canChiYear } from '../src/canchi.ts';
import { solarToLunar } from '../src/lunar.ts';

test('Can Chi năm', () => {
  expect(canChiYear(2026)).toBe('Bính Ngọ');
  expect(canChiYear(solarToLunar({ year: 2007, month: 2, day: 17 }).year)).toBe('Đinh Hợi');
  expect(canChiYear(1942)).toBe('Nhâm Ngọ');
});

// Đối chiếu với gói 'vietnamese-lunar-calendar' (nguồn độc lập), ngày 2026-10-26.
test.each([
  [{ year: 2000, month: 1, day: 1 }, 'Kỷ Mão', 'Bính Tý', 'Mậu Ngọ'],
  [{ year: 2026, month: 10, day: 26 }, 'Bính Ngọ', 'Mậu Tuất', 'Quý Dậu'],
  [{ year: 1942, month: 10, day: 26 }, 'Nhâm Ngọ', 'Canh Tuất', 'Nhâm Tý'],
])('Can Chi năm/tháng/ngày của %o', (solar, year, month, day) => {
  const lunar = solarToLunar(solar);
  expect(canChiYear(lunar.year)).toBe(year);
  expect(canChiMonth(lunar)).toBe(month);
  expect(canChiDay(solar)).toBe(day);
});
