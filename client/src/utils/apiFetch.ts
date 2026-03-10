import { API_BASE, API_FALLBACK_BASE } from './apiBase';

export const AUTH_EXPIRED_EVENT = 'instrevi:auth-expired';

const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const shouldSkipAuthRedirect = (path: string) => (
  path.startsWith('/api/auth/login') ||
  path.startsWith('/api/auth/register') ||
  path.startsWith('/api/auth/forgot-password') ||
  path.startsWith('/api/auth/reset-password') ||
  path.startsWith('/api/auth/verify-email')
);

const handleUnauthorizedResponse = (normalizedPath: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!normalizedPath.startsWith('/api/') || shouldSkipAuthRedirect(normalizedPath)) {
    return;
  }

  const hasStoredToken = Boolean(window.localStorage.getItem('token'));
  if (!hasStoredToken) {
    return;
  }

  window.localStorage.removeItem('token');
  window.localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));

  const isLoginRoute = window.location.pathname === '/login';
  if (!isLoginRoute && process.env.NODE_ENV !== 'test') {
    window.location.assign('/login');
  }
};

const buildBaseCandidates = () => {
  const candidates = [API_BASE, API_FALLBACK_BASE].filter((base): base is string => base !== null);
  return [...new Set(candidates)];
};

export const apiFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  const normalizedPath = normalizePath(path);
  const bases = buildBaseCandidates();

  let lastError: unknown;

  for (const base of bases) {
    const url = `${base}${normalizedPath}`;

    try {
      const response = await fetch(url, init);
      const contentType = response.headers?.get?.('content-type') || '';
      const isUnexpectedHtml = response.ok && normalizedPath.startsWith('/api/') && contentType.includes('text/html');

      if (isUnexpectedHtml) {
        lastError = new Error(`Unexpected HTML response from ${url}`);
        continue;
      }

      if (response.status === 401) {
        handleUnauthorizedResponse(normalizedPath);
      }

      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
};
