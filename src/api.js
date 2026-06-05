export const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://donote-api-production.up.railway.app' : 'http://127.0.0.1:8000');

// 인증 엔드포인트는 401이 정상 응답(로그인 실패 등)이므로 토큰 갱신/로그아웃 흐름을 타지 않는다.
function isAuthEndpoint(endpoint) {
  return endpoint.includes('/auth/login')
    || endpoint.includes('/auth/signup')
    || endpoint.includes('/auth/refresh');
}

// FastAPI 에러 detail은 문자열 또는 422 검증 에러 배열로 올 수 있다.
function parseErrorDetail(data) {
  const detail = data && data.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(d => d.msg || JSON.stringify(d)).join(', ');
  }
  return 'API 요청에 실패했습니다.';
}

function clearSessionAndRedirect() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  if (!window.location.hash.startsWith('#/login')) {
    window.location.hash = '#/login';
  }
}

// 동시에 여러 요청이 401을 받아도 refresh는 한 번만 수행되도록 single-flight 처리.
let refreshPromise = null;

function tryRefresh() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function doRefresh() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    if (!data.access_token) return false;

    localStorage.setItem('access_token', data.access_token);
    // 백엔드는 토큰 로테이션을 수행하므로 새 refresh_token도 저장해야 한다.
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return true;
  } catch (e) {
    return false;
  }
}

export const api = {
  async request(endpoint, options = {}, retried = false) {
    const token = localStorage.getItem('access_token');

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

    let response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (error) {
      console.error('[API Network Error]', error);
      throw error;
    }

    // access token 만료 → refresh로 갱신 후 1회 재시도. 인증 엔드포인트는 제외.
    if (response.status === 401 && !isAuthEndpoint(endpoint)) {
      if (!retried) {
        const refreshed = await tryRefresh();
        if (refreshed) {
          return this.request(endpoint, options, true);
        }
      }
      clearSessionAndRedirect();
      throw new Error('Unauthorized');
    }

    if (response.status === 204) return null;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(parseErrorDetail(errorData));
    }

    return await response.json();
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// 목록 응답을 배열로 정규화한다.
// 백엔드가 페이지네이션 응답({items,total,limit,offset})을 주거나 raw 배열을 줄 수 있어 둘 다 대응.
export function unwrapList(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
}
