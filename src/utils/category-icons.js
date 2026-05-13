export const CATEGORY_ICONS = {
  '식비': '🍔',
  '교통': '🚗',
  '쇼핑': '🛒',
  '급여': '💰',
  '기타수익': '💵',
  '교육': '📚',
  '의료': '🏥',
  '건강': '💊',
  '여행': '✈️',
  '주거': '🏠',
  '관리비': '⚡',
  '통신': '📱',
  '문화': '🎬',
  '여가': '🎮',
  '데이트': '❤️',
  '생활용품': '🧻',
  '경조사': '💌',
  '육아': '🍼',
  '반려동물': '🐶',
  '자동차': '⛽',
  '저축': '🏦',
  '보험': '🛡️'
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
      <span style="font-weight: 500;">${categoryName || '미분류'}</span>
    </span>
  `;
}
