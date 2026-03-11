const hostname = window.location.hostname;

const isLoopbackHost = hostname === 'localhost' || hostname === '127.0.0.1';
const isLanHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.endsWith('.local');
const hasEnvOverride = Boolean(process.env.REACT_APP_API_URL);
const isLocalOrLan = isLoopbackHost || isLanHost;

const directBackendBase = isLoopbackHost
  ? 'http://localhost:5000'
  : `http://${hostname}:5000`;

export const API_BASE = process.env.REACT_APP_API_URL || (
  isLocalOrLan ? '' : 'https://api.instrevi.com'
);

export const API_FALLBACK_BASE = hasEnvOverride
  ? null
  : (isLocalOrLan ? directBackendBase : null);
