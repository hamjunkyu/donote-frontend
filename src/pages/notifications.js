import { api } from '../api.js';
import { escapeHtml } from '../utils/formatters.js';
import { createPageLayout, bindLayoutEvents } from '../utils/layout.js';

export function renderNotifications() {
  const div = document.createElement('div');
  
  const contentHtml = `
    <div class="flex-between mb-4">
      <h2 style="font-size: 1.5rem;">새로운 소식</h2>
    </div>
      <div id="notification-list">
        <div class="text-center text-muted mt-4">로딩 중...</div>
      </div>
  `;

  div.innerHTML = createPageLayout('notifications', contentHtml);

  const listContainer = div.querySelector('#notification-list');

  const loadNotifications = async () => {
    try {
      const notifications = await api.get('/api/notifications');
      listContainer.innerHTML = '';

      if (!notifications || notifications.length === 0) {
        listContainer.innerHTML = '<div class="card text-center text-muted">새로운 알림이 없습니다.</div>';
        return;
      }

      notifications.forEach(noti => {
        const card = document.createElement('div');
        card.className = 'card mb-2';
        card.style.cursor = 'pointer';
        
        if (!noti.is_read) {
          card.style.borderLeft = '4px solid var(--color-primary)';
        } else {
          card.style.opacity = '0.6';
        }

        const dateObj = new Date(noti.created_at);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        let title = '알림';
        if (noti.type === 'BUDGET_EXCEEDED') title = '🚨 예산 100% 초과';
        else if (noti.type === 'BUDGET_WARNING') title = '⚠️ 예산 80% 도달';
        else if (noti.type === 'SETTLEMENT_REQUEST') title = '💸 정산 요청';
        else if (noti.type === 'SETTLEMENT_COMPLETED') title = '✅ 정산 완료';
        else if (noti.type === 'GOAL_MILESTONE') title = '🚩 목표 마일스톤 달성';
        else if (noti.type === 'GOAL_ACHIEVED') title = '🎉 목표 달성';

        card.innerHTML = `
          <div class="flex-between">
            <span style="font-weight: 600;">${title}</span>
            <span class="text-muted" style="font-size: 0.75rem;">${dateStr}</span>
          </div>
          <div class="mt-2" style="font-size: 0.9rem;">
            ${escapeHtml(noti.message)}
          </div>
        `;

        card.addEventListener('click', async () => {
          if (!noti.is_read) {
            try {
              await api.patch(`/api/notifications/${noti.id}/read`);
              loadNotifications();
            } catch (err) {
              console.error('알림 읽음 처리 실패', err);
            }
          }
        });

        listContainer.appendChild(card);
      });
    } catch (err) {
      listContainer.innerHTML = '<div class="alert alert-important">알림을 불러오지 못했습니다.</div>';
    }
  };

  loadNotifications();
  bindLayoutEvents(div);

  return div;
}
