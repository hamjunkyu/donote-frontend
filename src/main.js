import './styles/variables.css';
import './styles/reset.css';
import './styles/components.css';

import { initRouter, registerRoute } from './router.js';
import { renderLogin } from './pages/login.js';
import { renderSignup } from './pages/signup.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactions } from './pages/transactions.js';
import { renderBudget } from './pages/budget.js';
import { renderStatistics } from './pages/statistics.js';
import { renderSettlements } from './pages/settlements.js';
import { renderNotifications } from './pages/notifications.js';
import { renderGoals } from './pages/goals.js';

// 라우트 등록
registerRoute('/login', renderLogin);
registerRoute('/signup', renderSignup);
registerRoute('/', renderDashboard);
registerRoute('/transactions', renderTransactions);
registerRoute('/statistics', renderStatistics);
registerRoute('/budget', renderBudget);
registerRoute('/settlements', renderSettlements);
registerRoute('/notifications', renderNotifications);
registerRoute('/goals', renderGoals);

import { api } from './api.js';

export async function updateNotificationBadge() {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  try {
    const notifications = await api.get('/api/notifications');
    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    document.querySelectorAll('a[href="#/notifications"]').forEach(el => {
      if (unreadCount > 0) {
        el.innerHTML = `알림 <span class="notification-badge" style="background: #fa5252; color: white; border-radius: 50%; padding: 2px 6px; font-size: 0.7rem; margin-left: 4px; animation: pulse 1.5s infinite; font-weight: bold; display: inline-block;">${unreadCount}</span>`;
      } else {
        el.innerHTML = `알림`;
      }
    });
  } catch (e) {
    console.error('Failed to update notification badge', e);
  }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
  const app = document.querySelector('#app');
  initRouter(app);

  // Update badge on load and hash change
  window.addEventListener('hashchange', () => setTimeout(updateNotificationBadge, 50));
  window.addEventListener('load', () => setTimeout(updateNotificationBadge, 50));
  setTimeout(updateNotificationBadge, 200); // 초기 실행
});
