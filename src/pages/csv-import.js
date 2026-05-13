import { api, BASE_URL } from '../api.js';
import { formatCurrency } from '../utils/formatters.js';
import { createPageLayout, bindLayoutEvents } from '../utils/layout.js';

export function renderCsvImport() {
  const div = document.createElement('div');
  
  const contentHtml = `
    <div class="flex-between mb-4">
      <h2 style="font-size: 1.5rem;">CSV 가져오기</h2>
    </div>
      
      <!-- 안내 카드 -->
      <div class="card mb-4">
        <div class="card-title">📋 CSV 파일 형식 안내</div>
        <div style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.8;">
          <p>아래 형식의 CSV 파일을 업로드하세요:</p>
          <code style="display: block; background: var(--color-background); padding: 0.75rem; border-radius: var(--radius-md); margin-top: 0.5rem; font-size: 0.8rem; white-space: pre; overflow-x: auto;">거래일자,유형,카테고리,금액,메모
2025-05-01,EXPENSE,식비,15000,점심
2025-05-01,INCOME,급여,3000000,5월 급여</code>
        </div>
      </div>

      <!-- 업로드 영역 -->
      <div class="card" id="upload-area" style="border: 2px dashed var(--color-border); text-align: center; padding: 3rem var(--spacing-lg); cursor: pointer; transition: all 0.2s;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📁</div>
        <div style="font-weight: 600; margin-bottom: 0.25rem;">CSV 파일을 여기에 드래그하거나 클릭하세요</div>
        <div class="text-muted" style="font-size: 0.875rem;">지원 형식: .csv (UTF-8, CP949)</div>
        <input type="file" id="csv-file-input" accept=".csv" style="display: none;" />
      </div>

      <!-- 선택된 파일 정보 -->
      <div id="file-info" class="card mt-4" style="display: none;">
        <div class="flex-between">
          <div>
            <span style="font-weight: 600;" id="file-name"></span>
            <span class="text-muted" style="font-size: 0.85rem; margin-left: 0.5rem;" id="file-size"></span>
          </div>
          <button class="text-muted" id="btn-clear-file" style="font-size: 0.85rem; text-decoration: underline;">제거</button>
        </div>
      </div>

      <!-- 업로드 버튼 -->
      <button class="btn btn-primary mt-4" id="btn-upload" style="display: none;">
        📤 업로드 및 가져오기
      </button>

      <!-- 로딩 -->
      <div id="upload-loading" class="card mt-4 text-center" style="display: none;">
        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">⏳</div>
        <div class="text-muted">CSV 파일을 처리하는 중입니다...</div>
      </div>

      <!-- 결과 영역 -->
      <div id="import-result" style="display: none;">
        <h3 class="mt-4 mb-2">가져오기 결과</h3>
        
        <div class="card" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
          <div>
            <div class="text-muted" style="font-size: 0.875rem;">전체 행</div>
            <div style="font-weight: 700; font-size: 1.25rem;" id="result-total">0</div>
          </div>
          <div style="border-left: 1px solid var(--color-border); border-right: 1px solid var(--color-border);">
            <div class="text-muted" style="font-size: 0.875rem;">성공</div>
            <div class="text-income" style="font-weight: 700; font-size: 1.25rem;" id="result-imported">0</div>
          </div>
          <div>
            <div class="text-muted" style="font-size: 0.875rem;">중복</div>
            <div class="text-expense" style="font-weight: 700; font-size: 1.25rem;" id="result-duplicate">0</div>
          </div>
        </div>

        <!-- 에러 목록 -->
        <div id="result-errors" class="card mt-2" style="display: none;">
          <div class="card-title" style="color: var(--color-expense);">⚠️ 오류 목록</div>
          <ul id="error-list" style="list-style: disc; padding-left: 1.25rem; font-size: 0.875rem; color: var(--color-text-secondary);"></ul>
        </div>

        <!-- 성공 시 이동 버튼 -->
        <a href="#/transactions" class="btn btn-outline mt-4" style="display: block; text-align: center;">
          거래 내역 확인하기 →
        </a>
      </div>
    </div>
  `;

  div.innerHTML = createPageLayout('import', contentHtml);

  const uploadArea = div.querySelector('#upload-area');
  const fileInput = div.querySelector('#csv-file-input');
  const fileInfo = div.querySelector('#file-info');
  const btnUpload = div.querySelector('#btn-upload');
  const btnClear = div.querySelector('#btn-clear-file');
  const loadingEl = div.querySelector('#upload-loading');
  const resultEl = div.querySelector('#import-result');

  let selectedFile = null;

  // 클릭으로 파일 선택
  uploadArea.addEventListener('click', () => fileInput.click());

  // 드래그 앤 드롭
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--color-primary)';
    uploadArea.style.background = 'var(--color-primary-light)';
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = 'var(--color-border)';
    uploadArea.style.background = '';
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--color-border)';
    uploadArea.style.background = '';
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileSelect(file);
    } else {
      alert('CSV 파일만 업로드 가능합니다.');
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  });

  function handleFileSelect(file) {
    selectedFile = file;
    div.querySelector('#file-name').textContent = file.name;
    div.querySelector('#file-size').textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
    fileInfo.style.display = 'block';
    btnUpload.style.display = 'block';
    resultEl.style.display = 'none';
  }

  btnClear.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    fileInfo.style.display = 'none';
    btnUpload.style.display = 'none';
  });

  // 업로드 실행
  btnUpload.addEventListener('click', async () => {
    if (!selectedFile) return;

    btnUpload.style.display = 'none';
    loadingEl.style.display = 'block';
    resultEl.style.display = 'none';

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = localStorage.getItem('access_token');
      const response = await fetch(`${BASE_URL}/api/import/csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'CSV 가져오기 실패');
      }

      const result = await response.json();

      // 결과 표시
      div.querySelector('#result-total').textContent = result.total_rows;
      div.querySelector('#result-imported').textContent = result.imported_count;
      div.querySelector('#result-duplicate').textContent = result.duplicate_count;

      // 에러 목록
      const errorsContainer = div.querySelector('#result-errors');
      const errorList = div.querySelector('#error-list');
      if (result.errors && result.errors.length > 0) {
        errorList.innerHTML = '';
        result.errors.forEach(err => {
          const li = document.createElement('li');
          li.textContent = err;
          errorList.appendChild(li);
        });
        errorsContainer.style.display = 'block';
      } else {
        errorsContainer.style.display = 'none';
      }

      resultEl.style.display = 'block';

    } catch (err) {
      alert(`가져오기 실패: ${err.message}`);
      btnUpload.style.display = 'block';
    } finally {
      loadingEl.style.display = 'none';
    }
  });

  bindLayoutEvents(div);

  return div;
}
