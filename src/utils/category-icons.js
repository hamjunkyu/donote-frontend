import { escapeHtml } from './formatters.js';

export const CATEGORY_ICONS = {
  // 시스템 기본 카테고리 (지출)
  '식비': '🍔',
  '카페/간식': '☕',
  '교통': '🚗',
  '생활/마트': '🛒',
  '쇼핑': '🛍️',
  '주거/통신': '🏠',
  '의료/건강': '🏥',
  '문화/여가': '🎬',
  '교육': '📚',
  '경조사/회비': '💌',
  // 시스템 기본 카테고리 (수입)
  '급여/알바': '💰',
  '용돈': '💵',
  '금융소득': '📈',
  // '기타'(지출/수입)는 유형별 기본 아이콘으로 폴백
  // 사용자 커스텀 카테고리에서 흔히 쓰는 이름
  '저축': '🏦',
  '보험': '🛡️',
  '카페': '☕',
  '간식': '🍪',
  '마트': '🛒',
  '생활': '🧻',
  '생활용품': '🧻',
  '주거': '🏠',
  '통신': '📱',
  '관리비': '⚡',
  '의료': '🏥',
  '건강': '💊',
  '문화': '🎬',
  '여가': '🎮',
  '여행': '✈️',
  '데이트': '❤️',
  '경조사': '💌',
  '회비': '🤝',
  '급여': '💰',
  '기타수익': '💵',
  '육아': '🍼',
  '반려동물': '🐶',
  '자동차': '⛽'
};

/**
 * 카테고리 이름과 타입에 따른 이모지를 반환합니다.
 * @param {string} categoryName - 카테고리 이름
 * @param {string} type - 'INCOME' 또는 'EXPENSE'
 * @returns {string} 이모지 문자
 */
export function getCategoryIcon(categoryName, type) {
  if (categoryName && CATEGORY_ICONS[categoryName]) {
    return CATEGORY_ICONS[categoryName];
  }
  return type === 'INCOME' ? '💰' : '💸';
}

/**
 * 카테고리명과 이모지를 포함한 HTML 요소를 렌더링합니다.
 * @param {string} categoryName - 카테고리 이름
 * @param {string} type - 'INCOME' 또는 'EXPENSE'
 * @returns {string} HTML 문자열
 */
export function renderCategoryWithIcon(categoryName, type) {
  const icon = getCategoryIcon(categoryName, type);
  return `
    <span style="display: inline-flex; align-items: center; gap: 0.3rem;">
      <span class="category-icon" style="
        background: var(--color-background);
        border: 1px solid var(--color-border);
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
      ">${icon}</span>
      <span style="font-weight: 500;">${escapeHtml(categoryName || '미분류')}</span>
    </span>
  `;
}
