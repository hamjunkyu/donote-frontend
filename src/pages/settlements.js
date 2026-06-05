import { api, unwrapList } from '../api.js';
import { formatCurrency, escapeHtml } from '../utils/formatters.js';
import { createPageLayout, bindLayoutEvents } from '../utils/layout.js';

export function renderSettlements() {
  const div = document.createElement('div');
  
  const contentHtml = `
    <div class="flex-between mb-4">
      <h2 style="font-size: 1.5rem;">내 정산 목록</h2>
      <button class="btn btn-primary" id="btn-add-settlement" style="width: auto; padding: 0.4rem 1rem; font-size: 0.85rem;">정산 추가</button>
    </div>
      
      <div id="settlement-list">
        <div class="text-center text-muted mt-4">로딩 중...</div>
      </div>

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

      <!-- 정산 수정 모달: 분배 방식 변경 + 참여자별 금액 수정 통합 -->
      <dialog id="edit-settlement-modal" style="border: none; border-radius: var(--radius-lg); padding: var(--spacing-lg); width: 90%; max-width: 450px; box-shadow: var(--shadow-lg);">
        <h3 class="mb-4">정산 수정</h3>
        <form id="edit-settlement-form">
          <input type="hidden" id="edit-s-id" />
          <input type="hidden" id="edit-s-total" />

          <div class="form-group">
            <label class="form-label">분배 방식</label>
            <select id="edit-s-split-type" class="form-control" required>
              <option value="EQUAL">N빵 (균등 분배)</option>
              <option value="CUSTOM">직접 입력</option>
            </select>
          </div>

          <div class="form-group" id="edit-participants-section" style="display: none;">
            <label class="form-label">참여자별 금액</label>
            <div id="edit-participant-list" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--color-border); border-radius: 8px; padding: 0.5rem;">
              <!-- 동적 생성 -->
            </div>
            <div class="flex-between mt-2" style="font-size: 0.85rem;">
              <span class="text-muted">합계가 총금액과 일치해야 합니다</span>
              <span><span id="edit-sum" style="font-weight: 700;">0원</span> / <span id="edit-total-label" class="text-muted">0원</span></span>
            </div>
          </div>

          <div class="flex-between mt-4">
            <button type="button" class="btn btn-outline" id="edit-s-cancel" style="width: 48%;">취소</button>
            <button type="submit" class="btn btn-primary" id="edit-s-submit" style="width: 48%;">저장</button>
          </div>
        </form>
      </dialog>
  `;

  div.innerHTML = createPageLayout('settlements', contentHtml);

  const listContainer = div.querySelector('#settlement-list');
  const modal = div.querySelector('#settlement-modal');
  const addBtn = div.querySelector('#btn-add-settlement');
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
        // 참여자 + 미수금 병렬 조회
        const [participants, debts] = await Promise.all([
          api.get(`/api/settlements/${s.id}/participants`).catch(() => []),
          api.get(`/api/settlements/${s.id}/debts`).catch(() => []),
        ]);

        const card = document.createElement('div');
        card.className = 'card mb-3';

        const isPending = s.status === 'PENDING';
        const isCompleted = s.status === 'COMPLETED';

        let statusBadge = '';
        if (isPending) statusBadge = '<span style="background: #fcc419; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">진행중</span>';
        else if (isCompleted) statusBadge = '<span style="background: #40c057; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">완료됨</span>';
        else statusBadge = '<span style="background: #fa5252; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">취소됨</span>';

        let pListHtml = '';
        participants.forEach(p => {
          const isSettled = p.status === 'SETTLED';
          pListHtml += `
            <div class="flex-between" style="padding: 0.5rem 0; border-bottom: 1px solid var(--color-border);">
              <span>${escapeHtml(p.display_name)}</span>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="${isSettled ? 'text-income' : 'text-expense'}" style="font-weight: 600;">
                  ${formatCurrency(p.amount)}
                </span>
                ${!isSettled && isPending ? `<button class="btn-settle" data-pid="${p.id}" style="background: var(--color-primary); color: white; border: none; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.7rem;">완료</button>` : ''}
              </div>
            </div>
          `;
        });

        // 미수금 박스: 정산 안 된 참여자만 노출
        const settledNames = new Set(
          participants.filter(p => p.status === 'SETTLED').map(p => p.display_name)
        );
        const outstandingDebts = debts.filter(d => !settledNames.has(d.from));

        let debtsHtml = '';
        // 취소된 정산에는 미수금 정보가 의미 없으므로 표시하지 않음
        if (debts.length > 0 && (isPending || isCompleted)) {
          if (outstandingDebts.length === 0) {
            debtsHtml = `
              <div style="margin-top: 0.75rem; background: var(--color-income-light); border-radius: 8px; padding: 0.6rem 0.75rem; color: var(--color-income); font-weight: 600; text-align: center; font-size: 0.9rem;">
                ✅ 모든 미수금이 정산되었습니다
              </div>
            `;
          } else {
            const rowsHtml = outstandingDebts.map(d => `
              <div class="flex-between" style="padding: 0.3rem 0; font-size: 0.9rem;">
                <span><strong>${escapeHtml(d.from)}</strong> <span class="text-muted">→</span> ${escapeHtml(d.to)}</span>
                <span class="text-expense" style="font-weight: 700;">${formatCurrency(d.amount)}</span>
              </div>
            `).join('');

            debtsHtml = `
              <div style="margin-top: 0.75rem; background: var(--color-expense-light); border-radius: 8px; padding: 0.6rem 0.75rem;">
                <div style="font-weight: 700; font-size: 0.8rem; color: var(--color-expense); margin-bottom: 0.25rem;">💰 남은 미수금</div>
                ${rowsHtml}
              </div>
            `;
          }
        }

        // 상태별 액션 버튼 클러스터 (우측 상단)
        let actionBtnsHtml = '';
        if (isPending) {
          actionBtnsHtml = `
            <div style="display: flex; gap: 0.75rem; align-items: center;">
              <button class="btn-edit-settlement text-primary" data-sid="${s.id}" style="font-size: 0.8rem;">수정</button>
              <button class="btn-complete-all text-muted" data-sid="${s.id}" style="font-size: 0.8rem; text-decoration: underline;">전체완료</button>
            </div>
          `;
        } else if (isCompleted) {
          actionBtnsHtml = `
            <button class="btn-revert text-primary" data-sid="${s.id}" style="font-size: 0.8rem;">되돌리기</button>
          `;
        }

        const settledCount = participants.filter(p => p.status === 'SETTLED').length;
        const totalCount = participants.length;

        card.innerHTML = `
          <div class="flex-between mb-2">
            <div style="font-weight: 600; font-size: 1.1rem;">
              총 ${formatCurrency(s.total_amount)}
              ${statusBadge}
            </div>
            ${actionBtnsHtml}
          </div>
          <div class="flex-between mb-3 text-muted" style="font-size: 0.85rem;">
            <span>분배 방식: ${s.split_type === 'EQUAL' ? '균등 분배' : '직접 입력'}</span>
            <span style="font-weight: 600; color: var(--color-primary);">정산 상태: ${settledCount}/${totalCount} 완료</span>
          </div>
          <div style="background: var(--color-background); border-radius: 8px; padding: 0.5rem;">
            ${pListHtml}
          </div>
          ${debtsHtml}
        `;

        // 개별 완료 처리
        card.querySelectorAll('.btn-settle').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await api.patch(`/api/settlements/participants/${e.target.dataset.pid}/settle`);
            loadSettlements();
          });
        });

        // 전체 완료 처리
        const btnCompleteAll = card.querySelector('.btn-complete-all');
        if (btnCompleteAll) {
          btnCompleteAll.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              await api.patch(`/api/settlements/${e.target.dataset.sid}/complete`);
              loadSettlements();
            } catch (err) {
              alert(err.message || '아직 완료되지 않은 인원이 있습니다.');
            }
          });
        }

        // 수정 버튼 (PENDING)
        const btnEdit = card.querySelector('.btn-edit-settlement');
        if (btnEdit) {
          btnEdit.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openEditModal(s, participants);
          });
        }

        // 되돌리기 버튼 (COMPLETED)
        const btnRevert = card.querySelector('.btn-revert');
        if (btnRevert) {
          btnRevert.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!confirm('완료된 정산을 진행중 상태로 되돌릴까요?')) return;
            try {
              await api.patch(`/api/settlements/${e.target.dataset.sid}/revert`);
              loadSettlements();
            } catch (err) {
              alert('되돌리기 실패: ' + err.message);
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
      allTransactions = unwrapList(await api.get('/api/transactions/?limit=100'));
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

  addBtn.addEventListener('click', () => {
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

  // ==== 정산 수정 모달 (분배 방식 변경 + 참여자별 금액 수정) ====
  const editModal = div.querySelector('#edit-settlement-modal');
  const editForm = div.querySelector('#edit-settlement-form');
  const editSplitTypeSelect = div.querySelector('#edit-s-split-type');
  const editPartList = div.querySelector('#edit-participant-list');
  const editPartSection = div.querySelector('#edit-participants-section');
  const editSumEl = div.querySelector('#edit-sum');
  const editTotalLabel = div.querySelector('#edit-total-label');

  const updateEditSum = () => {
    const total = parseFloat(div.querySelector('#edit-s-total').value) || 0;
    const sum = Array.from(editPartList.querySelectorAll('.edit-p-amount'))
      .reduce((acc, inp) => acc + (parseFloat(inp.value) || 0), 0);
    editSumEl.textContent = formatCurrency(sum);
    editSumEl.style.color = Math.abs(sum - total) < 0.01
      ? 'var(--color-income)'
      : 'var(--color-expense)';
  };

  const refreshEditPartSection = () => {
    editPartSection.style.display = editSplitTypeSelect.value === 'CUSTOM' ? 'block' : 'none';
  };

  editSplitTypeSelect.addEventListener('change', refreshEditPartSection);

  function openEditModal(settlement, participants) {
    div.querySelector('#edit-s-id').value = settlement.id;
    div.querySelector('#edit-s-total').value = settlement.total_amount;
    editTotalLabel.textContent = formatCurrency(settlement.total_amount);

    // 참여자 행 생성
    editPartList.innerHTML = '';
    participants.forEach(p => {
      const row = document.createElement('div');
      row.className = 'edit-p-row flex-between mb-2';
      row.dataset.pid = p.id;
      row.innerHTML = `
        <span style="flex: 1; font-size: 0.9rem;">${escapeHtml(p.display_name)}</span>
        <input type="number" class="form-control edit-p-amount" value="${p.amount}" min="0" step="any" style="width: 45%;">
      `;
      row.querySelector('.edit-p-amount').addEventListener('input', updateEditSum);
      editPartList.appendChild(row);
    });

    editSplitTypeSelect.value = settlement.split_type;
    refreshEditPartSection();
    updateEditSum();
    editModal.showModal();
  }

  div.querySelector('#edit-s-cancel').addEventListener('click', () => editModal.close());

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = div.querySelector('#edit-s-submit');
    btnSubmit.disabled = true;

    try {
      const sid = div.querySelector('#edit-s-id').value;
      const splitType = editSplitTypeSelect.value;
      const totalAmount = parseFloat(div.querySelector('#edit-s-total').value);

      if (splitType === 'CUSTOM') {
        // 참여자별 금액으로 직접 수정 (edit_split 내부에서 split_type을 CUSTOM으로 자동 설정)
        const rows = editPartList.querySelectorAll('.edit-p-row');
        const splits = Array.from(rows).map(row => ({
          participant_id: row.dataset.pid,
          amount: parseFloat(row.querySelector('.edit-p-amount').value) || 0,
        }));

        const sum = splits.reduce((acc, s) => acc + s.amount, 0);
        if (Math.abs(sum - totalAmount) > 0.01) {
          alert(`참여자별 금액의 합이 총금액(${formatCurrency(totalAmount)})과 일치해야 합니다.`);
          return;
        }

        await api.patch(`/api/settlements/${sid}/split/edit`, { splits });
      } else {
        // EQUAL: 균등 재분배 후 split_type을 EQUAL로 설정
        // (split_equal은 amount만 재계산하고 split_type을 바꾸지 않으므로 추가 PATCH 필요)
        await api.post(`/api/settlements/${sid}/split/equal`);
        await api.patch(`/api/settlements/${sid}`, { split_type: 'EQUAL' });
      }

      editModal.close();
      loadSettlements();
    } catch (err) {
      alert('수정 실패: ' + err.message);
    } finally {
      btnSubmit.disabled = false;
    }
  });

  loadTransactionsForDropdown();
  loadSettlements();
  bindLayoutEvents(div);

  return div;
}
