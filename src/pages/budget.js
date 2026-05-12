import { api } from '../api.js';
import { formatCurrency, getCurrentMonthStr } from '../utils/formatters.js';

export function renderBudget() {
  const div = document.createElement('div');
  const monthStr = getCurrentMonthStr();
  
  div.innerHTML = `
    <header class="app-header">
      <div class="header-content">
        <div class="logo">Donote</div>
        <nav class="header-nav">
          <a href="#/" class="nav-link">홈</a>
          <a href="#/transactions" class="nav-link">내역</a>
          <a href="#/statistics" class="nav-link">통계</a>
          <a href="#/budget" class="nav-link active">예산</a>
          <a href="#/settlements" class="nav-link">정산</a>
          <a href="#/goals" class="nav-link">목표</a>
          <a href="#/notifications" class="nav-link">알림</a>
        </nav>
      </div>
    </header>
    
    <main class="container" style="padding-bottom: 80px;">
      <div class="flex-between mb-4">
        <h2>${monthStr.split('-')[0]}년 ${parseInt(monthStr.split('-')[1])}월 예산</h2>
        <button class="btn btn-primary" id="btn-add-budget" style="width: auto; padding: 0.5rem 1rem;">예산 설정</button>
      </div>
      
      <!-- 전체 예산 요약 -->
      <div class="card" id="overall-budget">
        <div class="text-center text-muted" style="padding: var(--spacing-lg);">로딩 중...</div>
      </div>
      
      <h3 class="mt-4 mb-2">카테고리별 예산</h3>
      <div id="category-budgets">
        <div class="text-center text-muted" style="padding: var(--spacing-lg);">로딩 중...</div>
      </div>

      <!-- 모달: 예산 설정 -->
      <dialog id="budget-modal" style="border: none; border-radius: var(--radius-lg); padding: var(--spacing-lg); width: 90%; max-width: 400px; box-shadow: var(--shadow-lg);">
        <h3 class="mb-4">예산 설정</h3>
        <form id="budget-form">
          <div class="form-group">
            <label class="form-label">금액 (원)</label>
            <input type="number" id="budget-amount" class="form-control" required min="0" placeholder="예산 금액 입력">
          </div>
          <div class="form-group mb-4">
            <label class="form-label">카테고리 (선택)</label>
            <select id="budget-category" class="form-control">
              <option value="">전체 예산</option>
              <!-- 카테고리가 동적으로 추가됩니다 -->
            </select>
          </div>
          <div class="flex-between">
            <button type="button" class="btn btn-outline" id="budget-cancel" style="width: 48%;">취소</button>
            <button type="submit" class="btn btn-primary" style="width: 48%;">저장</button>
          </div>
        </form>
      </dialog>
    </main>
  `;

  const overallContainer = div.querySelector('#overall-budget');
  const categoriesContainer = div.querySelector('#category-budgets');
  const modal = div.querySelector('#budget-modal');
  const addBtn = div.querySelector('#btn-add-budget');
  const form = div.querySelector('#budget-form');
  const cancelBtn = div.querySelector('#budget-cancel');

  const renderProgressBar = (used, total, status) => {
    const percent = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0;
    let color = 'var(--color-primary)';
    if (status === 'WARNING') color = '#f59f00';
    if (status === 'EXCEEDED') color = 'var(--color-expense)';
    
    return `
      <div class="flex-between mb-2">
        <span class="text-muted" style="font-size: 0.875rem;">${formatCurrency(used)} / ${formatCurrency(total)}</span>
        <span style="font-weight: 600; color: ${color};">${percent}%</span>
      </div>
      <div style="width: 100%; height: 8px; background: var(--color-border); border-radius: 4px; overflow: hidden;">
        <div style="height: 100%; width: ${percent}%; background: ${color}; transition: width 0.5s ease;"></div>
      </div>
    `;
  };

  const loadBudgets = async () => {
    try {
      const summary = await api.get(`/api/budgets/${monthStr}`);
      
      // 전체 예산
      if (summary.overall && summary.overall.budget_amount > 0) {
        overallContainer.innerHTML = `
          <div class="flex-between mb-4">
            <h3 style="margin: 0;">총 예산 잔여: <span class="text-primary">${formatCurrency(summary.overall.budget_amount - summary.overall.spent_amount)}</span></h3>
            <button class="text-muted" style="font-size: 0.75rem; text-decoration: underline;" data-id="${summary.overall.budget_id}" id="delete-overall">삭제</button>
          </div>
          ${renderProgressBar(summary.overall.spent_amount, summary.overall.budget_amount, summary.overall.status)}
        `;
        
        overallContainer.querySelector('#delete-overall')?.addEventListener('click', async (e) => {
          if(confirm('전체 예산을 삭제하시겠습니까?')) {
            await api.delete(`/api/budgets/${e.target.dataset.id}`);
            loadBudgets();
          }
        });
      } else {
        overallContainer.innerHTML = '<div class="text-center text-muted">설정된 전체 예산이 없습니다.</div>';
      }

      // 카테고리 예산
      if (summary.categories && summary.categories.length > 0) {
        categoriesContainer.innerHTML = '';
        summary.categories.forEach(cat => {
          const card = document.createElement('div');
          card.className = 'card';
          card.innerHTML = `
            <div class="flex-between mb-2">
              <span style="font-weight: 600;">${cat.category_name || '카테고리'}</span>
              <button class="text-muted" style="font-size: 0.75rem; text-decoration: underline;" data-id="${cat.budget_id}">삭제</button>
            </div>
            ${renderProgressBar(cat.spent_amount, cat.budget_amount, cat.status)}
          `;
          
          card.querySelector('button').addEventListener('click', async (e) => {
            if(confirm('이 카테고리 예산을 삭제하시겠습니까?')) {
              await api.delete(`/api/budgets/${e.target.dataset.id}`);
              loadBudgets();
            }
          });
          
          categoriesContainer.appendChild(card);
        });
      } else {
        categoriesContainer.innerHTML = '<div class="card text-center text-muted">설정된 카테고리 예산이 없습니다.</div>';
      }
    } catch (err) {
      if (err.message.includes('404')) {
        overallContainer.innerHTML = '<div class="text-center text-muted">설정된 전체 예산이 없습니다.</div>';
        categoriesContainer.innerHTML = '<div class="card text-center text-muted">설정된 카테고리 예산이 없습니다.</div>';
      } else {
        overallContainer.innerHTML = '<div class="alert alert-important">예산 정보를 불러오지 못했습니다.</div>';
        categoriesContainer.innerHTML = '';
      }
    }
  };

  const loadCategories = async () => {
    try {
      const categories = await api.get('/api/categories/');
      const select = div.querySelector('#budget-category');
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
      });
    } catch (err) {
      console.error('카테고리 로드 실패', err);
    }
  };

  // 모달 제어
  addBtn.addEventListener('click', () => {
    form.reset();
    modal.showModal();
  });

  cancelBtn.addEventListener('click', () => {
    modal.close();
  });

  // 예산 추가
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('budget-amount').value);
    const categoryId = document.getElementById('budget-category').value;
    
    const payload = {
      year_month: monthStr,
      amount: amount,
    };
    if (categoryId) {
      payload.category_id = categoryId;
    }

    try {
      await api.post('/api/budgets', payload);
      modal.close();
      loadBudgets();
    } catch (err) {
      alert(`예산 설정 실패: ${err.message}`);
    }
  });

  loadBudgets();
  loadCategories();

  return div;
}
