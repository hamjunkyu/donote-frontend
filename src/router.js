const routes = {};

export function initRouter(outletElement) {
  window.addEventListener('hashchange', () => handleRoute(outletElement));
  window.addEventListener('load', () => handleRoute(outletElement));
}

export function registerRoute(path, componentFn) {
  routes[path] = componentFn;
}

function handleRoute(outletElement) {
  let path = window.location.hash.slice(1) || '/';
  
  // 인증 체크
  const token = localStorage.getItem('access_token');
  if (!token && path !== '/login' && path !== '/signup') {
    window.location.hash = '#/login';
    return;
  }

  // 로그인 상태인데 로그인 페이지 접근 시 홈으로 이동
  if (token && (path === '/login' || path === '/signup')) {
    window.location.hash = '#/';
    return;
  }

  const renderFn = routes[path];
  
  if (renderFn) {
    // 이전 내용 지우기
    outletElement.innerHTML = '';
    // 새 화면 렌더링
    outletElement.appendChild(renderFn());
  } else {
    outletElement.innerHTML = '<h2>404 Not Found</h2>';
  }
}
