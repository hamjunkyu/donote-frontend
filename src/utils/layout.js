import { api } from '../api.js';
import { reloadCurrentRoute } from '../router.js';
import { getSelectedMonth, setSelectedMonth, shiftMonth, formatMonthLabel } from './period.js';

// 월 선택기를 노출할 페이지 (기간 기반 화면)
const MONTH_NAV_PAGES = ['dashboard', 'statistics', 'budget'];

// 로그인 사용자 정보 캐시 (SPA 세션 동안 /api/auth/me 1회만 호출)
let cachedUser = null;

export function createPageLayout(activeNav, contentHtml) {
  const navItems = [
    { id: 'dashboard', href: '#/', icon: '📊', label: '홈' },
    { id: 'transactions', href: '#/transactions', icon: '📝', label: '거래 내역' },
    { id: 'statistics', href: '#/statistics', icon: '📈', label: '통계' },
    { id: 'budget', href: '#/budget', icon: '🎯', label: '예산' },
    { id: 'settlements', href: '#/settlements', icon: '🤝', label: '정산' },
    { id: 'goals', href: '#/goals', icon: '🏆', label: '목표' },
    { id: 'import', href: '#/import', icon: '📥', label: '가져오기' },
    { id: 'categories', href: '#/categories', icon: '🏷️', label: '카테고리' },
    { id: 'notifications', href: '#/notifications', icon: '🔔', label: '알림' }
  ];

  // 모바일 하단 네비게이션용 (핵심 기능만, 아이콘 있어 짧은 라벨 사용)
  const mobileNavItems = [
    { id: 'dashboard', href: '#/', icon: '📊', label: '홈' },
    { id: 'transactions', href: '#/transactions', icon: '📝', label: '내역' },
    { id: 'statistics', href: '#/statistics', icon: '📈', label: '통계' },
    { id: 'budget', href: '#/budget', icon: '🎯', label: '예산' },
    { id: 'goals', href: '#/goals', icon: '🏆', label: '목표' }
  ];

  const currentTitle = (navItems.find(i => i.id === activeNav) || {}).label || 'Donote';
  const showMonthNav = MONTH_NAV_PAGES.includes(activeNav);
  const monthNavHtml = showMonthNav ? `
    <div class="month-nav">
      <button class="month-nav-btn" id="month-prev" aria-label="이전 달">‹</button>
      <span class="month-nav-label">${formatMonthLabel(getSelectedMonth())}</span>
      <button class="month-nav-btn" id="month-next" aria-label="다음 달">›</button>
    </div>` : '';

  const sidebarLinksHtml = navItems.map(item => `
    <a href="${item.href}" class="sidebar-link ${activeNav === item.id ? 'active' : ''}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
      ${item.id === 'notifications' ? '<span class="unread-count"></span>' : ''}
    </a>
  `).join('');

  const bottomLinksHtml = mobileNavItems.map(item => `
    <a href="${item.href}" class="bottom-nav-item ${activeNav === item.id ? 'active' : ''}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </a>
  `).join('');

  return `
    <div class="app-layout">
      <!-- Desktop Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-logo">
          Donote
        </div>
        <nav class="sidebar-nav">
          ${sidebarLinksHtml}
        </nav>
        <div style="margin-top: auto; padding: var(--spacing-lg);">
          <button id="btn-logout" class="btn btn-outline" style="width: 100%; font-size: 0.85rem; padding: 0.5rem;">
            로그아웃
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Desktop Header -->
        <header class="app-header">
          <div class="app-header-inner">
            <div class="app-header-left">
              <div class="app-header-title">${currentTitle}</div>
              ${monthNavHtml}
            </div>
            <div class="app-header-actions">
              <button id="btn-quick-add" class="btn btn-primary app-header-add">+ 거래 추가</button>
              <a href="#/notifications" class="app-header-bell" aria-label="알림">🔔<span class="unread-count"></span></a>
              <span id="header-username" class="app-header-user"></span>
            </div>
          </div>
        </header>

        <!-- Mobile Header (Visible only on mobile) -->
        <header class="mobile-header">
          <div class="mobile-header-title">💰 Donote</div>
          <div class="mobile-header-actions">
             <a href="#/notifications" class="mobile-header-bell" aria-label="알림">🔔<span class="unread-count"></span></a>
             <button id="btn-logout-mobile" class="mobile-header-logout">로그아웃</button>
          </div>
        </header>

        <div class="content-area">
          ${contentHtml}
        </div>
      </main>

      <!-- Mobile Bottom Nav -->
      <nav class="bottom-nav">
        <div class="bottom-nav-list">
          ${bottomLinksHtml}
        </div>
      </nav>
    </div>
  `;
}

export function bindLayoutEvents(container) {
  const logoutBtns = container.querySelectorAll('#btn-logout, #btn-logout-mobile');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.hash = '#/login';
    });
  });

  // 헤더 사용자 이름
  const userEl = container.querySelector('#header-username');
  if (userEl) {
    if (cachedUser) {
      userEl.textContent = cachedUser.name;
    } else {
      api.get('/api/auth/me')
        .then(u => { cachedUser = u; userEl.textContent = u.name; })
        .catch(() => {});
    }
  }

  // 빠른 거래 추가: 거래 페이지로 이동하며 추가 모달 자동 오픈
  const quickAdd = container.querySelector('#btn-quick-add');
  if (quickAdd) {
    quickAdd.addEventListener('click', () => {
      const addBtn = container.querySelector('#btn-add-tx');
      if (addBtn) {
        // 이미 거래 페이지면 hash가 안 바뀌어 재렌더가 없으므로 추가 버튼을 직접 클릭
        addBtn.click();
      } else {
        sessionStorage.setItem('open_tx_modal', '1');
        window.location.hash = '#/transactions';
      }
    });
  }

  // 월 이동: 선택 월 변경 후 현재 페이지 재렌더로 데이터 갱신
  const monthPrev = container.querySelector('#month-prev');
  const monthNext = container.querySelector('#month-next');
  if (monthPrev) {
    monthPrev.addEventListener('click', () => {
      setSelectedMonth(shiftMonth(getSelectedMonth(), -1));
      reloadCurrentRoute();
    });
  }
  if (monthNext) {
    monthNext.addEventListener('click', () => {
      setSelectedMonth(shiftMonth(getSelectedMonth(), 1));
      reloadCurrentRoute();
    });
  }
}
