import { api } from '../api.js';

export function renderLogin() {
  const div = document.createElement('div');
  div.className = 'container';
  div.innerHTML = `
    <div class="card text-center" style="max-width: 400px; margin: 100px auto;">
      <h1 class="logo mb-4">Donote</h1>
      <h2 class="card-title">로그인</h2>
      <form id="login-form">
        <div class="form-group text-left">
          <label class="form-label" for="login-email">이메일</label>
          <input type="email" id="login-email" class="form-control" placeholder="이메일을 입력하세요" required>
        </div>
        <div class="form-group text-left mb-4">
          <label class="form-label" for="login-password">비밀번호</label>
          <input type="password" id="login-password" class="form-control" placeholder="비밀번호를 입력하세요" required>
        </div>
        <button type="submit" class="btn btn-primary mb-4" id="login-btn">로그인</button>
      </form>
      <a href="#/signup" class="text-muted" style="font-size: 0.875rem;">계정이 없으신가요? 회원가입</a>
    </div>
  `;

  const form = div.querySelector('#login-form');
  const btn = div.querySelector('#login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      btn.textContent = '로그인 중...';
      btn.disabled = true;

      const res = await api.post('/auth/login', { email, password });
      
      // 토큰 저장
      if (res.access_token) {
        localStorage.setItem('access_token', res.access_token);
        if (res.refresh_token) {
          localStorage.setItem('refresh_token', res.refresh_token);
        }
        
        // 메인 대시보드로 이동
        window.location.hash = '#/';
      }
    } catch (err) {
      alert(`로그인 실패: ${err.message}`);
    } finally {
      btn.textContent = '로그인';
      btn.disabled = false;
    }
  });

  return div;
}
