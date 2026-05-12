// 숫자를 통화 형식(원)으로 포맷팅 (예: 1,000,000)
export function formatCurrency(amount) {
  return new Intl.NumberFormat('ko-KR').format(amount || 0) + '원';
}

// YYYY-MM-DD 형태의 문자열을 받아 사용자 친화적인 형식으로 변환 (예: 5월 11일)
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 현재 월을 YYYY-MM 형식으로 반환
export function getCurrentMonthStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
