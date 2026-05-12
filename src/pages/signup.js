import { api } from '../api.js';

export function renderSignup() {
  const div = document.createElement('div');
  div.className = 'container';
  div.innerHTML = `
    <div class="card text-center" style="max-width: 400px; margin: 100px auto;">
      <h1 class="logo mb-4">Donote</h1>
      <h2 class="card-title">회원가입</h2>
      <p class="text-muted mb-4">간단한 가입 후 바로 이용해보세요!</p>
      
      <form id="signup-form">
        <div class="form-group text-left">
          <label class="form-label" for="signup-name">이름</label>
          <input type="text" id="signup-name" class="form-control" placeholder="2~20자 입력" required minlength="2" maxlength="20">
        </div>
        <div class="form-group text-left">
          <label class="form-label" for="signup-email">이메일</label>
          <input type="email" id="signup-email" class="form-control" placeholder="이메일을 입력하세요" required>
        </div>
        <div class="form-group text-left">
          <label class="form-label" for="signup-password">비밀번호</label>
          <input type="password" id="signup-password" class="form-control" placeholder="영문, 숫자 포함 8자 이상" required minlength="8">
        </div>
        <div class="form-group text-left mb-4">
          <label class="form-label" for="signup-password-confirm">비밀번호 확인</label>
          <input type="password" id="signup-password-confirm" class="form-control" placeholder="비밀번호 재입력" required>
        </div>
        <button type="submit" class="btn btn-primary mb-4" id="signup-btn">회원가입</button>
      </form>
      
      <a href="#/login" class="text-muted" style="font-size: 0.875rem;">이미 계정이 있으신가요? 로그인</a>
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
