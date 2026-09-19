const hostname = window.location.hostname;
const isNativeApp = typeof navigator !== 'undefined' && navigator.userAgent.includes('Android');

const isLoopbackHost = hostname === 'localhost' || hostname === '127.0.0.1';
const isLanHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.endsWith('.local');
const hasEnvOverride = Boolean(process.env.REACT_APP_API_URL);
const isLocalOrLan = isLoopbackHost || isLanHost;

const directBackendBase = (() => {
  if (isNativeApp && isLoopbackHost) {
    return 'http://10.0.2.2:5000';
  }

  return isLoopbackHost
    ? 'http://localhost:5000'
    : `http://${hostname}:5000`;
})();

export const API_BASE = process.env.REACT_APP_API_URL || 'https://api.instrevi.com';

export const API_FALLBACK_BASE = hasEnvOverride || !isLocalOrLan
  ? null
  : directBackendBase;
