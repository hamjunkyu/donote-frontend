import { api } from '../api.js';
import { formatCurrency, formatDate, getCurrentMonthStr } from '../utils/formatters.js';

export function renderDashboard() {
  const div = document.createElement('div');
  div.innerHTML = `
    <header class="app-header">
      <div class="header-content">
        <div class="logo">Donote</div>
        <nav class="header-nav">
          <a href="#/" class="nav-link active">홈</a>
          <a href="#/transactions" class="nav-link">내역</a>
          <a href="#/statistics" class="nav-link">통계</a>
          <a href="#/budget" class="nav-link">예산</a>
          <a href="#/settlements" class="nav-link">정산</a>
          <a href="#/goals" class="nav-link">목표</a>
          <a href="#/notifications" class="nav-link">알림</a>
        </nav>
      </div>
    </header>
    
    <main class="container">
      <div id="dashboard-content" style="opacity: 0; transition: opacity 0.3s ease;">
        <h2 class="mb-4">이달의 요약</h2>
        
        <!-- 요약 카드 (총 수입, 총 지출, 잔액) -->
        <div class="card summary-card" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
          <div>
            <div class="text-muted" style="font-size: 0.875rem;">수입</div>
            <div class="text-income" style="font-weight: 700; font-size: 1.125rem;" id="summary-income">0원</div>
          </div>
          <div style="border-left: 1px solid var(--color-border); border-right: 1px solid var(--color-border);">
            <div class="text-muted" style="font-size: 0.875rem;">지출</div>
            <div class="text-expense" style="font-weight: 700; font-size: 1.125rem;" id="summary-expense">0원</div>
          </div>
          <div>
            <div class="text-muted" style="font-size: 0.875rem;">잔액</div>
            <div class="text-primary" style="font-weight: 700; font-size: 1.125rem;" id="summary-net">0원</div>
          </div>
        </div>

        <!-- 예산 프로그레스 바 -->
        <h3 class="mt-4 mb-2">이번 달 예산 현황</h3>
        <div class="card" id="budget-card">
          <div class="flex-between mb-2">
            <span class="text-muted" id="budget-text">예산 정보를 불러오는 중...</span>
            <span id="budget-percent" style="font-weight: 600;">0%</span>
          </div>
          <div style="width: 100%; height: 12px; background: var(--color-border); border-radius: 6px; overflow: hidden;">
            <div id="budget-bar" style="height: 100%; width: 0%; background: var(--color-primary); transition: width 0.5s ease;"></div>
          </div>
        </div>

        <!-- 최근 내역 -->
        <div class="flex-between mt-4 mb-2">
          <h3>최근 거래 내역</h3>
          <a href="#/transactions" class="text-primary" style="font-size: 0.875rem;">더보기</a>
        </div>
        <div class="card" style="padding: 0;" id="recent-transactions">
          <div style="padding: var(--spacing-lg); text-align: center; color: var(--color-text-secondary);">
            내역을 불러오는 중입니다...
          </div>
        </div>
        
        <button class="btn btn-outline mt-4" id="logout-btn">로그아웃</button>
      </div>
    </main>
  `;

  // 데이터 로딩 로직
  const loadData = async () => {
    try {
      const monthStr = getCurrentMonthStr();
      
      // 병렬로 API 호출
      const [report, budget, transactions] = await Promise.all([
        api.get(`/api/statistics/monthly-report?month=${monthStr}`),
        api.get(`/api/budgets/${monthStr}`).catch(() => null), // 예산 없을 수 있음
        api.get('/transactions/')
      ]);

      // 1. 요약 카드 업데이트
      div.querySelector('#summary-income').textContent = formatCurrency(report.total_income);
      div.querySelector('#summary-expense').textContent = formatCurrency(report.total_expense);
      div.querySelector('#summary-net').textContent = formatCurrency(report.net_amount);

      // 2. 예산 바 업데이트
      if (budget && budget.summary && budget.summary.total_budget > 0) {
        const totalBudget = budget.summary.total_budget;
        const totalUsed = budget.summary.total_used;
        const percent = Math.min(Math.round((totalUsed / totalBudget) * 100), 100);
        
        div.querySelector('#budget-text').textContent = `${formatCurrency(totalUsed)} / ${formatCurrency(totalBudget)}`;
        div.querySelector('#budget-percent').textContent = `${percent}%`;
        
        const bar = div.querySelector('#budget-bar');
        bar.style.width = `${percent}%`;
        
        // 예산 초과 시 빨간색
        if (percent >= 100) {
          bar.style.background = 'var(--color-expense)';
        } else if (percent >= 80) {
          bar.style.background = '#f59f00'; // 주황색 (경고)
        }
      } else {
        div.querySelector('#budget-text').textContent = '설정된 예산이 없습니다.';
      }

      // 3. 최근 내역 업데이트 (최대 5건)
      const recentList = div.querySelector('#recent-transactions');
      if (transactions && transactions.length > 0) {
        const top5 = transactions.slice(0, 5);
        recentList.innerHTML = '';
        
        top5.forEach((tx, index) => {
          const item = document.createElement('div');
          item.style.padding = 'var(--spacing-md) var(--spacing-lg)';
          item.style.borderBottom = index < top5.length - 1 ? '1px solid var(--color-border)' : 'none';
          item.className = 'flex-between';
          
          const isExpense = tx.type === 'EXPENSE';
          const colorClass = isExpense ? 'text-expense' : 'text-income';
          const sign = isExpense ? '-' : '+';
          
          item.innerHTML = `
            <div>
              <div style="font-weight: 600;">${tx.description || '내용 없음'}</div>
              <div class="text-muted" style="font-size: 0.75rem;">${formatDate(tx.transaction_date)}</div>
            </div>
            <div class="${colorClass}" style="font-weight: 700;">
              ${sign}${formatCurrency(tx.amount)}
            </div>
          `;
          recentList.appendChild(item);
        });
      } else {
        recentList.innerHTML = '<div style="padding: var(--spacing-lg); text-align: center; color: var(--color-text-secondary);">거래 내역이 없습니다.</div>';
      }

      // 애니메이션 표시
      div.querySelector('#dashboard-content').style.opacity = '1';

    } catch (error) {
      console.error('Dashboard load error:', error);
      div.innerHTML = `<div class="container"><div class="alert alert-important">데이터를 불러오는 데 실패했습니다.</div></div>`;
    }
  };

  // 비동기 데이터 로딩 실행
  loadData();

  // 로그아웃 이벤트
  div.querySelector('#logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.hash = '#/login';
  });

  return div;
}
