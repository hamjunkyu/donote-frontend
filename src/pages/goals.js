import { api, unwrapList } from '../api.js';
import { formatCurrency, escapeHtml } from '../utils/formatters.js';
import { createPageLayout, bindLayoutEvents } from '../utils/layout.js';

const STATUS_BADGE = {
  IN_PROGRESS: { bg: '#228be6', label: '진행중' },
  ACHIEVED: { bg: '#40c057', label: '달성!' },
  EXPIRED: { bg: '#868e96', label: '만료' },
  CANCELLED: { bg: '#fa5252', label: '취소' },
};

function statusBadge(status) {
  const s = STATUS_BADGE[status] || { bg: '#868e96', label: status };
  return `<span style="background: ${s.bg}; color: #fff; padding: 3px 9px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">${s.label}</span>`;
}

export function renderGoals() {
  const div = document.createElement('div');

  const contentHtml = `
    <div class="flex-between mb-4">
      <h2 style="font-size: 1.5rem;">저축 목표</h2>
      <button class="btn btn-primary" id="btn-add-goal" style="width: auto; padding: 0.4rem 1rem; font-size: 0.85rem;">목표 추가</button>
    </div>
    <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; overflow-x: auto;">
      <button class="filter-tab active" data-status="">전체</button>
      <button class="filter-tab" data-status="IN_PROGRESS">진행중</button>
      <button class="filter-tab" data-status="ACHIEVED">달성</button>
      <button class="filter-tab" data-status="EXPIRED">만료</button>
      <button class="filter-tab" data-status="CANCELLED">취소</button>
    </div>

    <div id="goal-list">
      <div class="text-center text-muted mt-4">로딩 중...</div>
    </div>

    <!-- 목표 생성/수정 모달 -->
    <dialog id="goal-modal" style="border: none; border-radius: var(--radius-lg); padding: var(--spacing-lg); width: 90%; max-width: 450px; box-shadow: var(--shadow-lg);">
      <h3 class="mb-4" id="goal-modal-title">새 목표 만들기</h3>
      <form id="goal-form">
        <div class="form-group">
          <label class="form-label">목표 이름</label>
          <input type="text" id="g-name" class="form-control" placeholder="예) 유럽 여행 자금" required maxlength="100" />
        </div>
        <div class="form-group">
          <label class="form-label">목표 금액</label>
          <input type="number" id="g-amount" class="form-control" placeholder="예) 3000000" min="1" step="1" required />
        </div>
        <div class="form-group">
          <label class="form-label">목표 기한 (선택)</label>
          <input type="date" id="g-date" class="form-control" />
        </div>
        <div class="form-group mb-4">
          <label class="form-label">설명 (선택)</label>
          <input type="text" id="g-desc" class="form-control" placeholder="목표에 대한 메모" maxlength="500" />
        </div>

        <input type="hidden" id="g-edit-id" value="" />
        <div class="flex-between">
          <button type="button" class="btn btn-outline" id="g-cancel" style="width: 48%;">취소</button>
          <button type="submit" class="btn btn-primary" id="g-submit" style="width: 48%;">목표 생성</button>
        </div>
      </form>
    </dialog>

    <!-- 목표 상세 모달 -->
    <dialog id="goal-detail-modal" style="border: none; border-radius: var(--radius-lg); padding: var(--spacing-lg); width: 90%; max-width: 500px; box-shadow: var(--shadow-lg); max-height: 85vh; overflow-y: auto;">
      <div id="goal-detail-content">
        <div class="text-center text-muted">로딩 중...</div>
      </div>
      <button type="button" class="btn btn-outline mt-4" id="detail-close" style="width: 100%;">닫기</button>
    </dialog>
  `;

  div.innerHTML = createPageLayout('goals', contentHtml);

  const listContainer = div.querySelector('#goal-list');
  const modal = div.querySelector('#goal-modal');
  const detailModal = div.querySelector('#goal-detail-modal');
  const addBtn = div.querySelector('#btn-add-goal');
  const form = div.querySelector('#goal-form');

  let currentFilter = '';
  let detailToken = 0; // 상세 모달 동시 로드 방지용 토큰 (최신 요청만 렌더)

  // 필터 탭
  div.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      div.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.status;
      loadGoals();
    });
  });

  const loadGoals = async () => {
    try {
      listContainer.innerHTML = '<div class="text-center text-muted mt-4">로딩 중...</div>';
      const url = currentFilter ? `/api/goals/?limit=100&status=${currentFilter}` : '/api/goals/?limit=100';
      const goals = unwrapList(await api.get(url));
      listContainer.innerHTML = '';

      if (goals.length === 0) {
        listContainer.innerHTML = '<div class="card text-center text-muted">등록된 목표가 없습니다.</div>';
        return;
      }

      goals.forEach(g => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.style.cursor = 'pointer';

        const currentAmount = g.current_amount ?? 0;
        const targetAmount = g.target_amount ?? 1;
        const percent = Math.min(100, Math.floor((currentAmount / targetAmount) * 100));
        const remaining = Math.max(0, targetAmount - currentAmount);

        let barColor = 'var(--color-primary)';
        if (percent >= 100 || g.status === 'ACHIEVED') barColor = '#40c057';
        else if (g.status === 'EXPIRED' || g.status === 'CANCELLED') barColor = '#868e96';
        else if (g.status === 'IN_PROGRESS' && g.on_track === false) barColor = '#fd7e14';

        // 진행 중이며 기한이 있으면 페이스(순조/지연) 힌트
        let paceHint = '';
        if (g.status === 'IN_PROGRESS' && g.on_track != null) {
          paceHint = g.on_track
            ? '<span class="text-income" style="font-size: 0.8rem;">순조</span>'
            : '<span class="text-expense" style="font-size: 0.8rem;">지연</span>';
        }

        card.innerHTML = `
          <div class="flex-between" style="margin-bottom: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 1.2rem;">
              ${escapeHtml(g.name)}
              ${statusBadge(g.status)}${paceHint}
            </div>
            <div class="text-muted" style="font-size: 0.9rem;">${percent}%</div>
          </div>
          <div class="flex-between" style="margin-bottom: 0.5rem; color: var(--color-text-secondary); font-size: 0.95rem;">
            <span><span style="font-weight: 600; color: var(--color-text-primary);">${formatCurrency(currentAmount)}</span> / ${formatCurrency(targetAmount)}</span>
            <span class="text-muted" style="font-size: 0.85rem;">남은 금액: ${formatCurrency(remaining)}</span>
          </div>
          <div style="width: 100%; height: 10px; background: #e9ecef; border-radius: 5px; overflow: hidden;">
            <div style="width: ${percent}%; height: 100%; background: ${barColor}; transition: width 0.5s ease;"></div>
          </div>
          <div class="flex-between mt-2" style="gap: 0.5rem;">
            <button class="btn-goal-edit text-primary" style="font-size: 0.8rem;">✏️ 수정</button>
            ${g.status === 'IN_PROGRESS' ? '<button class="btn-goal-cancel text-muted" style="font-size: 0.8rem;">⏸ 취소</button>' : ''}
            ${g.status === 'CANCELLED' ? '<button class="btn-goal-reactivate text-income" style="font-size: 0.8rem;">▶ 재개</button>' : ''}
            <button class="btn-goal-delete text-expense" style="font-size: 0.8rem;">🗑 삭제</button>
          </div>
        `;

        // 카드 클릭 → 상세
        card.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          openDetail(g.id);
        });

        card.querySelector('.btn-goal-edit').addEventListener('click', () => openEdit(g));

        const cancelBtn = card.querySelector('.btn-goal-cancel');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              await api.patch(`/api/goals/${g.id}/cancel`);
              loadGoals();
            } catch (err) {
              alert('취소 실패: ' + err.message);
            }
          });
        }

        const reactivateBtn = card.querySelector('.btn-goal-reactivate');
        if (reactivateBtn) {
          reactivateBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              await api.patch(`/api/goals/${g.id}/reactivate`);
              loadGoals();
            } catch (err) {
              alert('재개 실패: ' + err.message);
            }
          });
        }

        card.querySelector('.btn-goal-delete').addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!confirm('이 목표를 삭제할까요? 적립 내역도 함께 삭제됩니다.')) return;
          try {
            await api.delete(`/api/goals/${g.id}`);
            loadGoals();
          } catch (err) {
            alert('삭제 실패: ' + err.message);
          }
        });

        listContainer.appendChild(card);
      });
    } catch (err) {
      listContainer.innerHTML = '<div class="alert alert-important">목표를 불러오지 못했습니다.</div>';
    }
  };

  // 상세 모달 (진행률 + 적립하기 + 예상 + 적립 내역)
  async function openDetail(goalId) {
    const content = div.querySelector('#goal-detail-content');
    content.innerHTML = '<div class="text-center text-muted">로딩 중...</div>';
    // 적립 추가/삭제 후 새로고침으로 재호출될 때는 이미 열려 있으므로 showModal 재호출 금지(이미 열린 dialog는 예외 발생)
    if (!detailModal.open) detailModal.showModal();
    const myToken = ++detailToken;

    try {
      const [progress, forecast, contribRes] = await Promise.all([
        api.get(`/api/goals/${goalId}/progress`),
        api.get(`/api/goals/${goalId}/forecast`).catch(() => null),
        api.get(`/api/goals/${goalId}/contributions?limit=100`).catch(() => []),
      ]);
      // 응답 대기 중 모달이 닫히거나 다른(또는 같은) 목표로 재진입했으면 최신 요청만 렌더
      if (myToken !== detailToken || !detailModal.open) return;
      const contributions = unwrapList(contribRes);

      const canContribute = progress.status !== 'ACHIEVED' && progress.status !== 'CANCELLED';

      let forecastHtml = '';
      if (forecast) {
        forecastHtml = `
          <div class="card mt-4">
            <div class="card-title">🔮 예상 달성 정보</div>
            <div class="flex-between mb-2">
              <span class="text-muted">일평균 적립액</span>
              <span style="font-weight: 600;">${formatCurrency(forecast.daily_average)}</span>
            </div>
            ${forecast.forecast_date ? `
            <div class="flex-between mb-2">
              <span class="text-muted">예상 달성일</span>
              <span style="font-weight: 600;">${forecast.forecast_date}</span>
            </div>` : ''}
            ${forecast.days_to_achievement !== null ? `
            <div class="flex-between mb-2">
              <span class="text-muted">달성까지</span>
              <span style="font-weight: 600;">${forecast.days_to_achievement}일</span>
            </div>` : ''}
            ${forecast.on_track !== null ? `
            <div class="flex-between">
              <span class="text-muted">목표 기한 내 달성</span>
              <span style="font-weight: 600; color: ${forecast.on_track ? '#40c057' : '#fa5252'};">
                ${forecast.on_track ? '✅ 가능' : '⚠️ 어려움'}
              </span>
            </div>` : ''}
          </div>
        `;
      }

      const contribItems = contributions.length > 0
        ? contributions.map(c => `
            <div class="flex-between" style="padding: 0.5rem 0; border-bottom: 1px solid var(--color-border);">
              <div>
                <div style="font-size: 0.9rem;">${escapeHtml(c.memo || '적립')}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${c.contributed_at}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <span style="font-weight: 600;" class="text-income">+${formatCurrency(c.amount)}</span>
                <button class="btn-contrib-delete text-muted" data-cid="${c.id}" style="font-size: 0.8rem;" aria-label="적립 삭제">✕</button>
              </div>
            </div>
          `).join('')
        : '<div class="text-center text-muted" style="padding: 0.5rem 0;">아직 적립 내역이 없습니다.</div>';

      const barColor = progress.status === 'ACHIEVED' ? '#40c057' : 'var(--color-primary)';
      const pct = Math.min(progress.progress_percentage, 100);

      content.innerHTML = `
        <div style="text-align: center; margin-bottom: 1rem;">
          <div style="font-size: 2.5rem; font-weight: 700; color: var(--color-primary);">${progress.progress_percentage}%</div>
          ${statusBadge(progress.status)}
        </div>

        <div class="card">
          <div class="flex-between mb-2">
            <span class="text-muted">현재 적립</span>
            <span style="font-weight: 600;">${formatCurrency(progress.current_amount)}</span>
          </div>
          <div class="flex-between mb-2">
            <span class="text-muted">목표 금액</span>
            <span style="font-weight: 600;">${formatCurrency(progress.target_amount)}</span>
          </div>
          <div class="flex-between mb-2">
            <span class="text-muted">남은 금액</span>
            <span style="font-weight: 600;">${formatCurrency(progress.remaining_amount)}</span>
          </div>
          ${progress.days_remaining !== null ? `
          <div class="flex-between mb-2">
            <span class="text-muted">남은 기간</span>
            <span style="font-weight: 600;">${progress.days_remaining}일</span>
          </div>` : ''}
          <div style="width: 100%; height: 12px; background: #e9ecef; border-radius: 6px; overflow: hidden; margin-top: 0.5rem;">
            <div style="width: ${pct}%; height: 100%; background: ${barColor}; transition: width 0.5s ease;"></div>
          </div>
        </div>

        ${canContribute ? `
        <div class="card mt-4">
          <div class="card-title">💰 적립하기</div>
          <form id="contrib-form">
            <div style="display: flex; gap: 0.5rem;">
              <input type="number" id="contrib-amount" class="form-control" min="1" step="1" placeholder="적립 금액" required style="flex: 1;" />
              <button type="submit" class="btn btn-primary" id="contrib-submit" style="width: auto; padding: 0 1.2rem;">적립</button>
            </div>
            <input type="text" id="contrib-memo" class="form-control" placeholder="메모 (선택)" maxlength="200" style="margin-top: 0.5rem;" />
          </form>
        </div>` : ''}

        ${progress.status === 'CANCELLED' ? `
        <div class="card mt-4 text-center">
          <div class="text-muted mb-4" style="font-size: 0.9rem;">취소된 목표입니다. 재개하면 적립 기록과 진행률이 그대로 복원됩니다.</div>
          <button class="btn btn-primary" id="detail-reactivate" style="width: auto; padding: 0.5rem 1.25rem;">▶ 목표 재개</button>
        </div>` : ''}

        ${forecastHtml}

        <div class="card mt-4">
          <div class="card-title">📒 적립 내역</div>
          ${contribItems}
        </div>
      `;

      // 상세 모달 내 재개 버튼
      const detailReactivate = content.querySelector('#detail-reactivate');
      if (detailReactivate) {
        detailReactivate.addEventListener('click', async () => {
          detailReactivate.disabled = true;
          try {
            await api.patch(`/api/goals/${goalId}/reactivate`);
            openDetail(goalId);
            loadGoals();
          } catch (err) {
            detailReactivate.disabled = false;
            alert('재개 실패: ' + err.message);
          }
        });
      }

      // 적립하기 제출
      const contribForm = content.querySelector('#contrib-form');
      if (contribForm) {
        contribForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (contribForm.dataset.submitting) return; // Enter 연타 등 중복 제출 방지
          contribForm.dataset.submitting = '1';
          const btn = content.querySelector('#contrib-submit');
          btn.disabled = true;
          const amount = parseInt(content.querySelector('#contrib-amount').value, 10);
          const memo = content.querySelector('#contrib-memo').value.trim();
          const payload = { amount };
          if (memo) payload.memo = memo;
          try {
            await api.post(`/api/goals/${goalId}/contributions`, payload);
            openDetail(goalId); // 상세 갱신 (성공 시 폼이 새로 렌더되어 플래그도 초기화됨)
            loadGoals();        // 목록 카드 진행률 갱신
          } catch (err) {
            alert('적립 실패: ' + err.message);
            btn.disabled = false;
            delete contribForm.dataset.submitting;
          }
        });
      }

      // 적립 삭제
      content.querySelectorAll('.btn-contrib-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('이 적립 기록을 삭제할까요?')) return;
          btn.disabled = true;
          try {
            await api.delete(`/api/goals/${goalId}/contributions/${btn.dataset.cid}`);
            openDetail(goalId);
            loadGoals();
          } catch (err) {
            btn.disabled = false;
            alert('삭제 실패: ' + err.message);
          }
        });
      });
    } catch (err) {
      content.innerHTML = '<div class="text-center text-expense">상세 정보를 불러오지 못했습니다.</div>';
    }
  }

  div.querySelector('#detail-close').addEventListener('click', () => detailModal.close());

  // 수정 모달 열기
  function openEdit(goal) {
    div.querySelector('#goal-modal-title').textContent = '목표 수정';
    div.querySelector('#g-submit').textContent = '수정 저장';
    div.querySelector('#g-edit-id').value = goal.id;
    div.querySelector('#g-name').value = goal.name;
    div.querySelector('#g-amount').value = goal.target_amount;
    div.querySelector('#g-date').value = goal.target_date || '';
    div.querySelector('#g-desc').value = goal.description || '';
    modal.showModal();
  }

  // 생성 버튼
  addBtn.addEventListener('click', () => {
    div.querySelector('#goal-modal-title').textContent = '새 목표 만들기';
    div.querySelector('#g-submit').textContent = '목표 생성';
    div.querySelector('#g-edit-id').value = '';
    form.reset();
    modal.showModal();
  });

  div.querySelector('#g-cancel').addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = div.querySelector('#g-submit');
    btnSubmit.disabled = true;

    const editId = div.querySelector('#g-edit-id').value;
    const payload = {
      name: div.querySelector('#g-name').value,
      target_amount: parseInt(div.querySelector('#g-amount').value, 10),
    };
    const dateVal = div.querySelector('#g-date').value;
    if (dateVal) payload.target_date = dateVal;
    const descVal = div.querySelector('#g-desc').value;
    if (descVal) payload.description = descVal;

    try {
      if (editId) {
        await api.patch(`/api/goals/${editId}`, payload);
      } else {
        await api.post('/api/goals/', payload);
      }
      modal.close();
      loadGoals();
    } catch (err) {
      alert((editId ? '수정' : '생성') + ' 실패: ' + err.message);
    } finally {
      btnSubmit.disabled = false;
    }
  });

  loadGoals();
  bindLayoutEvents(div);

  return div;
}
