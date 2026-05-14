import { api } from '../api.js';
import { formatCurrency, escapeHtml } from '../utils/formatters.js';
import { createPageLayout, bindLayoutEvents } from '../utils/layout.js';

export function renderGoals() {
  const div = document.createElement('div');
  
  const contentHtml = `
    <!-- 상태 필터 탭 -->
    <div class="flex-between mb-4">
      <h2 style="font-size: 1.5rem;">저축 목표</h2>
      <button class="btn btn-primary" id="btn-add-goal" style="width: auto; padding: 0.4rem 1rem; font-size: 0.85rem;">목표 추가</button>
    </div>
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; overflow-x: auto;">
        <button class="filter-tab active" data-status="">전체</button>
        <button class="filter-tab" data-status="IN_PROGRESS">진행중</button>
        <button class="filter-tab" data-status="ACHIEVED">달성</button>
        <button class="filter-tab" data-status="BEHIND">뒤처짐</button>
        <button class="filter-tab" data-status="EXPIRED">만료</button>
        <button class="filter-tab" data-status="CANCELLED">취소</button>
      </div>
      
      <div id="goal-list">
        <div class="text-center text-muted mt-4">로딩 중...</div>
      </div>

      <!-- 목표 생성 모달 -->
      <dialog id="goal-modal" style="border: none; border-radius: var(--radius-lg); padding: var(--spacing-lg); width: 90%; max-width: 450px; box-shadow: var(--shadow-lg);">
        <h3 class="mb-4" id="goal-modal-title">새 목표 만들기</h3>
        <form id="goal-form">
          <div class="form-group">
            <label class="form-label">목표 이름</label>
            <input type="text" id="g-name" class="form-control" placeholder="예) 여행자금" required />
          </div>
          <div class="form-group">
            <label class="form-label">목표 금액</label>
            <input type="number" id="g-amount" class="form-control" placeholder="예) 1000000" min="1" required />
          </div>
          <div class="form-group">
            <label class="form-label">목표 기한 (선택)</label>
            <input type="date" id="g-date" class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">설명 (선택)</label>
            <input type="text" id="g-desc" class="form-control" placeholder="목표에 대한 메모" />
          </div>
          <div class="form-group mb-4">
            <label class="form-label">연동할 카테고리</label>
            <select id="g-category" class="form-control" required>
              <option value="">불러오는 중...</option>
            </select>
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
    </main>
  `;

  div.innerHTML = createPageLayout('goals', contentHtml);

  const listContainer = div.querySelector('#goal-list');
  const modal = div.querySelector('#goal-modal');
  const detailModal = div.querySelector('#goal-detail-modal');
  const addBtn = div.querySelector('#btn-add-goal');
  const form = div.querySelector('#goal-form');
  const categorySelect = div.querySelector('#g-category');

  let currentFilter = '';

  // 상태 뱃지 헬퍼
  function statusBadge(status) {
    const map = {
      'IN_PROGRESS': { bg: '#fcc419', label: '진행중' },
      'ACHIEVED':    { bg: '#40c057', label: '달성!' },
      'BEHIND':      { bg: '#fd7e14', label: '뒤처짐' },
      'EXPIRED':     { bg: '#868e96', label: '만료' },
      'CANCELLED':   { bg: '#fa5252', label: '취소' },
      'ON_TRACK':    { bg: '#228be6', label: '순조로움' },
    };
    const s = map[status] || { bg: '#868e96', label: status };
    return `<span style="background: ${s.bg}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${s.label}</span>`;
  }

  // 필터 탭 이벤트
  div.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      div.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.status;
      loadGoals();
    });
  });

  const loadCategories = async () => {
    try {
      const categories = await api.get('/api/categories/');
      categorySelect.innerHTML = '<option value="">-- 연동할 카테고리 선택 --</option>';
      categories
        .filter(c => c.type === 'INCOME')
        .forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.name;
          categorySelect.appendChild(opt);
        });
    } catch (err) {
      categorySelect.innerHTML = '<option value="">카테고리 로드 실패</option>';
    }
  };

  const loadGoals = async () => {
    try {
      const url = currentFilter ? `/api/goals/?status=${currentFilter}` : '/api/goals/';
      const goals = await api.get(url);
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
        if (percent >= 100) barColor = '#40c057';
        else if (g.status === 'BEHIND') barColor = '#fd7e14';
        else if (g.status === 'EXPIRED' || g.status === 'CANCELLED') barColor = '#868e96';

        card.innerHTML = `
          <div class="flex-between mb-2">
            <div style="font-weight: 600; font-size: 1.1rem;">
              ${escapeHtml(g.name)}
              ${statusBadge(g.status)}
            </div>
            <div class="text-muted" style="font-size: 0.85rem;">
              ${percent}%
            </div>
          </div>
          <div style="margin-bottom: 0.5rem; color: var(--color-text-secondary); font-size: 0.9rem;">
            <span style="font-weight:600; color: var(--color-text-primary);">${formatCurrency(currentAmount)}</span> / ${formatCurrency(targetAmount)}
            <span class="text-muted" style="margin-left: 0.5rem; font-size: 0.8rem;">남은 금액: ${formatCurrency(remaining)}</span>
          </div>
          
          <div style="width: 100%; height: 10px; background: #e9ecef; border-radius: 5px; overflow: hidden;">
            <div style="width: ${percent}%; height: 100%; background: ${barColor}; transition: width 0.5s ease;"></div>
          </div>

          <div class="flex-between mt-2" style="gap: 0.5rem;">
            <button class="btn-goal-edit text-primary" style="font-size: 0.8rem;" data-id="${g.id}">✏️ 수정</button>
            ${g.status === 'IN_PROGRESS' ? `<button class="btn-goal-cancel text-muted" style="font-size: 0.8rem;" data-id="${g.id}">⏸ 취소</button>` : ''}
            <button class="btn-goal-delete text-expense" style="font-size: 0.8rem;" data-id="${g.id}">🗑 삭제</button>
          </div>
        `;

        // 카드 클릭 → 상세
        card.addEventListener('click', (e) => {
          if (e.target.closest('button')) return; // 버튼 클릭은 무시
          openDetail(g.id);
        });
        
        // 수정 버튼
        card.querySelector('.btn-goal-edit').addEventListener('click', () => openEdit(g));
        
        // 취소 버튼
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

        // 삭제 버튼
        card.querySelector('.btn-goal-delete').addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
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

  // 상세 모달
  async function openDetail(goalId) {
    const content = div.querySelector('#goal-detail-content');
    content.innerHTML = '<div class="text-center text-muted">로딩 중...</div>';
    detailModal.showModal();

    try {
      const [progress, forecast, transactions] = await Promise.all([
        api.get(`/api/goals/${goalId}/progress`),
        api.get(`/api/goals/${goalId}/forecast`).catch(() => null),
        api.get(`/api/goals/${goalId}/transactions`).catch(() => []),
      ]);

      let forecastHtml = '';
      if (forecast) {
        forecastHtml = `
          <div class="card mt-4">
            <div class="card-title">🔮 예상 달성 정보</div>
            <div class="flex-between mb-2">
              <span class="text-muted">일평균 저축액</span>
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

      let txHtml = '';
      if (transactions && transactions.length > 0) {
        const txItems = transactions.slice(0, 10).map(tx => `
          <div class="flex-between" style="padding: 0.5rem 0; border-bottom: 1px solid var(--color-border);">
            <div>
              <div style="font-size: 0.9rem;">${escapeHtml(tx.description || '내용 없음')}</div>
              <div class="text-muted" style="font-size: 0.75rem;">${tx.transaction_date}</div>
            </div>
            <span style="font-weight: 600;">${formatCurrency(tx.amount)}</span>
          </div>
        `).join('');

        txHtml = `
          <div class="card mt-4">
            <div class="card-title">💰 기여 거래 내역 (최근 10건)</div>
            ${txItems}
          </div>
        `;
      }

      const barColor = progress.status === 'ACHIEVED' ? '#40c057' : 'var(--color-primary)';
      const pct = Math.min(progress.progress_percentage, 100);

      content.innerHTML = `
        <div style="text-align: center; margin-bottom: 1rem;">
          <div style="font-size: 2.5rem; font-weight: 700; color: var(--color-primary);">${progress.progress_percentage}%</div>
          ${statusBadge(progress.status)}
        </div>

        <div class="card">
          <div class="flex-between mb-2">
            <span class="text-muted">현재 금액</span>
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

        ${forecastHtml}
        ${txHtml}
      `;
    } catch (err) {
      content.innerHTML = '<div class="text-center text-expense">상세 정보를 불러오지 못했습니다.</div>';
    }
  }

  div.querySelector('#detail-close').addEventListener('click', () => detailModal.close());

  // 수정 모달
  function openEdit(goal) {
    div.querySelector('#goal-modal-title').textContent = '목표 수정';
    div.querySelector('#g-submit').textContent = '수정 저장';
    div.querySelector('#g-edit-id').value = goal.id;
    div.querySelector('#g-name').value = goal.name;
    div.querySelector('#g-amount').value = goal.target_amount;
    div.querySelector('#g-date').value = goal.target_date || '';
    div.querySelector('#g-desc').value = goal.description || '';
    div.querySelector('#g-category').value = goal.category_id;
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

  div.querySelector('#g-cancel').addEventListener('click', () => {
    modal.close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = div.querySelector('#g-submit');
    btnSubmit.disabled = true;

    const editId = div.querySelector('#g-edit-id').value;
    const payload = {
      name: div.querySelector('#g-name').value,
      target_amount: parseFloat(div.querySelector('#g-amount').value),
      category_id: categorySelect.value
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

  loadCategories();
  loadGoals();
  bindLayoutEvents(div);

  return div;
}
