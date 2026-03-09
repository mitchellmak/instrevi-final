import { API_BASE, API_FALLBACK_BASE } from './apiBase';

const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

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
      const contentType = response.headers.get('content-type') || '';
      const isUnexpectedHtml = response.ok && normalizedPath.startsWith('/api/') && contentType.includes('text/html');

      if (isUnexpectedHtml) {
        lastError = new Error(`Unexpected HTML response from ${url}`);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
};
