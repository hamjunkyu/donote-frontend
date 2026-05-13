export function createPageLayout(activeNav, contentHtml) {
  const navItems = [
    { id: 'dashboard', href: '#/', icon: '📊', label: '홈' },
    { id: 'transactions', href: '#/transactions', icon: '📝', label: '내역' },
    { id: 'statistics', href: '#/statistics', icon: '📈', label: '통계' },
    { id: 'budget', href: '#/budget', icon: '🎯', label: '예산' },
    { id: 'settlements', href: '#/settlements', icon: '🤝', label: '정산' },
    { id: 'goals', href: '#/goals', icon: '🏆', label: '목표' },
    { id: 'import', href: '#/import', icon: '📥', label: '가져오기' },
    { id: 'categories', href: '#/categories', icon: '🏷️', label: '카테고리' },
    { id: 'notifications', href: '#/notifications', icon: '🔔', label: '알림' }
  ];

  // 모바일 하단 네비게이션용 (핵심 기능만)
  const mobileNavItems = [
    { id: 'dashboard', href: '#/', icon: '📊', label: '홈' },
    { id: 'transactions', href: '#/transactions', icon: '📝', label: '내역' },
    { id: 'statistics', href: '#/statistics', icon: '📈', label: '통계' },
    { id: 'budget', href: '#/budget', icon: '🎯', label: '예산' },
    { id: 'goals', href: '#/goals', icon: '🏆', label: '목표' }
  ];

  const sidebarLinksHtml = navItems.map(item => `
    <a href="${item.href}" class="sidebar-link ${activeNav === item.id ? 'active' : ''}">
      <span class="nav-label">${item.label}</span>
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
        <!-- Mobile Header (Visible only on mobile) -->
        <header class="mobile-header" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--spacing-md); margin-bottom: var(--spacing-md); border-bottom: 1px solid var(--color-border);">
          <div style="font-weight: 800; font-size: 1.25rem; color: var(--color-primary);">💰 Donote</div>
          <div style="display: flex; gap: 12px; align-items: center;">
             <a href="#/notifications" style="font-size: 1.25rem; text-decoration: none;">🔔</a>
             <button id="btn-logout-mobile" style="font-size: 0.8rem; color: var(--color-text-secondary); text-decoration: underline;">로그아웃</button>
          </div>
        </header>
        
        ${contentHtml}
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
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.hash = '#/login';
      });
    }
  });
  
  // 모바일 헤더는 데스크탑에서 숨김
  const mobileHeader = container.querySelector('.mobile-header');
  if (mobileHeader) {
      if (window.innerWidth > 768) {
          mobileHeader.style.display = 'none';
      }
      
      window.addEventListener('resize', () => {
         if (window.innerWidth > 768) {
             mobileHeader.style.display = 'none';
         } else {
             mobileHeader.style.display = 'flex';
         }
      });
  }
}
