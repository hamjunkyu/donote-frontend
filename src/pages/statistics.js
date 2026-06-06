import { api } from '../api.js';
import { formatCurrency, escapeHtml } from '../utils/formatters.js';
import { createPageLayout, bindLayoutEvents } from '../utils/layout.js';
import { getSelectedMonth, formatMonthLabel } from '../utils/period.js';
import { miniBar } from '../utils/ui.js';

const PALETTE = [
  '#FA5252', '#FD7E14', '#FCC419', '#40C057', '#12B886',
  '#15AABF', '#228BE6', '#4C6EF5', '#7950F2', '#BE4BDB'
];

export function renderStatistics() {
  const div = document.createElement('div');
  const monthStr = getSelectedMonth();

  const [year, month] = monthStr.split('-');
  const dateFrom = `${monthStr}-01`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const dateTo = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const contentHtml = `
    <div class="flex-between mb-4">
      <h2 style="font-size: 1.5rem;">${formatMonthLabel(monthStr)} 통계</h2>
    </div>

    <!-- 요약 카드 -->
    <div class="stats-cards" id="stats-summary-cards">
      <div class="text-center text-muted" style="padding: 1rem 0; grid-column: 1 / -1;">로딩 중...</div>
    </div>

    <!-- 수입·지출 추이 -->
    <div class="card mb-4">
      <div class="flex-between mb-4">
        <h3 class="card-title" style="margin: 0;">수입·지출 추이</h3>
        <div class="seg-toggle" id="trend-toggle">
          <button data-period="daily" class="active">일별</button>
          <button data-period="weekly">주별</button>
        </div>
      </div>
      <div style="position: relative; height: 280px; width: 100%;">
        <canvas id="trendChart"></canvas>
      </div>
      <div id="trend-empty" class="text-center text-muted mt-4" style="display: none;">데이터가 없습니다.</div>
    </div>

    <!-- 카테고리별 분석 -->
    <div class="card">
      <div class="flex-between mb-4">
        <h3 class="card-title" style="margin: 0;">카테고리별 분석</h3>
        <div class="seg-toggle" id="cat-toggle">
          <button data-type="EXPENSE" class="active">지출</button>
          <button data-type="INCOME">수입</button>
        </div>
      </div>
      <div class="stats-cat-layout">
        <div style="position: relative; height: 250px; min-width: 0;">
          <canvas id="categoryChart"></canvas>
        </div>
        <div id="cat-ranking"></div>
      </div>
      <div id="cat-empty" class="text-center text-muted mt-4" style="display: none;">내역이 없습니다.</div>
    </div>
  `;

  div.innerHTML = createPageLayout('statistics', contentHtml);

  let trendChart = null;
  let categoryChart = null;

  // 1. 요약 카드 (월간 리포트)
  const loadSummaryCards = async () => {
    const el = div.querySelector('#stats-summary-cards');
    try {
      const r = await api.get(`/api/statistics/monthly-report?month=${monthStr}`);
      const net = r.net != null ? r.net : (r.total_income - r.total_expense);

      let vsText = '-';
      let vsColor = 'var(--color-text-secondary)';
      const vs = r.vs_last_month;
      if (vs && vs.message && (vs.message.includes('없') || /no previous/i.test(vs.message))) {
        vsText = '데이터 없음';
      } else if (vs && typeof vs.expense_change === 'number') {
        const ch = vs.expense_change;
        if (ch > 0) { vsText = `▲ ${ch}%`; vsColor = 'var(--color-expense)'; }
        else if (ch < 0) { vsText = `▼ ${Math.abs(ch)}%`; vsColor = 'var(--color-income)'; }
        else { vsText = '동일'; }
      }

      const card = (label, value, color) => `
        <div class="card stat-mini">
          <div class="stat-mini-label">${label}</div>
          <div class="stat-mini-value" style="color: ${color};">${value}</div>
        </div>
      `;
      el.innerHTML =
        card('총 수입', formatCurrency(r.total_income), 'var(--color-income)') +
        card('총 지출', formatCurrency(r.total_expense), 'var(--color-expense)') +
        card('순액', (net < 0 ? '-' : '') + formatCurrency(Math.abs(net)), net < 0 ? 'var(--color-expense)' : 'var(--color-primary)') +
        card('일평균 지출', formatCurrency(r.daily_average_expense || 0), 'var(--color-text-primary)') +
        card('전월 대비 지출', vsText, vsColor);
    } catch (err) {
      el.innerHTML = '<div class="text-center text-muted" style="padding: 1rem 0; grid-column: 1 / -1;">요약을 불러오지 못했습니다.</div>';
    }
  };

  // 2. 수입·지출 추이 차트
  const loadTrend = async (period) => {
    const emptyEl = div.querySelector('#trend-empty');
    try {
      const res = await api.get(`/api/statistics/summary?period=${period}&date_from=${dateFrom}&date_to=${dateTo}`);
      const rows = res.data || [];
      if (rows.length === 0) {
        if (trendChart) { trendChart.destroy(); trendChart = null; }
        emptyEl.textContent = '데이터가 없습니다.';
        emptyEl.style.display = 'block';
        return;
      }
      emptyEl.style.display = 'none';

      const labels = rows.map(r => r.label);
      const incomeData = rows.map(r => r.income || 0);
      const expenseData = rows.map(r => r.expense || 0);

      if (trendChart) trendChart.destroy();
      trendChart = new window.Chart(div.querySelector('#trendChart').getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: '수입', data: incomeData, backgroundColor: '#40C057', borderRadius: 4 },
            { label: '지출', data: expenseData, backgroundColor: '#FA5252', borderRadius: 4 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { font: { family: 'Pretendard' } } },
            tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(c.raw)}` } },
          },
          scales: {
            y: {
              ticks: {
                callback: (v) => (v >= 10000 ? `${Math.round(v / 10000)}만` : v),
                font: { family: 'Pretendard' },
              },
            },
            x: { ticks: { font: { family: 'Pretendard' } } },
          },
        },
      });
    } catch (err) {
      emptyEl.textContent = '추이를 불러오지 못했습니다.';
      emptyEl.style.display = 'block';
    }
  };

  // 3. 카테고리별 분석 (도넛 + 순위)
  const loadCategory = async (type) => {
    const emptyEl = div.querySelector('#cat-empty');
    const rankEl = div.querySelector('#cat-ranking');
    const canvas = div.querySelector('#categoryChart');
    try {
      const res = await api.get(`/api/statistics/categories?date_from=${dateFrom}&date_to=${dateTo}&type=${type}`);
      const items = res.categories || [];

      if (items.length === 0) {
        if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
        canvas.style.display = 'none';
        rankEl.innerHTML = '';
        emptyEl.textContent = type === 'EXPENSE' ? '지출 내역이 없습니다.' : '수입 내역이 없습니다.';
        emptyEl.style.display = 'block';
        return;
      }
      emptyEl.style.display = 'none';
      canvas.style.display = '';

      const labels = items.map(i => i.name || '기타');
      const data = items.map(i => i.amount);

      if (categoryChart) categoryChart.destroy();
      categoryChart = new window.Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: PALETTE.slice(0, data.length),
            borderWidth: 1,
            borderColor: '#fff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => `${c.label}: ${formatCurrency(c.raw)}` } },
          },
          cutout: '62%',
        },
      });

      rankEl.innerHTML = items.map((i, idx) => {
        const color = PALETTE[idx % PALETTE.length];
        return `
          <div style="margin-bottom: 0.6rem;">
            <div class="flex-between" style="font-size: 0.9rem;">
              <span style="display: inline-flex; align-items: center; gap: 6px;">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: ${color}; display: inline-block;"></span>
                ${escapeHtml(i.name || '기타')}
              </span>
              <span><strong>${formatCurrency(i.amount)}</strong> <span class="text-muted" style="font-size: 0.8rem;">${i.ratio}%</span></span>
            </div>
            ${miniBar(i.ratio, color)}
          </div>
        `;
      }).join('');
    } catch (err) {
      if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
      canvas.style.display = 'none';
      rankEl.innerHTML = '';
      emptyEl.textContent = '데이터를 불러오지 못했습니다.';
      emptyEl.style.display = 'block';
    }
  };

  // 토글 이벤트
  div.querySelectorAll('#trend-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      div.querySelectorAll('#trend-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTrend(btn.dataset.period);
    });
  });
  div.querySelectorAll('#cat-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      div.querySelectorAll('#cat-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadCategory(btn.dataset.type);
    });
  });

  // 차트는 DOM 부착 후 생성해야 하므로 렌더 다음 프레임에 로드
  requestAnimationFrame(() => {
    loadSummaryCards();
    loadTrend('daily');
    loadCategory('EXPENSE');
  });

  bindLayoutEvents(div);

  return div;
}
