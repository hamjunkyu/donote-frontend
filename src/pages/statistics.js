import { api } from '../api.js';
import { formatCurrency, getCurrentMonthStr } from '../utils/formatters.js';

export function renderStatistics() {
  const div = document.createElement('div');
  const monthStr = getCurrentMonthStr();
  
  // 현재 달의 시작일과 마지막 일 계산
  const [year, month] = monthStr.split('-');
  const dateFrom = `${monthStr}-01`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const dateTo = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

  div.innerHTML = `
    <header class="app-header">
      <div class="header-content">
        <div class="logo">Donote</div>
        <nav class="header-nav" style="flex-wrap: wrap;">
          <a href="#/" class="nav-link">홈</a>
          <a href="#/transactions" class="nav-link">내역</a>
          <a href="#/statistics" class="nav-link active">통계</a>
          <a href="#/budget" class="nav-link">예산</a>
          <a href="#/settlements" class="nav-link">정산</a>
          <a href="#/goals" class="nav-link">목표</a>
          <a href="#/notifications" class="nav-link">알림</a>
        </nav>
      </div>
    </header>
    
    <main class="container" style="padding-bottom: 80px;">
      <h2 class="mb-4">${year}년 ${parseInt(month)}월 소비 통계</h2>
      
      <div class="card mb-4" id="stats-summary" style="display: none;">
        <h3 class="mb-2">요약</h3>
        <div class="flex-between">
          <span class="text-muted">총 수입</span>
          <span class="text-income" style="font-weight: 700;" id="stat-total-income">0원</span>
        </div>
        <div class="flex-between mt-2">
          <span class="text-muted">총 지출</span>
          <span class="text-expense" style="font-weight: 700;" id="stat-total-expense">0원</span>
        </div>
      </div>

      <div class="card mb-4">
        <h3 class="mb-4 text-center">카테고리별 지출 비율</h3>
        <div style="position: relative; height: 250px; width: 100%;">
          <canvas id="expenseChart"></canvas>
        </div>
        <div id="chart-empty" class="text-center text-muted mt-4" style="display: none;">
          지출 내역이 없습니다.
        </div>
      </div>
    </main>
  `;

  let chartInstance = null;

  const loadData = async () => {
    try {
      // 1. 요약 데이터 로드
      const summaryRes = await api.get(`/api/statistics/summary?period=monthly&date_from=${dateFrom}&date_to=${dateTo}`);
      if (summaryRes.data && summaryRes.data.length > 0) {
        const currentSummary = summaryRes.data[0];
        div.querySelector('#stat-total-income').textContent = formatCurrency(currentSummary.income);
        div.querySelector('#stat-total-expense').textContent = formatCurrency(currentSummary.expense);
        div.querySelector('#stats-summary').style.display = 'block';
      }

      // 2. 카테고리 데이터 로드 (지출)
      const catRes = await api.get(`/api/statistics/categories?date_from=${dateFrom}&date_to=${dateTo}&type=EXPENSE`);
      
      const items = catRes.categories || [];
      
      if (items.length === 0) {
        div.querySelector('#chart-empty').style.display = 'block';
        return;
      }

      // 데이터 가공
      const labels = items.map(item => item.name || '기타');
      const data = items.map(item => item.amount);
      const bgColors = [
        '#FA5252', '#FD7E14', '#FCC419', '#40C057', '#12B886', 
        '#15AABF', '#228BE6', '#4C6EF5', '#7950F2', '#BE4BDB'
      ];

      // 차트 렌더링
      const ctx = div.querySelector('#expenseChart').getContext('2d');
      chartInstance = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: bgColors.slice(0, data.length),
            borderWidth: 1,
            borderColor: 'var(--color-surface)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                font: { family: 'Pretendard' }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.label || '';
                  if (label) label += ': ';
                  label += formatCurrency(context.raw);
                  return label;
                }
              }
            }
          },
          cutout: '60%'
        }
      });
      
    } catch (err) {
      console.error('통계 로딩 실패:', err);
      div.querySelector('#chart-empty').textContent = '데이터를 불러오지 못했습니다.';
      div.querySelector('#chart-empty').style.display = 'block';
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  // DOM에 연결된 후 약간의 딜레이를 주어 캔버스가 렌더링 되도록 함
  setTimeout(loadData, 100);

  return div;
}
