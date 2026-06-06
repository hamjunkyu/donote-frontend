import { api } from '../api.js';
import { formatCurrency, escapeHtml } from '../utils/formatters.js';
import { createPageLayout, bindLayoutEvents } from '../utils/layout.js';
import { getSelectedMonth } from '../utils/period.js';

export function renderBudget() {
  const div = document.createElement('div');
  const monthStr = getSelectedMonth();
  
  const contentHtml = `
    <div class="flex-between mb-4">
      <h2 style="font-size: 1.5rem;">${monthStr.split('-')[0]}년 ${parseInt(monthStr.split('-')[1])}월 예산</h2>
      <button class="btn btn-primary" id="btn-add-budget" style="width: auto; padding: 0.5rem 1rem; font-size: 0.85rem;">예산 설정</button>
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
            <input type="number" id="budget-amount" class="form-control" required min="1" step="1" placeholder="예산 금액 입력">
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

  `;

  div.innerHTML = createPageLayout('budget', contentHtml);

  const overallContainer = div.querySelector('#overall-budget');
  const categoriesContainer = div.querySelector('#category-budgets');
  const modal = div.querySelector('#budget-modal');
  const addBtn = div.querySelector('#btn-add-budget');
  const form = div.querySelector('#budget-form');
  const cancelBtn = div.querySelector('#budget-cancel');

  const renderProgressBar = (used, total, status) => {
    const percent = total > 0 ? Math.round((used / total) * 100) : 0;
    const barWidth = Math.min(percent, 100);
    let color = 'var(--color-primary)';
    if (status === 'WARNING') color = '#f59f00';
    if (status === 'EXCEEDED') color = 'var(--color-expense)';

    return `
      <div class="flex-between mb-2">
        <span class="text-muted" style="font-size: 0.875rem;">${formatCurrency(used)} / ${formatCurrency(total)}</span>
        <span style="font-weight: 600; color: ${color};">${percent}%</span>
      </div>
      <div style="width: 100%; height: 8px; background: var(--color-border); border-radius: 4px; overflow: hidden;">
        <div style="height: 100%; width: ${barWidth}%; background: ${color}; transition: width 0.5s ease;"></div>
      </div>
    `;
  };

  const attachDeleteHandler = (btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await api.delete(`/api/budgets/${e.currentTarget.dataset.id}`);
        loadBudgets();
      } catch (err) {
        alert(`예산 삭제 실패: ${err.message}`);
      }
    });
  };

  const loadBudgets = async () => {
    try {
      const summary = await api.get(`/api/budgets/${monthStr}`);
      const budgets = summary.budgets || [];

      const overall = budgets.find(b => b.category_id == null);
      const categoryBudgets = budgets.filter(b => b.category_id != null);

      // 전체 예산
      if (overall) {
        overallContainer.innerHTML = `
          <div class="flex-between mb-4">
            <h3 style="margin: 0;">총 예산 잔여: <span class="text-primary">${formatCurrency(overall.remaining)}</span></h3>
            <button class="text-muted" style="font-size: 0.75rem; text-decoration: underline;" data-id="${overall.budget_id}">삭제</button>
          </div>
          ${renderProgressBar(overall.spent, overall.budget, overall.status)}
        `;
        attachDeleteHandler(overallContainer.querySelector('button'));
      } else {
        overallContainer.innerHTML = '<div class="text-center text-muted">설정된 전체 예산이 없습니다.</div>';
      }

      // 카테고리 예산
      if (categoryBudgets.length > 0) {
        categoriesContainer.innerHTML = '';
        categoryBudgets.forEach(cat => {
          const card = document.createElement('div');
          card.className = 'card';
          card.innerHTML = `
            <div class="flex-between mb-2">
              <span style="font-weight: 600;">${escapeHtml(cat.category || cat.label)}</span>
              <button class="text-muted" style="font-size: 0.75rem; text-decoration: underline;" data-id="${cat.budget_id}">삭제</button>
            </div>
            ${renderProgressBar(cat.spent, cat.budget, cat.status)}
          `;
          attachDeleteHandler(card.querySelector('button'));
          categoriesContainer.appendChild(card);
        });
      } else {
        categoriesContainer.innerHTML = '<div class="card text-center text-muted">설정된 카테고리 예산이 없습니다.</div>';
      }
    } catch (err) {
      overallContainer.innerHTML = '<div class="alert alert-important">예산 정보를 불러오지 못했습니다.</div>';
      categoriesContainer.innerHTML = '';
    }
  };

  const loadCategories = async () => {
    try {
      const categories = await api.get('/api/categories/');
      const select = div.querySelector('#budget-category');
      categories
        .filter(c => c.type === 'EXPENSE')
        .forEach(c => {
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
    if (!modal.open) modal.showModal();
  });

  cancelBtn.addEventListener('click', () => {
    modal.close();
  });

  // 예산 추가
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('budget-amount').value, 10);
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
  bindLayoutEvents(div);

  return div;
}
