import { api, downloadFile } from '../api.js';
import { formatCurrency, formatDate, escapeHtml } from '../utils/formatters.js';
import { createPageLayout, bindLayoutEvents } from '../utils/layout.js';
import { renderCategoryWithIcon } from '../utils/category-icons.js';
import { skeletonRows } from '../utils/ui.js';

export function renderTransactions() {
  const div = document.createElement('div');
  
  const contentHtml = `
    <div class="flex-between mb-4">
      <h2 style="font-size: 1.5rem; margin: 0; font-weight: 700;">거래 내역</h2>
      <div style="display: flex; gap: var(--spacing-sm);">
        <button class="btn btn-outline" id="btn-export" style="width: auto; padding: 0.45rem 0.9rem; font-size: 0.85rem;">내보내기</button>
        <button class="btn btn-primary" id="btn-add-tx" style="width: auto; padding: 0.45rem 1rem; font-size: 0.85rem; font-weight: 600;">+ 내역 추가</button>
      </div>
    </div>

    <div class="card tx-filters">
      <select id="filter-type" class="form-control">
        <option value="">전체 유형</option>
        <option value="EXPENSE">지출</option>
        <option value="INCOME">수입</option>
      </select>
      <select id="filter-category" class="form-control">
        <option value="">전체 카테고리</option>
      </select>
      <input type="date" id="filter-from" class="form-control" aria-label="시작일" />
      <input type="date" id="filter-to" class="form-control" aria-label="종료일" />
      <input type="text" id="filter-keyword" class="form-control" placeholder="내용 검색" />
      <button class="btn btn-outline" id="filter-apply" style="width: auto; padding: 0.45rem 0.9rem; font-size: 0.85rem;">검색</button>
      <button class="btn btn-outline" id="filter-reset" style="width: auto; padding: 0.45rem 0.9rem; font-size: 0.85rem;">초기화</button>
    </div>

    <div id="tx-list">
      <div class="text-center text-muted mt-4">로딩 중...</div>
    </div>

    <div id="tx-pagination" class="tx-pagination"></div>

    <!-- 거래 추가/수정 모달 -->
    <dialog id="tx-modal" style="border: none; border-radius: var(--radius-lg); padding: var(--spacing-lg); width: 90%; max-width: 450px; box-shadow: var(--shadow-lg);">
      <h3 class="mb-4" id="tx-modal-title">새 거래 추가</h3>
      <form id="tx-form">
        <input type="hidden" id="tx-edit-id" value="" />
        
        <!-- 수입/지출 탭 토글 -->
        <div class="tab-toggle-container">
          <div class="tab-toggle-btn active expense" data-val="EXPENSE">지출</div>
          <div class="tab-toggle-btn income" data-val="INCOME">수입</div>
        </div>
        <input type="hidden" id="tx-type" value="EXPENSE" required />

        <div class="form-group mt-4">
          <label class="form-label">금액</label>
          <input type="number" id="tx-amount" class="form-control" placeholder="예) 5000" min="1" step="1" required style="font-size: 1.25rem; font-weight: 600;" />
        </div>
        
        <div class="form-group">
          <label class="form-label">날짜 및 시간</label>
          <div style="display: flex; gap: 8px;">
            <input type="date" id="tx-date" class="form-control" required style="flex: 2;" />
            <input type="time" id="tx-time" class="form-control" style="flex: 1;" />
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">카테고리</label>
          <select id="tx-category" class="form-control" required>
            <option value="">선택하세요</option>
          </select>
        </div>
        
        <div class="form-group mb-4">
          <label class="form-label">내용 (선택)</label>
          <input type="text" id="tx-desc" class="form-control" placeholder="예) 스타벅스 커피" />
        </div>
        
        <div class="flex-between">
          <button type="button" class="btn btn-outline" id="tx-cancel" style="width: 48%;">취소</button>
          <button type="submit" class="btn btn-primary" id="tx-submit" style="width: 48%;">저장</button>
        </div>
      </form>
    </dialog>
  `;

  div.innerHTML = createPageLayout('transactions', contentHtml);

  const listContainer = div.querySelector('#tx-list');
  const modal = div.querySelector('#tx-modal');
  const form = div.querySelector('#tx-form');
  const filterType = div.querySelector('#filter-type');
  const filterCategory = div.querySelector('#filter-category');
  const filterFrom = div.querySelector('#filter-from');
  const filterTo = div.querySelector('#filter-to');
  const filterKeyword = div.querySelector('#filter-keyword');
  const paginationEl = div.querySelector('#tx-pagination');
  const categorySelect = div.querySelector('#tx-category');

  const PAGE_SIZE = 20;
  let offset = 0;
  let total = 0;
  let allCategories = [];
  let currentTransactions = [];

  // 현재 날짜/시간 포맷팅 유틸
  const getNowStr = () => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return { date, time };
  };

  // 탭 토글 로직
  const typeInput = div.querySelector('#tx-type');
  div.querySelectorAll('.tab-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      div.querySelectorAll('.tab-toggle-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      typeInput.value = target.dataset.val;
      
      // 유형 변경 시 카테고리 목록 리렌더링
      renderCategoryOptions(typeInput.value);
    });
  });

  const loadCategories = async () => {
    try {
      allCategories = await api.get('/api/categories/');
      allCategories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        filterCategory.appendChild(opt);
      });
    } catch (err) {
      console.error('카테고리 로드 실패', err);
    }
  };

  const renderCategoryOptions = (type) => {
    const filtered = allCategories.filter(c => c.type === type);
    categorySelect.innerHTML = '<option value="">선택하세요</option>';
    filtered.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      // 이모지는 select 안에서 렌더링되지 않으므로 텍스트만 표시
      opt.textContent = c.name;
      categorySelect.appendChild(opt);
    });
  };

  const renderList = () => {
    listContainer.innerHTML = '';
    const filtered = currentTransactions;

    if (filtered.length === 0) {
      listContainer.innerHTML = '<div class="card text-center text-muted" style="padding: 3rem 1rem;">조건에 맞는 거래 내역이 없습니다.</div>';
      return;
    }

    // 날짜별 그룹핑 로직
    let currentDate = '';
    let dailyTotal = 0;
    let currentGroupContainer = null;

    // 날짜별 그룹 헤더 생성
    const createDateHeader = (dateStr) => {
      const wrap = document.createElement('div');
      wrap.style.marginBottom = '1.5rem';
      
      const header = document.createElement('div');
      header.className = 'flex-between';
      header.style.padding = '0.5rem 0';
      header.style.borderBottom = '2px solid var(--color-border)';
      header.style.marginBottom = '0.5rem';
      
      const dateEl = document.createElement('div');
      dateEl.style.fontWeight = '700';
      dateEl.style.fontSize = '1.1rem';
      dateEl.textContent = formatDate(dateStr);
      
      const summaryEl = document.createElement('div');
      summaryEl.className = 'daily-summary'; // 추후 계산 후 업데이트
      summaryEl.style.fontSize = '0.9rem';
      summaryEl.style.fontWeight = '600';
      
      header.appendChild(dateEl);
      header.appendChild(summaryEl);
      wrap.appendChild(header);
      
      return { wrap, summaryEl };
    };

    filtered.forEach(tx => {
      if (tx.transaction_date !== currentDate) {
        // 이전 그룹 요약 업데이트
        if (currentGroupContainer && dailyTotal !== 0) {
          const s = currentGroupContainer.summaryEl;
          s.textContent = (dailyTotal > 0 ? '+' : '') + formatCurrency(dailyTotal);
          s.style.color = dailyTotal > 0 ? 'var(--color-income)' : 'var(--color-expense)';
        }
        
        currentDate = tx.transaction_date;
        dailyTotal = 0;
        
        const groupInfo = createDateHeader(currentDate);
        currentGroupContainer = groupInfo;
        listContainer.appendChild(groupInfo.wrap);
      }

      const isIncome = tx.type === 'INCOME';
      dailyTotal += isIncome ? tx.amount : -tx.amount;

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
          <div class="text-muted" style="font-size: 0.75rem; margin-top: 2px;">
            ${tx.transaction_time ? tx.transaction_time.substring(0,5) : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 4px; color: ${isIncome ? 'var(--color-income)' : 'var(--color-text-primary)'}">
            ${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}
          </div>
          ${hasSettledShare ? `
          <div style="font-size: 0.75rem; font-weight: 600; color: var(--color-primary); margin-bottom: 4px;">
            실부담 ${formatCurrency(tx.actual_amount)}
          </div>` : ''}
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button class="btn-edit" style="font-size: 0.75rem; color: var(--color-primary);">수정</button>
            <button class="btn-delete" style="font-size: 0.75rem; color: var(--color-text-secondary);">삭제</button>
          </div>
        </div>
      `;

      // 수정
      card.querySelector('.btn-edit').addEventListener('click', () => openEditModal(tx));
      
      // 삭제
      card.querySelector('.btn-delete').addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await api.delete(`/api/transactions/${tx.id}`);
          loadTransactions();
        } catch(err) {
          alert('삭제 실패: ' + err.message);
        }
      });

      currentGroupContainer.wrap.appendChild(card);
    });
    
    // 마지막 그룹 요약 업데이트
    if (currentGroupContainer && dailyTotal !== 0) {
      const s = currentGroupContainer.summaryEl;
      s.textContent = (dailyTotal > 0 ? '+' : '') + formatCurrency(dailyTotal);
      s.style.color = dailyTotal > 0 ? 'var(--color-income)' : 'var(--color-expense)';
    }
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set('limit', PAGE_SIZE);
    params.set('offset', offset);
    if (filterType.value) params.set('type', filterType.value);
    if (filterCategory.value) params.set('category_id', filterCategory.value);
    if (filterFrom.value) params.set('date_from', filterFrom.value);
    if (filterTo.value) params.set('date_to', filterTo.value);
    const kw = filterKeyword.value.trim();
    if (kw) params.set('keyword', kw);
    return params.toString();
  };

  const renderPagination = () => {
    if (total === 0) { paginationEl.innerHTML = ''; return; }
    const start = offset + 1;
    const end = Math.min(offset + PAGE_SIZE, total);
    const hasPrev = offset > 0;
    const hasNext = offset + PAGE_SIZE < total;
    paginationEl.innerHTML = `
      <span class="text-muted" style="font-size: 0.85rem;">총 ${total}건 중 ${start}–${end}</span>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-outline" id="page-prev" style="width: auto; padding: 0.35rem 0.8rem; font-size: 0.85rem;" ${hasPrev ? '' : 'disabled'}>이전</button>
        <button class="btn btn-outline" id="page-next" style="width: auto; padding: 0.35rem 0.8rem; font-size: 0.85rem;" ${hasNext ? '' : 'disabled'}>다음</button>
      </div>
    `;
    paginationEl.querySelector('#page-prev').addEventListener('click', () => {
      if (offset > 0) { offset -= PAGE_SIZE; loadTransactions(); }
    });
    paginationEl.querySelector('#page-next').addEventListener('click', () => {
      if (offset + PAGE_SIZE < total) { offset += PAGE_SIZE; loadTransactions(); }
    });
  };

  const loadTransactions = async () => {
    try {
      listContainer.innerHTML = skeletonRows(6);
      const res = await api.get(`/api/transactions/?${buildQuery()}`);
      currentTransactions = res.items || [];
      total = res.total || 0;

      // 현재 페이지가 비었는데 이전 페이지가 있으면(삭제 등) 첫 페이지로 보정 후 재조회
      if (currentTransactions.length === 0 && offset > 0 && total > 0) {
        offset = 0;
        return loadTransactions();
      }

      renderList();
      renderPagination();
    } catch (err) {
      listContainer.innerHTML = '<div class="alert alert-important">내역을 불러오지 못했습니다.</div>';
      paginationEl.innerHTML = '';
    }
  };

  const applyFilters = () => { offset = 0; loadTransactions(); };

  filterType.addEventListener('change', applyFilters);
  filterCategory.addEventListener('change', applyFilters);
  filterFrom.addEventListener('change', applyFilters);
  filterTo.addEventListener('change', applyFilters);
  filterKeyword.addEventListener('keyup', (e) => { if (e.key === 'Enter') applyFilters(); });
  div.querySelector('#filter-apply').addEventListener('click', applyFilters);
  div.querySelector('#filter-reset').addEventListener('click', () => {
    filterType.value = '';
    filterCategory.value = '';
    filterFrom.value = '';
    filterTo.value = '';
    filterKeyword.value = '';
    applyFilters();
  });
  
  // CSV 내보내기
  const exportBtn = div.querySelector('#btn-export');
  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    try {
      await downloadFile('/api/transactions/export', 'transactions.csv');
    } catch (err) {
      alert('내보내기 실패: ' + err.message);
    } finally {
      exportBtn.disabled = false;
    }
  });

  // 새 거래 내역 추가 버튼 연결
  const addBtn = div.querySelector('#btn-add-tx');
  addBtn.addEventListener('click', () => {
    div.querySelector('#tx-modal-title').textContent = '새 거래 추가';
    div.querySelector('#tx-edit-id').value = '';
    form.reset();
    
    // 기본적으로 지출 탭 토글 활성화
    div.querySelectorAll('.tab-toggle-btn').forEach(b => b.classList.remove('active'));
    div.querySelector('.tab-toggle-btn.expense').classList.add('active');
    typeInput.value = 'EXPENSE';
    renderCategoryOptions('EXPENSE');
    
    // 현재 날짜/시간 프리필(Prefill)
    const now = getNowStr();
    div.querySelector('#tx-date').value = now.date;
    div.querySelector('#tx-time').value = now.time;

    if (!modal.open) modal.showModal();
  });

  // 모달 제어
  const openEditModal = (tx) => {
    div.querySelector('#tx-modal-title').textContent = '거래 내역 수정';
    div.querySelector('#tx-edit-id').value = tx.id;
    
    // 탭 갱신
    div.querySelectorAll('.tab-toggle-btn').forEach(b => b.classList.remove('active'));
    const activeTab = div.querySelector(`.tab-toggle-btn[data-val="${tx.type}"]`);
    activeTab.classList.add('active');
    typeInput.value = tx.type;
    
    renderCategoryOptions(tx.type);
    
    div.querySelector('#tx-amount').value = tx.amount;
    div.querySelector('#tx-date').value = tx.transaction_date;
    div.querySelector('#tx-time').value = tx.transaction_time || '';
    div.querySelector('#tx-category').value = tx.category_id;
    div.querySelector('#tx-desc').value = tx.description || '';

    if (!modal.open) modal.showModal();
  };

  div.querySelector('#tx-cancel').addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = div.querySelector('#tx-submit');
    btnSubmit.disabled = true;

    const editId = div.querySelector('#tx-edit-id').value;
    const payload = {
      type: typeInput.value,
      amount: parseInt(div.querySelector('#tx-amount').value, 10),
      category_id: div.querySelector('#tx-category').value,
      transaction_date: div.querySelector('#tx-date').value,
    };
    
    const timeVal = div.querySelector('#tx-time').value;
    if (timeVal) payload.transaction_time = timeVal;
    
    // 수정 시에는 빈 값('')도 보내 내용을 지울 수 있게 한다(백엔드는 null이면 미변경 처리).
    const descVal = div.querySelector('#tx-desc').value;
    if (editId || descVal) payload.description = descVal;

    try {
      if (editId) {
        await api.patch(`/api/transactions/${editId}`, payload);
      } else {
        await api.post('/api/transactions/', payload);
      }
      modal.close();
      applyFilters();
    } catch (err) {
      alert((editId ? '수정' : '추가') + ' 실패: ' + err.message);
    } finally {
      btnSubmit.disabled = false;
    }
  });

  // 초기화 로직
  loadCategories().then(() => {
    loadTransactions();
    // 다른 페이지의 FAB/빈 상태 CTA에서 진입한 경우 모달 자동 오픈
    if (sessionStorage.getItem('open_tx_modal')) {
      sessionStorage.removeItem('open_tx_modal');
      addBtn.click();
    }
  });
  bindLayoutEvents(div);

  return div;
}
