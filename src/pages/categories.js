import { api } from '../api.js';
import { escapeHtml } from '../utils/formatters.js';
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
      <div id="default-categories" class="cat-grid mb-4">
        <div class="text-center text-muted">로딩 중...</div>
      </div>

      <!-- 사용자 카테고리 -->
      <div class="flex-between mb-2" style="border-top: 1px solid var(--color-border); padding-top: var(--spacing-lg); margin-top: var(--spacing-md);">
        <h3 style="font-size: 1rem;">✏️ 내 카테고리</h3>
      </div>
      <div id="user-categories" class="cat-grid mb-4">
        <div class="text-center text-muted">로딩 중...</div>
      </div>

      <!-- 생성 모달 -->
      <dialog id="cat-modal" style="border: none; border-radius: var(--radius-lg); padding: var(--spacing-lg); width: 90%; max-width: 400px; box-shadow: var(--shadow-lg);">
        <h3 class="mb-4">카테고리 추가</h3>
        <form id="cat-form">
          <div class="form-group">
            <label class="form-label">카테고리 이름</label>
            <input type="text" id="cat-name" class="form-control" placeholder="예) 교육비" required maxlength="50" />
          </div>
          <div class="form-group mb-4">
            <label class="form-label">유형</label>
            <select id="cat-type" class="form-control" required>
              <option value="EXPENSE">지출</option>
              <option value="INCOME">수입</option>
            </select>
          </div>
          <div class="flex-between">
            <button type="button" class="btn btn-outline" id="cat-cancel" style="width: 48%;">취소</button>
            <button type="submit" class="btn btn-primary" id="cat-submit" style="width: 48%;">추가</button>
          </div>
        </form>
      </dialog>
  `;

  div.innerHTML = createPageLayout('categories', contentHtml);

  const defaultContainer = div.querySelector('#default-categories');
  const userContainer = div.querySelector('#user-categories');
  const modal = div.querySelector('#cat-modal');
  const form = div.querySelector('#cat-form');
  const addBtn = div.querySelector('#btn-add-cat');

  const renderCategoryItem = (c, isCustom) => {
    const item = document.createElement('div');
    item.className = 'card flex-between';

    if (!isCustom) {
      item.innerHTML = `<div style="font-weight: 600;">${escapeHtml(c.name)}</div>`;
      return item;
    }

    item.innerHTML = `
      <div style="font-weight: 600;">${escapeHtml(c.name)}</div>
      <button class="text-expense btn-delete-cat" data-id="${c.id}" style="font-size: 0.85rem;">삭제</button>
    `;

    item.querySelector('.btn-delete-cat').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await api.delete(`/api/categories/${e.currentTarget.dataset.id}`);
        loadCategories();
      } catch (err) {
        if (err.message.includes('사용 중')) {
          alert('거래에서 사용 중인 카테고리는 삭제할 수 없습니다.');
        } else {
          alert('삭제 실패: ' + err.message);
        }
      }
    });

    return item;
  };

  // 한 섹션을 지출/수입 소그룹으로 나눠 렌더링
  const renderCategorySection = (container, list, isCustom, emptyMsg) => {
    if (list.length === 0) {
      container.innerHTML = `<div class="card text-center text-muted" style="grid-column: 1 / -1;">${emptyMsg}</div>`;
      return;
    }
    container.innerHTML = '';
    [{ type: 'EXPENSE', label: '지출' }, { type: 'INCOME', label: '수입' }].forEach(group => {
      const items = list.filter(c => c.type === group.type);
      if (items.length === 0) return;
      const sub = document.createElement('div');
      sub.className = `cat-subhead ${group.type === 'EXPENSE' ? 'expense' : 'income'}`;
      sub.textContent = group.label;
      container.appendChild(sub);
      items.forEach(c => container.appendChild(renderCategoryItem(c, isCustom)));
    });
  };

  const loadCategories = async () => {
    try {
      const categories = await api.get('/api/categories/');
      renderCategorySection(defaultContainer, categories.filter(c => !c.user_id), false, '기본 카테고리가 없습니다.');
      renderCategorySection(userContainer, categories.filter(c => c.user_id), true, '사용자 정의 카테고리가 없습니다.');
    } catch (err) {
      defaultContainer.innerHTML = '<div class="alert alert-important" style="grid-column: 1 / -1;">카테고리를 불러오지 못했습니다.</div>';
      userContainer.innerHTML = '';
    }
  };

  // 모달 제어
  addBtn.addEventListener('click', () => {
    form.reset();
    if (!modal.open) modal.showModal();
  });

  div.querySelector('#cat-cancel').addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = div.querySelector('#cat-submit');
    btnSubmit.disabled = true;
    try {
      await api.post('/api/categories/', {
        name: div.querySelector('#cat-name').value,
        type: div.querySelector('#cat-type').value,
      });
      modal.close();
      loadCategories();
    } catch (err) {
      alert('추가 실패: ' + err.message);
    } finally {
      btnSubmit.disabled = false;
    }
  });

  loadCategories();
  bindLayoutEvents(div);

  return div;
}
