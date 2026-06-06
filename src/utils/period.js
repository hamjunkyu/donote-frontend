import { getCurrentMonthStr } from './formatters.js';

// 대시보드, 통계, 예산이 공유하는 '선택된 월' 상태 (탭 세션 동안 유지)
const STORAGE_KEY = 'selected_month';

export function getSelectedMonth() {
  return sessionStorage.getItem(STORAGE_KEY) || getCurrentMonthStr();
}

export function setSelectedMonth(month) {
  sessionStorage.setItem(STORAGE_KEY, month);
}

// 'YYYY-MM'에서 delta 만큼 이동한 'YYYY-MM' 반환
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(month) {
  const [y, m] = month.split('-');
  return `${y}년 ${parseInt(m, 10)}월`;
}
