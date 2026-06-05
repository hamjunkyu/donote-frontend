import { api, unwrapList } from '../api.js';
import { formatCurrency, formatDate, escapeHtml } from '../utils/formatters.js';
import { createPageLayout, bindLayoutEvents } from '../utils/layout.js';
import { renderCategoryWithIcon } from '../utils/category-icons.js';

export function renderDashboard() {
  const div = document.createElement('div');
  
  const contentHtml = `
    <!-- 1. 이번 달 대형 요약 카드 -->
    <div class="card" style="background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-primary-light) 100%); border: none; padding: 2rem 1.5rem;">
      <div class="flex-between mb-4">
        <h2 id="current-month" style="color: var(--color-primary); font-size: 1.15rem; margin: 0; font-weight: 700;">로딩 중...</h2>
      </div>
      
      <div class="flex-between mb-2">
        <span class="text-muted" style="font-weight: 500;">수입</span>
        <span class="amount-medium text-income" id="total-income">+0원</span>
      </div>
      <div class="flex-between mb-4">
        <span class="text-muted" style="font-weight: 500;">지출</span>
        <span class="amount-medium text-expense" id="total-expense">-0원</span>
      </div>
      
      <div style="height: 1px; background-color: rgba(0,0,0,0.05); margin-bottom: 1rem;"></div>
      
      <div class="flex-between">
        <span style="font-weight: 600; font-size: 1.1rem; color: var(--color-text-primary);">잔액</span>
        <span class="amount-large" id="total-balance" style="color: var(--color-primary);">0원</span>
      </div>
    </div>

    <!-- 2. 지출/수입 TOP 3 카드 -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
      
      <div class="card stat-card">
        <h3 class="card-title">💸 지출 TOP 3</h3>
        <div id="expense-top3">
          <div class="text-center text-muted" style="padding: 1rem 0;">데이터가 없습니다.</div>
        </div>
      </div>
      
    </div>

    <!-- 3. 최근 거래내역 (날짜별) -->
    <h3 class="mt-4 mb-2" style="font-size: 1.1rem; font-weight: 700;">최근 내역</h3>
    <div id="recent-transactions">
      <div class="text-center text-muted mt-4">로딩 중...</div>
    </div>

    <!-- 빠른 거래 추가 FAB -->
    <button class="fab" id="btn-fab-add" aria-label="거래 추가" title="거래 추가">+</button>
  `;

  div.innerHTML = createPageLayout('dashboard', contentHtml);

  // 현재 월 설정
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  div.querySelector('#current-month').textContent = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  const loadDashboardData = async () => {
    try {
      // 1. 요약 데이터 조회
      const summary = await api.get(`/api/statistics/monthly-report?month=${currentMonthStr}`);
      div.querySelector('#total-income').textContent = '+' + formatCurrency(summary.total_income);
      div.querySelector('#total-expense').textContent = '-' + formatCurrency(summary.total_expense);

      const balance = summary.total_income - summary.total_expense;
      const balanceEl = div.querySelector('#total-balance');
      balanceEl.textContent = (balance < 0 ? '-' : '') + formatCurrency(Math.abs(balance));
      balanceEl.style.color = balance < 0
        ? 'var(--color-expense)'
        : 'var(--color-primary)';

      // 2. 카테고리별 지출 데이터 (최대 3개)
      let expenses = [];
      if (summary.top_categories) {
        expenses = summary.top_categories.slice(0, 3);
      }
      
      const expContainer = div.querySelector('#expense-top3');
      if (expenses.length > 0) {
        expContainer.innerHTML = '';
        expenses.forEach(c => {
          const percent = summary.total_expense > 0 ? Math.round((c.amount / summary.total_expense) * 100) : 0;
          
          const row = document.createElement('div');
          row.style.marginBottom = '0.75rem';
          row.innerHTML = `
            <div class="flex-between mb-1" style="font-size: 0.9rem;">
              ${renderCategoryWithIcon(c.name, 'EXPENSE')}
              <div style="text-align: right;">
                <span style="font-weight: 600;">${formatCurrency(c.amount)}</span>
                <span class="text-muted" style="margin-left: 0.5rem; font-size: 0.8rem; width: 30px; display: inline-block;">${percent}%</span>
              </div>
            </div>
            <div style="width: 100%; height: 6px; background: var(--color-background); border-radius: 3px; overflow: hidden;">
              <div style="width: ${percent}%; height: 100%; background: var(--color-expense);"></div>
            </div>
          `;
          expContainer.appendChild(row);
        });
      }

      // 3. 최근 거래 내역 (최대 10개, 날짜별 그룹핑)
      const txContainer = div.querySelector('#recent-transactions');
      const recentTx = unwrapList(await api.get('/api/transactions/?limit=10'));

      if (recentTx.length === 0) {
        txContainer.innerHTML = `
          <div class="card text-center" style="padding: 3rem 1rem;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📝</div>
            <div class="text-muted mb-4">등록된 최근 거래 내역이 없습니다.</div>
            <button class="btn btn-primary" id="btn-add-from-empty" style="width: auto; padding: 0.5rem 1.25rem; font-size: 0.9rem;">+ 거래 추가하기</button>
          </div>
        `;
        txContainer.querySelector('#btn-add-from-empty').addEventListener('click', goToAddTransaction);
        return;
      }

      txContainer.innerHTML = '';
      let currentDate = '';

      recentTx.forEach(tx => {
        if (tx.transaction_date !== currentDate) {
          const divider = document.createElement('div');
          divider.className = 'date-divider';
          divider.textContent = formatDate(tx.transaction_date);
          txContainer.appendChild(divider);
          currentDate = tx.transaction_date;
        }

        const isIncome = tx.type === 'INCOME';
        const card = document.createElement('div');
        card.className = 'card tx-card';
        card.style.borderLeft = `4px solid ${isIncome ? 'var(--color-income)' : 'var(--color-expense)'}`;
        card.style.marginBottom = 'var(--spacing-sm)';
        card.style.padding = '0.75rem 1rem';

        card.innerHTML = `
          <div style="flex: 1;">
            <div style="font-size: 0.85rem; margin-bottom: 4px;">
              ${renderCategoryWithIcon(tx.category_name, tx.type)}
            </div>
            <div style="font-weight: 500; color: var(--color-text-primary);">
              ${escapeHtml(tx.description || '내용 없음')}
            </div>
          </div>
          <div style="text-align: right; display: flex; align-items: center;">
            <span style="font-weight: 700; font-size: 1.05rem; color: ${isIncome ? 'var(--color-income)' : 'var(--color-text-primary)'}">
              ${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}
            </span>
          </div>
        `;
        txContainer.appendChild(card);
      });

    } catch (err) {
      console.error(err);
      div.querySelector('#current-month').textContent = '데이터를 불러오지 못했습니다';
      div.querySelector('#expense-top3').innerHTML =
        '<div class="text-center text-muted" style="padding: 1rem 0;">불러오기 실패</div>';
      div.querySelector('#recent-transactions').innerHTML =
        '<div class="alert alert-important">최근 내역을 불러오지 못했습니다.</div>';
    }
  };

  // FAB 및 빈 상태 CTA 공통 핸들러: 거래 페이지로 이동하면서 모달 자동 오픈 플래그 설정
  function goToAddTransaction() {
    sessionStorage.setItem('open_tx_modal', '1');
    window.location.hash = '#/transactions';
  }

  div.querySelector('#btn-fab-add').addEventListener('click', goToAddTransaction);

  loadDashboardData();
  bindLayoutEvents(div);

  return div;
}
