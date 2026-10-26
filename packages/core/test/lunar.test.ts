import { describe, expect, test } from 'vitest';
import tetFixture from './fixtures/tet.json' with { type: 'json' };
import { fromJdn, jdn, LunarError, lunarToSolar, solarToLunar } from '../src/lunar.ts';

const errCode = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as LunarError).code;
  }
  return null;
};

describe('Tết Nguyên đán 1900–2100', () => {
  test.each(Object.entries(tetFixture.tet))('%s', (year, iso) => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    expect(solarToLunar({ year: y, month: m, day: d })).toEqual({ year: Number(year), month: 1, day: 1, leap: false });
    expect(lunarToSolar({ year: Number(year), month: 1, day: 1, leap: false })).toEqual({ year: y, month: m, day: d });
  });
});

describe('ví dụ trong spec', () => {
  test('17/02/2007 là mùng 1 Tết (lệch lịch Trung Quốc)', () => {
    expect(solarToLunar({ year: 2007, month: 2, day: 17 })).toEqual({ year: 2007, month: 1, day: 1, leap: false });
  });

  test('26/10/1942 là 17/9 âm lịch', () => {
    expect(solarToLunar({ year: 1942, month: 10, day: 26 })).toEqual({ year: 1942, month: 9, day: 17, leap: false });
  });

  test('năm 2025 có tháng 6 nhuận', () => {
    const start = lunarToSolar({ year: 2025, month: 6, day: 1, leap: true });
    expect(solarToLunar(start)).toEqual({ year: 2025, month: 6, day: 1, leap: true });
    const normal = lunarToSolar({ year: 2025, month: 6, day: 1, leap: false });
    expect(jdn(start)).toBeGreaterThan(jdn(normal));
  });
});

describe('ngày không tồn tại và ngoài phạm vi', () => {
  test('tháng nhuận không có trong năm', () => {
    expect(errCode(() => lunarToSolar({ year: 2026, month: 6, day: 1, leap: true }))).toBe('INVALID_LUNAR_DATE');
  });

  test('ngày 30 của tháng thiếu', () => {
    // Tìm một tháng thiếu trong năm 2026 rồi hỏi ngày 30 của nó.
    const short = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find(
      (month) => errCode(() => lunarToSolar({ year: 2026, month, day: 30, leap: false })) !== null,
    );
    expect(short).toBeDefined();
    expect(errCode(() => lunarToSolar({ year: 2026, month: short!, day: 30, leap: false }))).toBe('INVALID_LUNAR_DATE');
  });

  test('năm ngoài phạm vi', () => {
    expect(errCode(() => solarToLunar({ year: 1700, month: 1, day: 1 }))).toBe('OUT_OF_RANGE');
  });

  test('ngày dương không tồn tại', () => {
    expect(errCode(() => solarToLunar({ year: 1960, month: 2, day: 30 }))).toBe('INVALID_SOLAR_DATE');
  });
});

test('đổi xuôi rồi ngược khớp mọi ngày 1900–2100', () => {
  const from = jdn({ year: 1900, month: 1, day: 1 });
  const to = jdn({ year: 2100, month: 12, day: 31 });
  const bad: string[] = [];
  for (let n = from; n <= to; n++) {
    const s = fromJdn(n);
    const back = lunarToSolar(solarToLunar(s));
    if (jdn(back) !== n) bad.push(`${s.year}-${s.month}-${s.day}`);
    if (bad.length > 5) break;
  }
  expect(bad).toEqual([]);
}, 120_000);

// Điểm sóc sát nửa đêm (giờ Việt Nam): giờ sóc lấy từ PyEphem (thư viện thiên văn độ chính xác cao),
// kiểm ngày 2026-10-26. Đây là những chỗ thuật toán độ chính xác thấp hay đặt sai ngày mùng 1.
test.each([
  [{ year: 1944, month: 6, day: 20 }, { year: 1944, month: 5, day: 1, leap: false }], // sóc 23:59:32
  [{ year: 2072, month: 12, day: 9 }, { year: 2072, month: 11, day: 1, leap: false }], // sóc 23:58:28
  [{ year: 2077, month: 11, day: 15 }, { year: 2077, month: 10, day: 1, leap: false }], // sóc 23:59:34
  [{ year: 2175, month: 1, day: 22 }, { year: 2175, month: 1, day: 1, leap: false }], // sóc 23:59:36
])('sóc sát nửa đêm: %o là mùng 1', (solar, lunar) => {
  expect(solarToLunar(solar)).toEqual(lunar);
});
