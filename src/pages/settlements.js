import { api } from '../api.js';
import { formatCurrency } from '../utils/formatters.js';

export function renderSettlements() {
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
          <a href="#/settlements" class="nav-link active">정산</a>
          <a href="#/goals" class="nav-link">목표</a>
          <a href="#/notifications" class="nav-link">알림</a>
        </nav>
      </div>
    </header>
    
    <main class="container" style="padding-bottom: 80px;">
      <div class="flex-between mb-4">
        <h2>내 정산 목록</h2>
      </div>
      
      <div id="settlement-list">
        <div class="text-center text-muted mt-4">로딩 중...</div>
      </div>

      <button class="fab" id="fab-add-settlement">+</button>

      <!-- 정산 생성 모달 -->
      <dialog id="settlement-modal" style="border: none; border-radius: var(--radius-lg); padding: var(--spacing-lg); width: 90%; max-width: 450px; box-shadow: var(--shadow-lg);">
        <h3 class="mb-4">새 정산 만들기</h3>
        <form id="settlement-form">
          <div class="form-group">
            <label class="form-label">1. 지출 내역 선택 (정산할 거래)</label>
            <select id="s-transaction" class="form-control" required>
              <option value="">내역을 불러오는 중...</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">2. 분배 방식</label>
            <select id="s-split-type" class="form-control" required>
              <option value="EQUAL">N빵 (균등 분배)</option>
              <option value="CUSTOM">직접 입력</option>
            </select>
          </div>

          <div class="form-group mb-4">
            <label class="form-label flex-between">
              3. 참여자 추가 (본인 포함)
              <button type="button" class="btn btn-outline" id="btn-add-person" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">+ 인원 추가</button>
            </label>
            <div id="participant-list" style="max-height: 150px; overflow-y: auto; border: 1px solid var(--color-border); border-radius: 8px; padding: 0.5rem;">
              <!-- 동적 생성 -->
            </div>
          </div>
          
          <div class="flex-between">
            <button type="button" class="btn btn-outline" id="s-cancel" style="width: 48%;">취소</button>
            <button type="submit" class="btn btn-primary" id="s-submit" style="width: 48%;">정산 생성</button>
          </div>
        </form>
      </dialog>
    </main>
  `;

  const listContainer = div.querySelector('#settlement-list');
  const modal = div.querySelector('#settlement-modal');
  const fab = div.querySelector('#fab-add-settlement');
  const form = div.querySelector('#settlement-form');
  const txSelect = div.querySelector('#s-transaction');
  const splitTypeSelect = div.querySelector('#s-split-type');
  const participantList = div.querySelector('#participant-list');
  const addPersonBtn = div.querySelector('#btn-add-person');
  
  let allTransactions = [];

  const loadSettlements = async () => {
    try {
      const settlements = await api.get('/api/settlements/');
      listContainer.innerHTML = '';

      if (settlements.length === 0) {
        listContainer.innerHTML = '<div class="card text-center text-muted">진행 중인 정산이 없습니다.</div>';
        return;
      }

      for (const s of settlements) {
        // 참여자 목록 조회
        let participants = [];
        try {
          participants = await api.get(`/api/settlements/${s.id}/participants`);
        } catch (e) { console.error('참여자 로드 실패'); }

        const card = document.createElement('div');
        card.className = 'card mb-3';
        
        let statusBadge = '';
        if (s.status === 'PENDING') statusBadge = '<span style="background: #fcc419; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">진행중</span>';
        else if (s.status === 'COMPLETED') statusBadge = '<span style="background: #40c057; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">완료됨</span>';
        else statusBadge = '<span style="background: #fa5252; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">취소됨</span>';

        let pListHtml = '';
        participants.forEach(p => {
          const isSettled = p.status === 'SETTLED';
          pListHtml += `
            <div class="flex-between" style="padding: 0.5rem 0; border-bottom: 1px solid var(--color-border);">
              <span>${p.display_name}</span>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="${isSettled ? 'text-income' : 'text-expense'}" style="font-weight: 600;">
                  ${formatCurrency(p.amount)}
                </span>
                ${!isSettled && s.status === 'PENDING' ? `<button class="btn-settle" data-pid="${p.id}" style="background: var(--color-primary); color: white; border: none; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.7rem;">완료</button>` : ''}
              </div>
            </div>
          `;
        });

        const settledCount = participants.filter(p => p.status === 'SETTLED').length;
        const totalCount = participants.length;

        card.innerHTML = `
          <div class="flex-between mb-2">
            <div style="font-weight: 600; font-size: 1.1rem;">
              총 ${formatCurrency(s.total_amount)}
              ${statusBadge}
            </div>
            ${s.status === 'PENDING' ? `<button class="text-muted btn-complete-all" data-sid="${s.id}" style="font-size: 0.8rem; text-decoration: underline;">전체완료</button>` : ''}
          </div>
          <div class="flex-between mb-3 text-muted" style="font-size: 0.85rem;">
            <span>분배 방식: ${s.split_type === 'EQUAL' ? '균등 분배' : '직접 입력'}</span>
            <span style="font-weight: 600; color: var(--color-primary);">정산 상태: ${settledCount}/${totalCount} 완료</span>
          </div>
          <div style="background: var(--color-background); border-radius: 8px; padding: 0.5rem;">
            ${pListHtml}
          </div>
        `;

        // 개별 완료 처리
        card.querySelectorAll('.btn-settle').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            if(confirm('이 인원의 정산을 완료 처리할까요?')) {
              await api.patch(`/api/settlements/participants/${e.target.dataset.pid}/settle`);
              loadSettlements();
            }
          });
        });

        // 전체 완료 처리
        const btnCompleteAll = card.querySelector('.btn-complete-all');
        if (btnCompleteAll) {
          btnCompleteAll.addEventListener('click', async (e) => {
            if(confirm('정산을 최종 완료하시겠습니까? (모든 참여자가 정산 완료 상태여야 합니다)')) {
              try {
                await api.patch(`/api/settlements/${e.target.dataset.sid}/complete`);
                loadSettlements();
              } catch (err) {
                alert(err.message || '아직 완료되지 않은 인원이 있습니다.');
              }
            }
          });
        }

        listContainer.appendChild(card);
      }
    } catch (err) {
      listContainer.innerHTML = '<div class="alert alert-important">정산 목록을 불러오지 못했습니다.</div>';
    }
  };

  const loadTransactionsForDropdown = async () => {
    try {
      allTransactions = await api.get('/transactions/');
      txSelect.innerHTML = '<option value="">-- 거래 내역 선택 --</option>';
      
      const expenses = allTransactions.filter(t => t.type === 'EXPENSE');
      expenses.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.transaction_date} | ${t.description || '내용없음'} | ${formatCurrency(t.amount)}`;
        opt.dataset.amount = t.amount;
        txSelect.appendChild(opt);
      });
    } catch (err) {
      txSelect.innerHTML = '<option value="">내역 로드 실패</option>';
    }
  };

  const renderParticipantInputs = () => {
    const isCustom = splitTypeSelect.value === 'CUSTOM';
    const rows = participantList.querySelectorAll('.participant-row');
    rows.forEach(row => {
      const input = row.querySelector('.p-amount');
      if (input) {
        input.style.display = isCustom ? 'block' : 'none';
        input.required = isCustom;
      }
    });
  };

  const addParticipantRow = () => {
    const row = document.createElement('div');
    row.className = 'participant-row flex-between mb-2';
    row.innerHTML = `
      <input type="text" class="form-control p-name" placeholder="이름" required style="width: 45%;">
      <input type="number" class="form-control p-amount" placeholder="금액" min="0" style="width: 40%; display: none;">
      <button type="button" class="btn-remove-p" style="width: 10%; background: none; border: none; color: red; cursor: pointer;">X</button>
    `;
    row.querySelector('.btn-remove-p').addEventListener('click', () => {
      row.remove();
    });
    participantList.appendChild(row);
    renderParticipantInputs();
  };

  addPersonBtn.addEventListener('click', addParticipantRow);
  splitTypeSelect.addEventListener('change', renderParticipantInputs);

  fab.addEventListener('click', () => {
    form.reset();
    participantList.innerHTML = '';
    addParticipantRow(); // 기본 1명 (본인)
    addParticipantRow(); // 기본 1명 (상대)
    modal.showModal();
  });

  div.querySelector('#s-cancel').addEventListener('click', () => {
    modal.close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = div.querySelector('#s-submit');
    btnSubmit.disabled = true;
    btnSubmit.textContent = '생성 중...';

    try {
      const txId = txSelect.value;
      const splitType = splitTypeSelect.value;

      // 1. 정산 생성
      const settlement = await api.post('/api/settlements/', {
        transaction_id: txId,
        split_type: splitType
      });

      const sId = settlement.id;
      const rows = participantList.querySelectorAll('.participant-row');
      const customSplits = [];

      // 2. 참여자 추가
      for (const row of rows) {
        const name = row.querySelector('.p-name').value;
        const pRes = await api.post(`/api/settlements/${sId}/participants`, {
          display_name: name,
          amount: 0 // CUSTOM일 경우 추후 업데이트
        });
        
        if (splitType === 'CUSTOM') {
          const amt = parseFloat(row.querySelector('.p-amount').value) || 0;
          customSplits.push({
            participant_id: pRes.id,
            amount: amt
          });
        }
      }

      // 3. 분배 실행
      if (splitType === 'EQUAL') {
        await api.post(`/api/settlements/${sId}/split/equal`);
      } else {
        await api.post(`/api/settlements/${sId}/split/custom`, {
          splits: customSplits
        });
      }

      modal.close();
      loadSettlements();
    } catch (err) {
      alert(`정산 생성 실패: ${err.message}`);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = '정산 생성';
    }
  });

  loadTransactionsForDropdown();
  loadSettlements();

  return div;
}
