import { api } from '../api.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export function renderTransactions() {
  const div = document.createElement('div');
  div.innerHTML = `
    <header class="app-header">
      <div class="header-content">
        <div class="logo">Donote</div>
        <nav class="header-nav">
          <a href="#/" class="nav-link">홈</a>
          <a href="#/transactions" class="nav-link active">내역</a>
          <a href="#/statistics" class="nav-link">통계</a>
          <a href="#/budget" class="nav-link">예산</a>
          <a href="#/settlements" class="nav-link">정산</a>
          <a href="#/goals" class="nav-link">목표</a>
          <a href="#/notifications" class="nav-link">알림</a>
        </nav>
      </div>
    </header>
    
    <main class="container" style="padding-bottom: 80px;">
      <div class="flex-between mb-4">
        <h2>전체 거래 내역</h2>
      </div>
      
      <div id="tx-list">
        <div style="text-align: center; color: var(--color-text-secondary); margin-top: 50px;">
          로딩 중...
        </div>
      </div>

      <!-- 플로팅 액션 버튼 (추가) -->
      <button class="fab" id="fab-add-tx">+</button>

      <!-- 모달: 거래 추가 -->
      <dialog id="tx-modal" style="border: none; border-radius: var(--radius-lg); padding: var(--spacing-lg); width: 90%; max-width: 400px; box-shadow: var(--shadow-lg);">
        <h3 class="mb-4">새 거래 추가</h3>
        <form id="tx-form">
          <div class="form-group">
            <label class="form-label">유형</label>
            <select id="tx-type" class="form-control" required>
              <option value="EXPENSE">지출</option>
              <option value="INCOME">수입</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">카테고리</label>
            <select id="tx-category" class="form-control" required>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">금액 (원)</label>
            <input type="number" id="tx-amount" class="form-control" required min="0">
          </div>
          <div class="form-group">
            <label class="form-label">날짜</label>
            <input type="date" id="tx-date" class="form-control" required>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">내용</label>
            <input type="text" id="tx-desc" class="form-control" required placeholder="예: 스타벅스 커피">
          </div>
          <div class="flex-between">
            <button type="button" class="btn btn-outline" id="tx-cancel" style="width: 48%;">취소</button>
            <button type="submit" class="btn btn-primary" style="width: 48%;">저장</button>
          </div>
        </form>
      </dialog>
    </main>
  `;

  const txList = div.querySelector('#tx-list');
  const modal = div.querySelector('#tx-modal');
  const fab = div.querySelector('#fab-add-tx');
  const form = div.querySelector('#tx-form');
  const cancelBtn = div.querySelector('#tx-cancel');
  const categorySelect = div.querySelector('#tx-category');

  let allCategories = [];

  const loadCategories = async () => {
    try {
      allCategories = await api.get('/api/categories/');
      updateCategoryOptions('EXPENSE');
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const updateCategoryOptions = (type) => {
    categorySelect.innerHTML = '';
    const filtered = allCategories.filter(c => c.type === type);
    filtered.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      categorySelect.appendChild(opt);
    });
  };

  div.querySelector('#tx-type').addEventListener('change', (e) => {
    updateCategoryOptions(e.target.value);
  });

  // 데이터 로드
  const loadTransactions = async () => {
    try {
      const transactions = await api.get('/transactions/');
      txList.innerHTML = '';

      if (transactions.length === 0) {
        txList.innerHTML = '<div class="card text-center text-muted">등록된 거래 내역이 없습니다.</div>';
        return;
      }

      transactions.forEach(tx => {
        const card = document.createElement('div');
        card.className = 'card flex-between';
        card.style.marginBottom = 'var(--spacing-sm)';
        
        const isExpense = tx.type === 'EXPENSE';
        const colorClass = isExpense ? 'text-expense' : 'text-income';
        const sign = isExpense ? '-' : '+';

        card.innerHTML = `
          <div>
            <div style="font-weight: 600;">${tx.description || '내용 없음'}</div>
            <div class="text-muted" style="font-size: 0.875rem;">${tx.transaction_date}</div>
          </div>
          <div style="text-align: right;">
            <div class="${colorClass}" style="font-weight: 700; font-size: 1.125rem;">
              ${sign}${formatCurrency(tx.amount)}
            </div>
            <button class="text-muted" style="font-size: 0.75rem; text-decoration: underline;" data-id="${tx.id}">삭제</button>
          </div>
        `;
        
        // 삭제 버튼 이벤트
        const deleteBtn = card.querySelector('button');
        deleteBtn.addEventListener('click', async () => {
          if (confirm('정말로 삭제하시겠습니까? (연결된 정산이 있다면 실패할 수 있습니다)')) {
            try {
              await api.delete(`/transactions/${tx.id}`);
              loadTransactions(); // 새로고침
            } catch (err) {
              alert(`삭제 실패: ${err.message}`);
            }
          }
        });

        txList.appendChild(card);
      });
    } catch (error) {
      txList.innerHTML = '<div class="alert alert-important">내역을 불러오지 못했습니다.</div>';
    }
  };

  // 모달 제어
  fab.addEventListener('click', () => {
    form.reset();
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    modal.showModal();
  });

  cancelBtn.addEventListener('click', () => {
    modal.close();
  });

  // 폼 제출 (추가)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // UUID v4 형식의 더미 카테고리 ID (기본 카테고리) - 백엔드 모델에 따라 유효한 ID 필요
    // 일단 백엔드 모델을 확인해야하지만, 임시로 처리
    const payload = {
      type: document.getElementById('tx-type').value,
      category_id: document.getElementById('tx-category').value,
      amount: parseFloat(document.getElementById('tx-amount').value),
      description: document.getElementById('tx-desc').value,
      transaction_date: document.getElementById('tx-date').value,
      transaction_time: "12:00:00"
    };

    try {
      await api.post('/transactions/', payload);
      modal.close();
      loadTransactions(); // 새로고침
    } catch (err) {
      alert(`추가 실패: ${err.message}`);
    }
  });

  loadCategories();
  loadTransactions();

  return div;
}
