import { jdn, type LunarDate, type SolarDate } from './lunar.ts';

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

const name = (can: number, chi: number) => `${CAN[can % 10]} ${CHI[chi % 12]}`;

/** Can Chi của năm âm lịch. */
export const canChiYear = (lunarYear: number) => name(lunarYear + 6, lunarYear + 8);

/** Can Chi của tháng âm lịch; tháng nhuận dùng chung Can Chi với tháng thường cùng số. */
export const canChiMonth = ({ year, month }: Pick<LunarDate, 'year' | 'month'>) =>
  name(year * 12 + month + 3, month + 1);

/** Can Chi của ngày (không phụ thuộc lịch âm, chỉ cần ngày dương). */
export const canChiDay = (date: SolarDate) => {
  const n = jdn(date);
  return name(n + 9, n + 1);
};
