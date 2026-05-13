import { api } from '../api.js';

export function renderSignup() {
  const div = document.createElement('div');
  div.className = 'container';
  div.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-background) 100%); padding: var(--spacing-md);">
      <div class="card text-center" style="width: 100%; max-width: 400px; padding: 2.5rem 2rem; box-shadow: var(--shadow-lg); border: none;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">💰</div>
        <h1 class="logo mb-2" style="font-size: 1.75rem;">Donote</h1>
        <p class="text-muted mb-4" style="font-size: 0.9rem; font-weight: 500;">간단한 가입 후 바로 시작하세요!</p>
        
        <form id="signup-form">
          <div class="form-group text-left">
            <label class="form-label" for="signup-name">이름</label>
            <div style="position: relative;">
              <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 1.1rem; color: var(--color-text-secondary);">👤</span>
              <input type="text" id="signup-name" class="form-control" placeholder="2~20자 입력" required minlength="2" maxlength="20" style="padding-left: 2.5rem;">
            </div>
          </div>
          <div class="form-group text-left">
            <label class="form-label" for="signup-email">이메일</label>
            <div style="position: relative;">
              <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 1.1rem; color: var(--color-text-secondary);">📧</span>
              <input type="email" id="signup-email" class="form-control" placeholder="이메일을 입력하세요" required style="padding-left: 2.5rem;">
            </div>
          </div>
          <div class="form-group text-left">
            <label class="form-label" for="signup-password">비밀번호</label>
            <div style="position: relative;">
              <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 1.1rem; color: var(--color-text-secondary);">🔒</span>
              <input type="password" id="signup-password" class="form-control" placeholder="영문, 숫자 포함 8자 이상" required minlength="8" style="padding-left: 2.5rem;">
            </div>
          </div>
          <div class="form-group text-left mb-4">
            <label class="form-label" for="signup-password-confirm">비밀번호 확인</label>
            <div style="position: relative;">
              <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 1.1rem; color: var(--color-text-secondary);">✓</span>
              <input type="password" id="signup-password-confirm" class="form-control" placeholder="비밀번호 재입력" required style="padding-left: 2.5rem;">
            </div>
          </div>
          <button type="submit" class="btn btn-primary mb-4" id="signup-btn" style="font-size: 1.1rem; padding: 1rem;">회원가입</button>
        </form>
        
        <div style="padding-top: 1rem; border-top: 1px solid var(--color-border);">
          <span class="text-muted" style="font-size: 0.875rem;">이미 계정이 있으신가요? </span>
          <a href="#/login" style="font-size: 0.875rem; color: var(--color-primary); font-weight: 600;">로그인</a>
        </div>
      </div>
    </div>
  `;

  const form = div.querySelector('#signup-form');
  const btn = div.querySelector('#signup-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;

    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      btn.textContent = '가입 중...';
      btn.disabled = true;

      await api.post('/auth/signup', { 
        name, 
        email, 
        password, 
        password_confirm: passwordConfirm 
      });
      
      alert('회원가입이 완료되었습니다. 로그인해주세요!');
      window.location.hash = '#/login';
      
    } catch (err) {
      alert(`회원가입 실패: ${err.message}`);
    } finally {
      btn.textContent = '회원가입';
      btn.disabled = false;
    }
  });

  return div;
}
