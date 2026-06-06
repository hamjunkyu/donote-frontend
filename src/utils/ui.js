// 진행률 미니 바 (대시보드, 통계 등에서 공통 사용)
export function miniBar(percent, color) {
  return `
    <div style="width: 100%; height: 6px; background: var(--color-background); border-radius: 3px; overflow: hidden; margin-top: 4px;">
      <div style="width: ${Math.min(percent, 100)}%; height: 100%; background: ${color};"></div>
    </div>
  `;
}

// 스켈레톤 로딩 행 묶음
export function skeletonRows(count) {
  return Array.from({ length: count }, () => '<div class="skeleton skeleton-row"></div>').join('');
}
