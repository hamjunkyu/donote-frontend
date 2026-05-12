import { api } from '../api.js';
import { formatCurrency } from '../utils/formatters.js';

export function renderGoals() {
  const div = document.createElement('div');
  
  div.innerHTML = `
    <header class="app-header">
      <div class="header-content">
        <div class="logo">Donote</div>
        <nav class="header-nav" style="flex-wrap: wrap;">
          <a href="#/" class="nav-link">홈</a>
          <a href="#/transactions" class="nav-link">내역</a>
          <a href="#/statistics" class="nav-link">통계</a>
          <a href="#/budget" class="nav-link">예산</a>
          <a href="#/settlements" class="nav-link">정산</a>
          <a href="#/goals" class="nav-link active">목표</a>
          <a href="#/notifications" class="nav-link">알림</a>
        </nav>
      </div>
    </header>
    
    <main class="container" style="padding-bottom: 80px;">
      <div class="flex-between mb-4">
        <h2>저축 목표</h2>
      </div>
      
      <div id="goal-list">
        <div class="text-center text-muted mt-4">로딩 중...</div>
      </div>

      <button class="fab" id="fab-add-goal">+</button>

      <!-- 목표 생성 모달 -->
      <dialog id="goal-modal" style="border: none; border-radius: var(--radius-lg); padding: var(--spacing-lg); width: 90%; max-width: 450px; box-shadow: var(--shadow-lg);">
        <h3 class="mb-4">새 목표 만들기</h3>
        <form id="goal-form">
          <div class="form-group">
            <label class="form-label">목표 이름</label>
            <input type="text" id="g-name" class="form-control" placeholder="예) 여행자금" required />
          </div>
          <div class="form-group">
            <label class="form-label">목표 금액</label>
            <input type="number" id="g-amount" class="form-control" placeholder="예) 1000000" min="1" required />
          </div>
          <div class="form-group mb-4">
            <label class="form-label">연동할 카테고리</label>
            <select id="g-category" class="form-control" required>
              <option value="">불러오는 중...</option>
            </select>
            <small class="text-muted" style="display:block; margin-top:0.25rem;">이 카테고리로 지출을 등록하면 목표 달성률이 오릅니다.</small>
          </div>
          
          <div class="flex-between">
            <button type="button" class="btn btn-outline" id="g-cancel" style="width: 48%;">취소</button>
            <button type="submit" class="btn btn-primary" id="g-submit" style="width: 48%;">목표 생성</button>
          </div>
        </form>
      </dialog>
    </main>
  `;

  const listContainer = div.querySelector('#goal-list');
  const modal = div.querySelector('#goal-modal');
  const fab = div.querySelector('#fab-add-goal');
  const form = div.querySelector('#goal-form');
  const categorySelect = div.querySelector('#g-category');

  const loadCategories = async () => {
    try {
      const categories = await api.get('/api/categories/');
      categorySelect.innerHTML = '<option value="">-- 연동할 카테고리 선택 --</option>';
      categories.forEach(c => {
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
      const goals = await api.get('/api/goals/');
      listContainer.innerHTML = '';

      if (goals.length === 0) {
        listContainer.innerHTML = '<div class="card text-center text-muted">등록된 목표가 없습니다.</div>';
        return;
      }

      goals.forEach(g => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        
        const percent = Math.min(100, Math.floor((g.current_amount / g.target_amount) * 100));
        let statusBadge = '';
        if (g.status === 'ACHIEVED') statusBadge = '<span style="background: #40c057; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">ACHIEVED (달성!)</span>';
        else statusBadge = '<span style="background: #fcc419; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">IN_PROGRESS</span>';

        card.innerHTML = `
          <div class="flex-between mb-2">
            <div style="font-weight: 600; font-size: 1.1rem;">
              ${g.name}
              ${statusBadge}
            </div>
            <div class="text-muted" style="font-size: 0.85rem;">
              ${percent}% / 남은 금액: ${formatCurrency(Math.max(0, g.target_amount - g.current_amount))}
            </div>
          </div>
          <div style="margin-bottom: 0.5rem; color: var(--color-text); font-size: 0.95rem;">
            진행: <span style="font-weight:600;">${formatCurrency(g.current_amount)}</span> / 목표: ${formatCurrency(g.target_amount)}
          </div>
          
          <div style="width: 100%; height: 10px; background: #e9ecef; border-radius: 5px; overflow: hidden; margin-top: 10px;">
            <div style="width: ${percent}%; height: 100%; background: ${percent >= 100 ? '#40c057' : 'var(--color-primary)'}; transition: width 0.5s ease;"></div>
          </div>
        `;
        listContainer.appendChild(card);
      });
    } catch (err) {
      listContainer.innerHTML = '<div class="alert alert-important">목표를 불러오지 못했습니다.</div>';
    }
  };

  fab.addEventListener('click', () => {
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
    btnSubmit.textContent = '생성 중...';

    try {
      await api.post('/api/goals/', {
        name: div.querySelector('#g-name').value,
        target_amount: parseFloat(div.querySelector('#g-amount').value),
        category_id: categorySelect.value
      });

      modal.close();
      loadGoals();
    } catch (err) {
      alert('목표 생성 실패: ' + err.message);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = '목표 생성';
    }
  });

  loadCategories();
  loadGoals();

  return div;
}
