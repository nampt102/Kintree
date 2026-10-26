// Âm lịch Việt Nam (múi giờ UTC+7).
//
// Viết độc lập từ công thức đã công bố, không dùng mã nguồn của chương trình nào khác:
// - Điểm sóc (trăng mới): Jean Meeus, "Astronomical Algorithms" (2nd ed., 1998), chương 49.
// - Kinh độ biểu kiến của mặt trời: Meeus chương 25 (độ chính xác ~0,01°).
// - ΔT (TT − UT): đa thức của Espenak & Meeus (NASA, "Polynomial Expressions for Delta T").
// Quy tắc lịch: tháng bắt đầu từ ngày có điểm sóc; tháng 11 là tháng chứa Đông chí;
// năm có 13 tháng thì tháng nhuận là tháng đầu tiên sau tháng 11 không chứa trung khí.

export type SolarDate = { year: number; month: number; day: number };
export type LunarDate = { year: number; month: number; day: number; leap: boolean };

export type LunarErrorCode = 'OUT_OF_RANGE' | 'INVALID_LUNAR_DATE' | 'INVALID_SOLAR_DATE';

export class LunarError extends Error {
  readonly code: LunarErrorCode;
  constructor(code: LunarErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export const MIN_YEAR = 1800;
export const MAX_YEAR = 2199;
const TZ = 7;
const SYNODIC = 29.530588861;
const RAD = Math.PI / 180;

const sin = (deg: number) => Math.sin(deg * RAD);

/** Số ngày Julian (JDN) của ngày dương lịch Gregory. */
export function jdn({ year, month, day }: SolarDate): number {
  const d = new Date(Date.UTC(2000, month - 1, day));
  d.setUTCFullYear(year);
  return Math.floor(d.getTime() / 86400000) + 2440588;
}

export function fromJdn(n: number): SolarDate {
  const d = new Date((n - 2440588) * 86400000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function isValidSolar({ year, month, day }: SolarDate): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  return fromJdn(jdn({ year, month, day })).day === day;
}

/** ΔT tính bằng giây. */
function deltaT(year: number): number {
  const y = year;
  let t: number;
  if (y < 1860) { t = y - 1800; return 13.72 - 0.332447 * t + 0.0068612 * t ** 2 + 0.0041116 * t ** 3 - 0.00037436 * t ** 4 + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7; }
  if (y < 1900) { t = y - 1860; return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174; }
  if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
  if (y < 1941) { t = y - 1920; return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3; }
  if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547; }
  if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718; }
  if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t ** 2; }
  if (y < 2150) return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
  return -20 + 32 * ((y - 1820) / 100) ** 2;
}

const dtDays = (jd: number) => deltaT(2000 + (jd - 2451545) / 365.25) / 86400;

/** Thời điểm điểm sóc thứ k (k = 0 là sóc ngày 6/1/2000), tính theo UT (ngày Julian). */
function newMoonUT(k: number): number {
  const T = k / 1236.85;
  let jde = 2451550.09766 + SYNODIC * k + 0.00015437 * T ** 2 - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;
  const M = 2.5534 + 29.1053567 * k - 0.0000014 * T ** 2 - 0.00000011 * T ** 3;
  const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4;
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4;
  const O = 124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3;
  jde +=
    -0.4072 * sin(Mp) + 0.17241 * E * sin(M) + 0.01608 * sin(2 * Mp) + 0.01039 * sin(2 * F) +
    0.00739 * E * sin(Mp - M) - 0.00514 * E * sin(Mp + M) + 0.00208 * E * E * sin(2 * M) -
    0.00111 * sin(Mp - 2 * F) - 0.00057 * sin(Mp + 2 * F) + 0.00056 * E * sin(2 * Mp + M) -
    0.00042 * sin(3 * Mp) + 0.00042 * E * sin(M + 2 * F) + 0.00038 * E * sin(M - 2 * F) -
    0.00024 * E * sin(2 * Mp - M) - 0.00017 * sin(O) - 0.00007 * sin(Mp + 2 * M) +
    0.00004 * sin(2 * Mp - 2 * F) + 0.00004 * sin(3 * M) + 0.00003 * sin(Mp + M - 2 * F) +
    0.00003 * sin(2 * Mp + 2 * F) - 0.00003 * sin(Mp + M + 2 * F) + 0.00003 * sin(Mp - M + 2 * F) -
    0.00002 * sin(Mp - M - 2 * F) - 0.00002 * sin(3 * Mp + M) + 0.00002 * sin(4 * Mp);
  const planetary: [number, number, number][] = [
    [299.77, 0.107408, 0.000325], [251.88, 0.016321, 0.000165], [251.83, 26.651886, 0.000164],
    [349.42, 36.412478, 0.000126], [84.66, 18.206239, 0.00011], [141.74, 53.303771, 0.000062],
    [207.14, 2.453732, 0.00006], [154.84, 7.30686, 0.000056], [34.52, 27.261239, 0.000047],
    [207.19, 0.121824, 0.000042], [291.34, 1.844379, 0.00004], [161.72, 24.198154, 0.000037],
    [239.56, 25.513099, 0.000035], [331.55, 3.592518, 0.000023],
  ];
  planetary.forEach(([a, b, c], i) => {
    jde += c * sin(a + b * k - (i === 0 ? 0.009173 * T * T : 0));
  });
  return jde - dtDays(jde);
}

/** Kinh độ biểu kiến của mặt trời (độ, 0–360) tại thời điểm UT. */
function sunLongitude(jdUT: number): number {
  const T = (jdUT + dtDays(jdUT) - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
  const O = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * sin(O);
  return ((lambda % 360) + 360) % 360;
}

/** JDN của ngày (giờ Việt Nam) chứa điểm sóc thứ k. */
const newMoonDay = (k: number) => Math.floor(newMoonUT(k) + 0.5 + TZ / 24);

/** Chỉ số trung khí (0–11) lúc 0 giờ (giờ Việt Nam) của ngày có JDN n. */
const termIndex = (n: number) => Math.floor(sunLongitude(n - 0.5 - TZ / 24) / 30);

const kNear = (n: number) => Math.floor((n - 2451550.1) / SYNODIC);

/** Tháng 11 âm lịch chứa Đông chí của năm dương y: trả JDN ngày mùng 1 và chỉ số sóc k. */
function month11(y: number): { start: number; k: number } {
  let k = kNear(jdn({ year: y, month: 12, day: 31 }));
  while (newMoonDay(k) > jdn({ year: y, month: 12, day: 31 })) k--;
  // Kinh độ ≥ 270° lúc đầu tháng nghĩa là Đông chí rơi vào tháng trước.
  if (termIndex(newMoonDay(k)) >= 9) k--;
  return { start: newMoonDay(k), k };
}

/** Vị trí (1–12) của tháng nhuận tính từ tháng 11, hoặc 0 nếu năm không nhuận. */
function leapOffset(a11: { start: number; k: number }, b11: { start: number }): number {
  if (b11.start - a11.start <= 365) return 0;
  for (let i = 1; i <= 12; i++) {
    if (termIndex(newMoonDay(a11.k + i)) === termIndex(newMoonDay(a11.k + i + 1))) return i;
  }
  return 0;
}

function checkRange(year: number) {
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new LunarError('OUT_OF_RANGE', `Năm ${year} ngoài phạm vi hỗ trợ ${MIN_YEAR}–${MAX_YEAR}`);
  }
}

export function solarToLunar(date: SolarDate): LunarDate {
  checkRange(date.year);
  if (!isValidSolar(date)) throw new LunarError('INVALID_SOLAR_DATE', 'Ngày dương lịch không tồn tại');
  const n = jdn(date);
  let k = kNear(n) + 1;
  while (newMoonDay(k) > n) k--;
  const monthStart = newMoonDay(k);

  let a11 = month11(date.year);
  let b11: { start: number; k: number };
  let yearOf11 = date.year;
  if (a11.start > monthStart) {
    b11 = a11;
    a11 = month11(date.year - 1);
    yearOf11 = date.year - 1;
  } else {
    b11 = month11(date.year + 1);
  }

  const diff = k - a11.k;
  const leap = leapOffset(a11, b11);
  let month = diff + 11;
  let isLeap = false;
  if (leap && diff >= leap) {
    month = diff + 10;
    isLeap = diff === leap;
  }
  if (month > 12) month -= 12;
  const year = month >= 11 && diff < 4 ? yearOf11 : yearOf11 + 1;
  return { year, month, day: n - monthStart + 1, leap: isLeap };
}

export function lunarToSolar({ year, month, day, leap }: LunarDate): SolarDate {
  checkRange(year);
  const bad = () => new LunarError('INVALID_LUNAR_DATE', 'Ngày âm lịch không tồn tại');
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 30) throw bad();

  const [a11, b11] = month < 11 ? [month11(year - 1), month11(year)] : [month11(year), month11(year + 1)];
  let off = month - 11;
  if (off < 0) off += 12;
  const lo = leapOffset(a11, b11);
  if (leap && (lo === 0 || lo - 1 !== off)) throw bad();
  if (lo && (leap || off >= lo)) off += 1;

  const start = newMoonDay(a11.k + off);
  const length = newMoonDay(a11.k + off + 1) - start;
  if (day > length) throw bad();
  return fromJdn(start + day - 1);
}

/** Số ngày của một tháng âm lịch (29 hoặc 30). */
export function lunarMonthLength(year: number, month: number, leap = false): number {
  lunarToSolar({ year, month, day: 1, leap }); // ném lỗi nếu tháng không tồn tại
  try {
    lunarToSolar({ year, month, day: 30, leap });
    return 30;
  } catch {
    return 29;
  }
}
