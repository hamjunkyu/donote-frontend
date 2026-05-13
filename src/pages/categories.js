import { api } from '../api.js';
import { createPageLayout, bindLayoutEvents } from '../utils/layout.js';

export function renderCategories() {
  const div = document.createElement('div');
  
  const contentHtml = `
    <div class="flex-between mb-4">
      <h2 style="font-size: 1.5rem;">카테고리 관리</h2>
      <button class="btn btn-primary" id="btn-add-cat" style="width: auto; padding: 0.4rem 1rem; font-size: 0.85rem;">카테고리 추가</button>
    </div>

      <!-- 기본 카테고리 -->
      <h3 class="mb-2" style="font-size: 1rem;">📌 시스템 기본 카테고리</h3>
      <div id="default-categories" class="mb-4">
        <div class="text-center text-muted">로딩 중...</div>
      </div>

      <!-- 사용자 카테고리 -->
      <div class="flex-between mb-2">
        <h3 style="font-size: 1rem;">✏️ 내 카테고리</h3>
      </div>
      <div id="user-categories" class="mb-4">
        <div class="text-center text-muted">로딩 중...</div>
      </div>

      <!-- 생성/수정 모달 -->
      <dialog id="cat-modal" style="border: none; border-radius: var(--radius-lg); padding: var(--spacing-lg); width: 90%; max-width: 400px; box-shadow: var(--shadow-lg);">
        <h3 class="mb-4" id="cat-modal-title">카테고리 추가</h3>
        <form id="cat-form">
          <div class="form-group">
            <label class="form-label">카테고리 이름</label>
            <input type="text" id="cat-name" class="form-control" placeholder="예) 교육비" required maxlength="50" />
          </div>
          <div class="form-group mb-4" id="cat-type-group">
            <label class="form-label">유형</label>
            <select id="cat-type" class="form-control" required>
              <option value="EXPENSE">지출</option>
              <option value="INCOME">수입</option>
            </select>
          </div>
          <input type="hidden" id="cat-edit-id" value="" />
          <div class="flex-between">
            <button type="button" class="btn btn-outline" id="cat-cancel" style="width: 48%;">취소</button>
            <button type="submit" class="btn btn-primary" id="cat-submit" style="width: 48%;">추가</button>
          </div>
        </form>
      </dialog>
    </dialog>
  `;

  div.innerHTML = createPageLayout('categories', contentHtml);

  const defaultContainer = div.querySelector('#default-categories');
  const userContainer = div.querySelector('#user-categories');
  const modal = div.querySelector('#cat-modal');
  const form = div.querySelector('#cat-form');
  const addBtn = div.querySelector('#btn-add-cat');

  function typeBadge(type) {
    if (type === 'EXPENSE') {
      return '<span style="background: var(--color-expense-light); color: var(--color-expense); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">지출</span>';
    }
    return '<span style="background: var(--color-income-light); color: var(--color-income); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">수입</span>';
  }

  const loadCategories = async () => {
    try {
      const categories = await api.get('/api/categories/');
      
      const defaults = categories.filter(c => !c.user_id);
      const customs = categories.filter(c => c.user_id);

      // 기본 카테고리 렌더링
      if (defaults.length > 0) {
        defaultContainer.innerHTML = '';
        defaults.forEach(c => {
          const item = document.createElement('div');
          item.className = 'card flex-between';
          item.style.marginBottom = 'var(--spacing-sm)';
          item.innerHTML = `
            <div style="font-weight: 600;">${c.name}</div>
            <div>${typeBadge(c.type)}</div>
          `;
          defaultContainer.appendChild(item);
        });
      } else {
        defaultContainer.innerHTML = '<div class="card text-center text-muted">기본 카테고리가 없습니다.</div>';
      }

      // 사용자 카테고리 렌더링
      if (customs.length > 0) {
        userContainer.innerHTML = '';
        customs.forEach(c => {
          const item = document.createElement('div');
          item.className = 'card flex-between';
          item.style.marginBottom = 'var(--spacing-sm)';
          item.innerHTML = `
            <div style="font-weight: 600;">${c.name} ${typeBadge(c.type)}</div>
            <div style="display: flex; gap: 0.75rem;">
              <button class="text-primary btn-edit-cat" data-id="${c.id}" data-name="${c.name}" data-type="${c.type}" style="font-size: 0.85rem;">수정</button>
              <button class="text-expense btn-delete-cat" data-id="${c.id}" data-name="${c.name}" style="font-size: 0.85rem;">삭제</button>
            </div>
          `;

          // 수정 버튼
          item.querySelector('.btn-edit-cat').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            div.querySelector('#cat-modal-title').textContent = '카테고리 수정';
            div.querySelector('#cat-submit').textContent = '저장';
            div.querySelector('#cat-edit-id').value = btn.dataset.id;
            div.querySelector('#cat-name').value = btn.dataset.name;
            div.querySelector('#cat-type').value = btn.dataset.type;
            div.querySelector('#cat-type-group').style.display = 'none'; // 수정시 유형 변경 불가
            modal.showModal();
          });

          // 삭제 버튼
          item.querySelector('.btn-delete-cat').addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const btn = e.currentTarget;
            try {
              await api.delete(`/api/categories/${btn.dataset.id}`);
              loadCategories();
            } catch (err) {
              if (err.message.includes('사용 중')) {
                alert('거래에서 사용 중인 카테고리는 삭제할 수 없습니다.');
              } else {
                alert('삭제 실패: ' + err.message);
              }
            }
          });

          userContainer.appendChild(item);
        });
      } else {
        userContainer.innerHTML = '<div class="card text-center text-muted">사용자 정의 카테고리가 없습니다.</div>';
      }
    } catch (err) {
      defaultContainer.innerHTML = '<div class="alert alert-important">카테고리를 불러오지 못했습니다.</div>';
      userContainer.innerHTML = '';
    }
  };

  // 모달 제어
  addBtn.addEventListener('click', () => {
    div.querySelector('#cat-modal-title').textContent = '카테고리 추가';
    div.querySelector('#cat-submit').textContent = '추가';
    div.querySelector('#cat-edit-id').value = '';
    div.querySelector('#cat-type-group').style.display = 'block';
    form.reset();
    modal.showModal();
  });

  div.querySelector('#cat-cancel').addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = div.querySelector('#cat-submit');
    btnSubmit.disabled = true;

    const editId = div.querySelector('#cat-edit-id').value;

    try {
      if (editId) {
        // 수정 (이름만)
        await api.patch(`/api/categories/${editId}`, {
          name: div.querySelector('#cat-name').value
        });
      } else {
        // 생성
        await api.post('/api/categories/', {
          name: div.querySelector('#cat-name').value,
          type: div.querySelector('#cat-type').value
        });
      }
      modal.close();
      loadCategories();
    } catch (err) {
      alert((editId ? '수정' : '추가') + ' 실패: ' + err.message);
    } finally {
      btnSubmit.disabled = false;
    }
  });

  loadCategories();
  bindLayoutEvents(div);

  return div;
}
