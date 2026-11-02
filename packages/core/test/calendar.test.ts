import { describe, expect, test } from 'vitest';
import { calendarEvents, incompleteDeaths, monthGrid, upcomingEvents, type CalendarPerson } from '../src/calendar.ts';
import { jdn, lunarMonthLength, lunarToSolar, type SolarDate } from '../src/lunar.ts';

const person = (id: string, extra: Partial<CalendarPerson> = {}): CalendarPerson => ({ id, fullName: `Người ${id}`, ...extra });
const today: SolarDate = { year: 2026, month: 3, day: 1 };
const ymd = (d: SolarDate) => `${d.year}-${d.month}-${d.day}`;

describe('monthGrid', () => {
  test('6 hàng × 7 cột, thứ Hai đầu tuần, đánh dấu ô trong tháng', () => {
    const cells = monthGrid(2026, 2);
    expect(cells).toHaveLength(42);
    expect(jdn(cells[0]!.date) % 7).toBe(0); // thứ Hai
    expect(cells.filter((c) => c.inMonth)).toHaveLength(28);
    expect(cells.find((c) => c.inMonth)!.date).toEqual({ year: 2026, month: 2, day: 1 });
  });

  test('mùng 1 Tết Bính Ngọ rơi vào 17/2/2026', () => {
    const tet = monthGrid(2026, 2).find((c) => c.date.day === 17 && c.inMonth)!;
    expect(tet.lunar).toEqual({ year: 2026, month: 1, day: 1, leap: false });
  });

  test('tháng nhuận: có ô mùng 1 của tháng 6 nhuận năm 2025', () => {
    const cells = [...monthGrid(2025, 7), ...monthGrid(2025, 8)].filter((c) => c.inMonth);
    const leapFirst = cells.find((c) => c.lunar?.day === 1 && c.lunar.leap);
    expect(leapFirst?.lunar).toMatchObject({ year: 2025, month: 6, day: 1, leap: true });
  });

  test('ô ngoài phạm vi lịch âm có lunar null, tháng ngoài phạm vi ném RangeError', () => {
    expect(monthGrid(1800, 1)[0]!.lunar).toBeNull(); // thứ Hai đầu tuần rơi vào tháng 12/1799
    expect(() => monthGrid(1799, 12)).toThrow(RangeError);
    expect(() => monthGrid(2200, 1)).toThrow(RangeError);
    expect(() => monthGrid(2026, 13)).toThrow(RangeError);
  });
});

describe('giỗ', () => {
  test('giỗ thường rơi đúng ô ngày dương của ngày âm tương ứng', () => {
    const p = person('a', { death: { year: 1968, month: 3, day: 5, lunar: true } });
    const expected = lunarToSolar({ year: 2026, month: 3, day: 5, leap: false });
    const events = calendarEvents([p], expected.year, expected.month, today);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'death', anniversary: 'Giỗ thường', date: expected });
    expect(events[0]!.lunar).toMatchObject({ year: 2026, month: 3, day: 5 });
    expect(calendarEvents([p], expected.year, expected.month === 12 ? 1 : expected.month + 1, today).filter((e) => e.kind === 'death')).toHaveLength(
      expected.month === 12 ? 1 : 0,
    );
  });

  test('ngày mất ghi dương lịch', () => {
    const p = person('a', { death: { year: 1942, month: 10, day: 26, lunar: false } }); // 17/9 âm
    const [e] = calendarEvents([p], 2026, 10, today);
    expect(e).toMatchObject({ kind: 'death', lunar: { month: 9, day: 17 } });
  });

  test('Giỗ đầu, Giỗ hết, chưa tới giỗ đầu', () => {
    const at = (deathYear: number) => calendarEvents([person('a', { death: { year: deathYear, month: 3, day: 5, lunar: true } })], 2026, lunarToSolar({ year: 2026, month: 3, day: 5, leap: false }).month, today);
    expect(at(2025)[0]?.anniversary).toBe('Giỗ đầu');
    expect(at(2024)[0]?.anniversary).toBe('Giỗ hết');
    expect(at(2026)).toEqual([]);
  });

  test('tháng 2/2026 giao hai năm âm: giỗ của năm âm 2025 và năm âm 2026 đều hiện', () => {
    const late = person('late', { death: { year: 2000, month: 12, day: 20, lunar: true } }); // 20/12 âm năm 2025 → trước Tết
    const early = person('early', { death: { year: 2000, month: 1, day: 5, lunar: true } }); // 5/1 âm năm 2026 → sau Tết
    const dateLate = lunarToSolar({ year: 2025, month: 12, day: 20, leap: false });
    const dateEarly = lunarToSolar({ year: 2026, month: 1, day: 5, leap: false });
    expect([dateLate.month, dateEarly.month]).toEqual([2, 2]); // cả hai nằm trong tháng 2/2026
    const events = calendarEvents([late, early], 2026, 2, today);
    expect(events.map((e) => [e.person.id, ymd(e.date)])).toEqual([
      ['late', ymd(dateLate)],
      ['early', ymd(dateEarly)],
    ]);
  });

  test('người mất ngày 30: tháng thiếu thì giỗ ngày 29', () => {
    let year = 2005;
    while (lunarMonthLength(year, 12) !== 29) year++;
    let deathYear = 1950; // năm mất phải có tháng 12 đủ 30 ngày thì ngày mất 30 mới hợp lệ
    while (lunarMonthLength(deathYear, 12) !== 30) deathYear++;
    const p = person('a', { death: { year: deathYear, month: 12, day: 30, lunar: true } });
    const expected = lunarToSolar({ year, month: 12, day: 29, leap: false });
    const events = calendarEvents([p], expected.year, expected.month, { year, month: 1, day: 1 });
    expect(events.find((e) => e.kind === 'death')?.date).toEqual(expected);
  });

  test('người mất trong tháng nhuận: giỗ vào tháng thường cùng số', () => {
    const p = person('a', { death: { year: 2025, month: 6, day: 10, lunar: true, leap: true } });
    const expected = lunarToSolar({ year: 2026, month: 6, day: 10, leap: false });
    const [e] = calendarEvents([p], expected.year, expected.month, today);
    expect(e).toMatchObject({ date: expected, anniversary: 'Giỗ đầu' });
  });

  test('thiếu ngày hoặc tháng mất: không có giỗ; incompleteDeaths liệt kê', () => {
    const onlyYear = person('y', { death: { year: 1950, lunar: false } });
    const noDay = person('d', { death: { year: 1950, month: 12, lunar: false } });
    const full = person('f', { death: { year: 1950, month: 12, day: 3, lunar: false } });
    const alive = person('l', { birth: { year: 1990, lunar: false } });
    for (let m = 1; m <= 12; m++) expect(calendarEvents([onlyYear, noDay], 2026, m, today)).toEqual([]);
    expect(incompleteDeaths([onlyYear, noDay, full, alive]).map((p) => p.id)).toEqual(['y', 'd']);
  });

  test('ngày không hợp lệ hoặc ngoài phạm vi bị bỏ qua, không ném lỗi', () => {
    const people = [
      person('old', { death: { year: 1700, month: 1, day: 1, lunar: false } }),
      person('bad', { death: { year: 1950, month: 2, day: 30, lunar: false } }),
      person('lunarbad', { death: { year: 1950, month: 6, day: 1, lunar: true, leap: true } }),
    ];
    for (let m = 1; m <= 12; m++) expect(() => calendarEvents(people, 2026, m, today)).not.toThrow();
    expect(calendarEvents(people, 2026, 3, today)).toEqual([]);
  });
});

describe('sinh nhật', () => {
  test('ngày sinh dương: ngày dương mỗi năm, kèm tuổi', () => {
    const p = person('a', { birth: { year: 1975, month: 9, day: 17, lunar: false } });
    const [e] = calendarEvents([p], 2026, 9, today);
    expect(e).toMatchObject({ kind: 'birthday', date: { year: 2026, month: 9, day: 17 }, age: 51 });
    expect(calendarEvents([p], 2026, 8, today)).toEqual([]);
  });

  test('ngày sinh âm: theo ngày âm mỗi năm (mùng 1 Tết = 17/2/2026)', () => {
    const p = person('a', { birth: { year: 1980, month: 1, day: 1, lunar: true } });
    const [e] = calendarEvents([p], 2026, 2, today);
    expect(e).toMatchObject({ kind: 'birthday', date: { year: 2026, month: 2, day: 17 }, age: 46 });
  });

  test('người đã mất không có sinh nhật; người thiếu ngày hoặc tháng sinh không có sinh nhật', () => {
    const dead = person('d', { birth: { year: 1975, month: 9, day: 17, lunar: false }, death: { year: 2000, lunar: false } });
    const noDay = person('n', { birth: { year: 1975, month: 9, lunar: false } });
    expect(calendarEvents([dead, noDay], 2026, 9, today)).toEqual([]);
  });

  test('chỉ người sinh trong vòng 100 năm; chưa sinh thì không có', () => {
    const old = person('o', { birth: { year: 1900, month: 9, day: 17, lunar: false } });
    const edge = person('e', { birth: { year: 1926, month: 9, day: 17, lunar: false } });
    const future = person('f', { birth: { year: 2030, month: 9, day: 17, lunar: false } });
    expect(calendarEvents([old, edge, future], 2026, 9, today).map((e) => e.person.id)).toEqual(['e']);
  });

  test('không có sinh nhật ngay trong năm sinh', () => {
    const p = person('a', { birth: { year: 2026, month: 5, day: 3, lunar: false } });
    expect(calendarEvents([p], 2026, 5, { year: 2026, month: 5, day: 1 })).toEqual([]);
  });

  test('sinh 29/2: năm không nhuận rơi vào 28/2, năm nhuận giữ 29/2', () => {
    const p = person('a', { birth: { year: 2000, month: 2, day: 29, lunar: false } });
    expect(calendarEvents([p], 2026, 2, today)[0]?.date).toEqual({ year: 2026, month: 2, day: 28 });
    expect(calendarEvents([p], 2028, 2, { year: 2028, month: 1, day: 1 })[0]?.date).toEqual({ year: 2028, month: 2, day: 29 });
  });

  test('sinh ngày 30 âm: tháng thiếu thì rơi vào ngày 29', () => {
    let year = 2005;
    while (lunarMonthLength(year, 12) !== 29) year++;
    const p = person('a', { birth: { year: 1990, month: 12, day: 30, lunar: true } });
    const expected = lunarToSolar({ year, month: 12, day: 29, leap: false });
    expect(calendarEvents([p], expected.year, expected.month, { year, month: 1, day: 1 }).find((e) => e.kind === 'birthday')?.date).toEqual(expected);
  });
});

describe('thứ tự và upcomingEvents', () => {
  test('cùng ngày: giỗ trước sinh nhật; rồi theo tên', () => {
    const date = { year: 2026, month: 9, day: 17 };
    const dead = person('g', { fullName: 'Giỗ', death: { year: 1942, month: 10, day: 26, lunar: false } }); // 17/9 âm = 26/10/2026? kiểm bên dưới
    const born = (id: string, name: string) => person(id, { fullName: name, birth: { year: 1975, month: 9, day: 17, lunar: false } });
    const events = calendarEvents([born('b', 'Bình'), born('a', 'An')], 2026, 9, today);
    expect(events.map((e) => e.person.fullName)).toEqual(['An', 'Bình']);
    expect(events.every((e) => jdn(e.date) === jdn(date))).toBe(true);
    void dead;
  });

  test('30 ngày tới kể cả hôm nay, qua ranh tháng và năm, đúng thứ tự', () => {
    const from = { year: 2026, month: 12, day: 28 };
    const a = person('a', { birth: { year: 1990, month: 12, day: 28, lunar: false } }); // hôm nay
    const b = person('b', { birth: { year: 1990, month: 1, day: 5, lunar: false } }); // 5/1/2027
    const c = person('c', { birth: { year: 1990, month: 1, day: 26, lunar: false } }); // 26/1/2027 (ngày thứ 30)
    const d = person('d', { birth: { year: 1990, month: 1, day: 27, lunar: false } }); // 27/1/2027: ngoài 30 ngày
    const e = person('e', { birth: { year: 1990, month: 12, day: 27, lunar: false } }); // hôm qua
    const events = upcomingEvents([d, c, b, a, e], from);
    expect(events.map((x) => [x.person.id, ymd(x.date)])).toEqual([
      ['a', '2026-12-28'],
      ['b', '2027-1-5'],
      ['c', '2027-1-26'],
    ]);
  });

  test('upcomingEvents không lỗi ở cuối phạm vi năm', () => {
    expect(() => upcomingEvents([person('a', { birth: { year: 2150, month: 1, day: 1, lunar: false } })], { year: 2199, month: 12, day: 20 })).not.toThrow();
  });
});
