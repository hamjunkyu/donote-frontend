import { api, unwrapList } from '../api.js';
import { escapeHtml } from '../utils/formatters.js';
import { createPageLayout, bindLayoutEvents } from '../utils/layout.js';
import { skeletonRows } from '../utils/ui.js';

const TITLE_MAP = {
  BUDGET_EXCEEDED: '🚨 예산 100% 초과',
  BUDGET_WARNING: '⚠️ 예산 80% 도달',
  SETTLEMENT_REQUEST: '💸 정산 요청',
  SETTLEMENT_COMPLETED: '✅ 정산 완료',
  GOAL_MILESTONE: '🚩 목표 마일스톤 달성',
  GOAL_ACHIEVED: '🎉 목표 달성',
};

export function renderNotifications() {
  const div = document.createElement('div');

  const contentHtml = `
    <div class="flex-between mb-4">
      <h2 style="font-size: 1.5rem;">알림</h2>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <div class="seg-toggle" id="noti-filter">
          <button data-unread="" class="active">전체</button>
          <button data-unread="true">안 읽음</button>
        </div>
        <button class="btn btn-outline" id="btn-read-all" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.85rem;">모두 읽음</button>
      </div>
    </div>
    <div id="notification-list">
      <div class="text-center text-muted mt-4">로딩 중...</div>
    </div>
  `;

  div.innerHTML = createPageLayout('notifications', contentHtml);

  const listContainer = div.querySelector('#notification-list');
  let unreadOnly = false;

  // 알림 변경(읽음/삭제) 후 헤더 배지를 갱신하도록 신호
  const refreshBadge = () => window.dispatchEvent(new Event('route:rendered'));

  const loadNotifications = async () => {
    listContainer.innerHTML = skeletonRows(4);
    try {
      const notifications = unwrapList(await api.get(`/api/notifications?limit=100${unreadOnly ? '&unread=true' : ''}`));
      listContainer.innerHTML = '';

      if (notifications.length === 0) {
        listContainer.innerHTML = `<div class="card text-center text-muted">${unreadOnly ? '안 읽은 알림이 없습니다.' : '새로운 알림이 없습니다.'}</div>`;
        return;
      }

      notifications.forEach(noti => {
        const card = document.createElement('div');
        card.className = 'card mb-2';
        card.style.cursor = noti.is_read ? 'default' : 'pointer';
        if (!noti.is_read) {
          card.style.borderLeft = '4px solid var(--color-primary)';
        } else {
          card.style.opacity = '0.6';
        }

        const dateObj = new Date(noti.created_at);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const title = TITLE_MAP[noti.type] || '알림';

        card.innerHTML = `
          <div class="flex-between">
            <span style="font-weight: 600;">${title}</span>
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span class="text-muted" style="font-size: 0.75rem;">${dateStr}</span>
              <button class="btn-noti-delete text-muted" style="font-size: 0.9rem;" aria-label="삭제">✕</button>
            </div>
          </div>
          <div class="mt-2" style="font-size: 0.9rem;">
            ${escapeHtml(noti.message)}
          </div>
        `;

        // 카드 클릭 → 읽음 처리
        card.addEventListener('click', async () => {
          if (noti.is_read) return;
          try {
            await api.patch(`/api/notifications/${noti.id}/read`);
            loadNotifications();
            refreshBadge();
          } catch (err) {
            console.error('알림 읽음 처리 실패', err);
          }
        });

        // 삭제
        card.querySelector('.btn-noti-delete').addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await api.delete(`/api/notifications/${noti.id}`);
            loadNotifications();
            refreshBadge();
          } catch (err) {
            alert('삭제 실패: ' + err.message);
          }
        });

        listContainer.appendChild(card);
      });
    } catch (err) {
      listContainer.innerHTML = '<div class="alert alert-important">알림을 불러오지 못했습니다.</div>';
    }
  };

  // 필터 토글
  div.querySelectorAll('#noti-filter button').forEach(btn => {
    btn.addEventListener('click', () => {
      div.querySelectorAll('#noti-filter button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      unreadOnly = btn.dataset.unread === 'true';
      loadNotifications();
    });
  });

  // 모두 읽음
  div.querySelector('#btn-read-all').addEventListener('click', async () => {
    try {
      await api.patch('/api/notifications/read-all');
      loadNotifications();
      refreshBadge();
    } catch (err) {
      alert('처리 실패: ' + err.message);
    }
  });

  loadNotifications();
  bindLayoutEvents(div);

  return div;
}
