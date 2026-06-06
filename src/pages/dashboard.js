import { api, unwrapList } from '../api.js';
import { formatCurrency, formatDate, escapeHtml } from '../utils/formatters.js';
import { createPageLayout, bindLayoutEvents } from '../utils/layout.js';
import { renderCategoryWithIcon } from '../utils/category-icons.js';
import { getSelectedMonth, formatMonthLabel } from '../utils/period.js';
import { miniBar, skeletonRows } from '../utils/ui.js';

export function renderDashboard() {
  const div = document.createElement('div');
  const currentMonthStr = getSelectedMonth();

  const contentHtml = `
    <!-- 이번 달 요약 -->
    <div class="card dashboard-summary">
      <div class="flex-between mb-4">
        <h2 id="current-month" style="color: var(--color-primary); font-size: 1.15rem; margin: 0; font-weight: 700;">${formatMonthLabel(currentMonthStr)}</h2>
        <span class="text-muted" id="daily-avg" style="font-size: 0.8rem;"></span>
      </div>

      <div class="flex-between mb-2">
        <span class="text-muted" style="font-weight: 500;">수입</span>
        <span class="amount-medium text-income" id="total-income">+0원</span>
      </div>
      <div class="flex-between mb-2">
        <span class="text-muted" style="font-weight: 500;">지출</span>
        <span class="amount-medium text-expense" id="total-expense">-0원</span>
      </div>
      <div class="flex-between mb-4">
        <span class="text-muted" style="font-weight: 500;">전월 대비</span>
        <span id="vs-last-month" style="font-size: 0.9rem; font-weight: 600;">-</span>
      </div>

      <div style="height: 1px; background-color: rgba(0,0,0,0.06); margin-bottom: 1rem;"></div>

      <div class="flex-between">
        <span style="font-weight: 600; font-size: 1.1rem; color: var(--color-text-primary);">잔액</span>
        <span class="amount-large" id="total-balance" style="color: var(--color-primary);">0원</span>
      </div>
    </div>

    <!-- 위젯 그리드 -->
    <div class="dashboard-grid">
      <div class="card">
        <h3 class="card-title">💸 지출 TOP 3</h3>
        <div id="expense-top3"><div class="text-center text-muted" style="padding: 1rem 0;">로딩 중...</div></div>
      </div>

      <div class="card">
        <div class="flex-between mb-4">
          <h3 class="card-title" style="margin: 0;">🎯 예산 현황</h3>
          <a href="#/budget" class="text-primary" style="font-size: 0.8rem;">전체</a>
        </div>
        <div id="budget-widget"><div class="text-center text-muted" style="padding: 1rem 0;">로딩 중...</div></div>
      </div>

      <div class="card">
        <div class="flex-between mb-4">
          <h3 class="card-title" style="margin: 0;">🏆 목표 진행</h3>
          <a href="#/goals" class="text-primary" style="font-size: 0.8rem;">전체</a>
        </div>
        <div id="goals-widget"><div class="text-center text-muted" style="padding: 1rem 0;">로딩 중...</div></div>
      </div>
    </div>

    <!-- 최근 거래 -->
    <div class="flex-between mt-4 mb-2">
      <h3 style="font-size: 1.1rem; font-weight: 700;">최근 내역</h3>
      <a href="#/transactions" class="text-primary" style="font-size: 0.85rem;">전체 보기</a>
    </div>
    <div id="recent-transactions">
      <div class="text-center text-muted mt-4">로딩 중...</div>
    </div>

    <button class="fab" id="btn-fab-add" aria-label="거래 추가" title="거래 추가">+</button>
  `;

  div.innerHTML = createPageLayout('dashboard', contentHtml);

  // 빈 상태 CTA / FAB 공통: 거래 페이지로 이동하며 추가 모달 자동 오픈
  function goToAddTransaction() {
    sessionStorage.setItem('open_tx_modal', '1');
    window.location.hash = '#/transactions';
  }

  // 1. 월 요약 + 전월대비 + 지출 TOP 3
  const loadSummary = async () => {
    try {
      const summary = await api.get(`/api/statistics/monthly-report?month=${currentMonthStr}`);

      div.querySelector('#total-income').textContent = '+' + formatCurrency(summary.total_income);
      div.querySelector('#total-expense').textContent = '-' + formatCurrency(summary.total_expense);

      const balance = summary.total_income - summary.total_expense;
      const balanceEl = div.querySelector('#total-balance');
      balanceEl.textContent = (balance < 0 ? '-' : '') + formatCurrency(Math.abs(balance));
      balanceEl.style.color = balance < 0 ? 'var(--color-expense)' : 'var(--color-primary)';

      if (summary.daily_average_expense != null) {
        div.querySelector('#daily-avg').textContent = `일평균 지출 ${formatCurrency(summary.daily_average_expense)}`;
      }

      // 전월 대비 지출 증감
      const vsEl = div.querySelector('#vs-last-month');
      const vs = summary.vs_last_month;
      if (vs && (vs.message && (vs.message.includes('없') || /no previous/i.test(vs.message)))) {
        vsEl.textContent = '전월 데이터 없음';
        vsEl.style.color = 'var(--color-text-secondary)';
      } else if (vs && typeof vs.expense_change === 'number') {
        const ch = vs.expense_change;
        if (ch > 0) { vsEl.textContent = `지출 ▲ ${ch}%`; vsEl.style.color = 'var(--color-expense)'; }
        else if (ch < 0) { vsEl.textContent = `지출 ▼ ${Math.abs(ch)}%`; vsEl.style.color = 'var(--color-income)'; }
        else { vsEl.textContent = '전월과 동일'; vsEl.style.color = 'var(--color-text-secondary)'; }
      } else {
        vsEl.textContent = '-';
      }

      // 지출 TOP 3
      const expContainer = div.querySelector('#expense-top3');
      const expenses = (summary.top_categories || []).slice(0, 3);
      if (expenses.length === 0) {
        expContainer.innerHTML = '<div class="text-center text-muted" style="padding: 1rem 0;">지출 내역이 없습니다.</div>';
      } else {
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
                <span class="text-muted" style="margin-left: 0.5rem; font-size: 0.8rem;">${percent}%</span>
              </div>
            </div>
            ${miniBar(percent, 'var(--color-expense)')}
          `;
          expContainer.appendChild(row);
        });
      }
    } catch (err) {
      div.querySelector('#vs-last-month').textContent = '불러오기 실패';
      div.querySelector('#expense-top3').innerHTML =
        '<div class="text-center text-muted" style="padding: 1rem 0;">불러오기 실패</div>';
    }
  };

  // 2. 예산 현황 위젯
  const loadBudgetWidget = async () => {
    const el = div.querySelector('#budget-widget');
    try {
      const res = await api.get(`/api/budgets/${currentMonthStr}`);
      const budgets = res.budgets || [];
      const overall = budgets.find(b => b.category_id == null);
      const categoryBudgets = budgets.filter(b => b.category_id != null);

      if (!overall && categoryBudgets.length === 0) {
        el.innerHTML = `
          <div class="text-center text-muted" style="padding: 0.5rem 0;">설정된 예산이 없습니다.</div>
          <a href="#/budget" class="btn btn-outline" style="margin-top: 0.5rem; padding: 0.4rem; font-size: 0.85rem;">예산 설정하기</a>
        `;
        return;
      }

      let html = '';
      if (overall) {
        let color = 'var(--color-primary)';
        if (overall.status === 'WARNING') color = '#f59f00';
        if (overall.status === 'EXCEEDED') color = 'var(--color-expense)';
        html += `
          <div class="flex-between mb-1" style="font-size: 0.9rem;">
            <span class="text-muted">전체 예산</span>
            <span style="font-weight: 600; color: ${color};">${overall.usage_rate}%</span>
          </div>
          ${miniBar(overall.usage_rate, color)}
          <div class="text-muted" style="font-size: 0.8rem; margin-top: 4px;">${formatCurrency(overall.spent)} / ${formatCurrency(overall.budget)}</div>
        `;
      }

      const alertCount = categoryBudgets.filter(b => b.status !== 'SAFE').length;
      if (categoryBudgets.length > 0) {
        html += `<div class="text-muted" style="font-size: 0.8rem; margin-top: 0.75rem;">카테고리 예산 ${categoryBudgets.length}개${alertCount > 0 ? ` · <span class="text-expense">주의/초과 ${alertCount}개</span>` : ''}</div>`;
      }
      el.innerHTML = html;
    } catch (err) {
      el.innerHTML = '<div class="text-center text-muted" style="padding: 0.5rem 0;">예산을 불러오지 못했습니다.</div>';
    }
  };

  // 3. 목표 진행 위젯
  const loadGoalsWidget = async () => {
    const el = div.querySelector('#goals-widget');
    try {
      const goals = unwrapList(await api.get('/api/goals/')).slice(0, 3);
      if (goals.length === 0) {
        el.innerHTML = `
          <div class="text-center text-muted" style="padding: 0.5rem 0;">등록된 목표가 없습니다.</div>
          <a href="#/goals" class="btn btn-outline" style="margin-top: 0.5rem; padding: 0.4rem; font-size: 0.85rem;">목표 만들기</a>
        `;
        return;
      }
      el.innerHTML = '';
      goals.forEach(g => {
        const cur = g.current_amount ?? 0;
        const target = g.target_amount ?? 1;
        const percent = Math.min(100, Math.floor((cur / target) * 100));
        const row = document.createElement('div');
        row.style.marginBottom = '0.75rem';
        row.innerHTML = `
          <div class="flex-between mb-1" style="font-size: 0.9rem;">
            <span style="font-weight: 500;">${escapeHtml(g.name)}</span>
            <span class="text-muted" style="font-size: 0.8rem;">${percent}%</span>
          </div>
          ${miniBar(percent, percent >= 100 ? 'var(--color-income)' : 'var(--color-primary)')}
        `;
        el.appendChild(row);
      });
    } catch (err) {
      el.innerHTML = '<div class="text-center text-muted" style="padding: 0.5rem 0;">목표를 불러오지 못했습니다.</div>';
    }
  };

  // 4. 최근 거래
  const loadRecentTx = async () => {
    const txContainer = div.querySelector('#recent-transactions');
    txContainer.innerHTML = skeletonRows(4);
    try {
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
        const hasSettledShare = !isIncome
          && tx.actual_amount != null
          && tx.actual_amount !== tx.amount;
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
          <div style="text-align: right;">
            <span style="font-weight: 700; font-size: 1.05rem; color: ${isIncome ? 'var(--color-income)' : 'var(--color-text-primary)'}">
              ${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}
            </span>
            ${hasSettledShare ? `
            <div style="font-size: 0.72rem; font-weight: 600; color: var(--color-primary);">
              실부담 ${formatCurrency(tx.actual_amount)}
            </div>` : ''}
          </div>
        `;
        txContainer.appendChild(card);
      });
    } catch (err) {
      txContainer.innerHTML = '<div class="alert alert-important">최근 내역을 불러오지 못했습니다.</div>';
    }
  };

  // 위젯별 독립 로딩 (하나 실패해도 나머지는 표시)
  loadSummary();
  loadBudgetWidget();
  loadGoalsWidget();
  loadRecentTx();

  div.querySelector('#btn-fab-add').addEventListener('click', goToAddTransaction);
  bindLayoutEvents(div);

  return div;
}
