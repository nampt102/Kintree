import { describe, expect, test } from 'vitest';
import { deathAnniversary, isValidPartialDate } from '../src/dates.ts';
import { lunarMonthLength, lunarToSolar } from '../src/lunar.ts';

describe('ngày tháng không đầy đủ', () => {
  test.each([
    [{ year: 1890, lunar: false }, true],
    [{ year: 1950, month: 12, lunar: false }, true],
    [{ year: 1960, month: 2, day: 29, lunar: false }, true],
    [{ year: 1950, day: 12, lunar: false }, false], // có ngày thiếu tháng
    [{ year: 1960, month: 2, day: 30, lunar: false }, false], // ngày dương không tồn tại
    [{ year: 1960, month: 13, lunar: false }, false],
    [{ year: 1700, lunar: false }, false],
    [{ year: 2025, month: 6, day: 10, lunar: true, leap: true }, true],
    [{ year: 2026, month: 6, lunar: true, leap: true }, false], // 2026 không có tháng 6 nhuận
    [{ year: 2026, month: 6, day: 1, lunar: false, leap: true }, false], // dương lịch không có nhuận
  ])('%o hợp lệ = %s', (d, expected) => {
    expect(isValidPartialDate(d)).toBe(expected);
  });
});

describe('ngày giỗ', () => {
  test('ngày mất ghi dương lịch', () => {
    const r = deathAnniversary({ year: 1942, month: 10, day: 26, lunar: false }, 2026);
    expect(r).toMatchObject({ ok: true, lunarMonth: 9, lunarDay: 17, kind: 'Giỗ thường' });
    expect(r.ok && r.date).toEqual(lunarToSolar({ year: 2026, month: 9, day: 17, leap: false }));
  });

  test('ngày mất ghi âm lịch', () => {
    const r = deathAnniversary({ year: 1980, month: 3, day: 5, lunar: true }, 2027);
    expect(r.ok && r.date).toEqual(lunarToSolar({ year: 2027, month: 3, day: 5, leap: false }));
  });

  test('mất tháng nhuận thì giỗ tháng thường', () => {
    const r = deathAnniversary({ year: 2025, month: 6, day: 10, lunar: true, leap: true }, 2026);
    expect(r.ok && r.date).toEqual(lunarToSolar({ year: 2026, month: 6, day: 10, leap: false }));
  });

  test('mất tháng nhuận, ghi bằng ngày dương', () => {
    const death = lunarToSolar({ year: 2025, month: 6, day: 10, leap: true });
    const r = deathAnniversary({ ...death, lunar: false }, 2026);
    expect(r).toMatchObject({ ok: true, lunarMonth: 6, lunarDay: 10, kind: 'Giỗ đầu' });
  });

  // Tìm năm có tháng Chạp thiếu và năm có tháng Chạp đủ để kiểm cả hai nhánh.
  const years = Array.from({ length: 30 }, (_, i) => 2000 + i);
  const shortYear = years.find((y) => lunarMonthLength(y, 12) === 29)!;
  const longYear = years.find((y) => lunarMonthLength(y, 12) === 30)!;

  test('mất ngày 30, năm tháng thiếu thì giỗ ngày 29', () => {
    const r = deathAnniversary({ year: 1990, month: 12, day: 30, lunar: true }, shortYear);
    expect(r).toMatchObject({ ok: true, lunarDay: 29 });
    expect(r.ok && r.date).toEqual(lunarToSolar({ year: shortYear, month: 12, day: 29, leap: false }));
  });

  test('mất ngày 30, năm tháng đủ thì giỗ ngày 30', () => {
    const r = deathAnniversary({ year: 1990, month: 12, day: 30, lunar: true }, longYear);
    expect(r).toMatchObject({ ok: true, lunarDay: 30 });
  });

  test.each([
    [{ year: 1950, lunar: false }],
    [{ year: 1950, month: 12, lunar: false }],
  ])('thiếu ngày/tháng mất: %o', (death) => {
    expect(deathAnniversary(death, 2026)).toEqual({ ok: false, error: 'INCOMPLETE_DEATH_DATE' });
  });

  test.each([
    [2026, 'Giỗ đầu'],
    [2027, 'Giỗ hết'],
    [2028, 'Giỗ thường'],
  ])('mất năm 2025, năm %i là %s', (year, kind) => {
    expect(deathAnniversary({ year: 2025, month: 3, day: 5, lunar: true }, year)).toMatchObject({ kind });
  });

  test('giỗ thường từ năm thứ ba', () => {
    expect(deathAnniversary({ year: 2020, month: 3, day: 5, lunar: true }, 2026)).toMatchObject({ kind: 'Giỗ thường' });
  });

  test('chưa tới giỗ đầu', () => {
    expect(deathAnniversary({ year: 2026, month: 3, day: 5, lunar: true }, 2026)).toEqual({ ok: false, error: 'BEFORE_FIRST_ANNIVERSARY' });
  });
});
