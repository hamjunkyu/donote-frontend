const routes = {};
let outlet = null;

export function initRouter(outletElement) {
  outlet = outletElement;
  window.addEventListener('hashchange', () => handleRoute(outletElement));
  window.addEventListener('load', () => handleRoute(outletElement));
}

export function registerRoute(path, componentFn) {
  routes[path] = componentFn;
}

// 현재 경로를 다시 렌더링 (월 선택 변경 등으로 페이지 데이터를 갱신할 때 사용)
export function reloadCurrentRoute() {
  if (outlet) handleRoute(outlet);
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
    outletElement.innerHTML = '';
    outletElement.appendChild(renderFn());
  } else {
    outletElement.innerHTML = '<h2>404 Not Found</h2>';
  }

  // 렌더 완료 후 알림 배지 등 후처리 트리거
  window.dispatchEvent(new CustomEvent('route:rendered'));
}
