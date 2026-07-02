const LOCAL_API_BASE_URL = 'http://localhost:8000';
const LOCAL_WS_URL = 'ws://localhost:8000/ws';

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const inferRenderBackendOrigin = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const host = window.location.host;

  if (!host.includes('onrender.com')) {
    return null;
  }

  if (host.includes('-frontend')) {
    return `https://${host.replace('-frontend', '-backend')}`;
  }

  if (host.includes('frontend')) {
    return `https://${host.replace('frontend', 'backend')}`;
  }

  return null;
};

const addProtocol = (value: string, secureProtocol: 'http:' | 'ws:') => {
  const trimmed = stripTrailingSlash(value.trim());

  if (/^https?:\/\//i.test(trimmed) || /^wss?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const protocol = import.meta.env.PROD
    ? (secureProtocol === 'ws:' ? 'wss:' : 'https:')
    : secureProtocol;

  return `${protocol}//${trimmed}`;
};

const toWebSocketOrigin = (value: string) => {
  const normalizedUrl = addProtocol(value, 'ws:').replace(/\/api$/, '');

  if (/^wss?:\/\//i.test(normalizedUrl)) {
    return normalizedUrl;
  }

  if (/^https?:\/\//i.test(normalizedUrl)) {
    return normalizedUrl.startsWith('https://')
      ? normalizedUrl.replace(/^https:\/\//i, 'wss://')
      : normalizedUrl.replace(/^http:\/\//i, 'ws://');
  }

  return normalizedUrl;
};

export const resolveApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;

  if (configuredUrl) {
    const normalizedUrl = addProtocol(configuredUrl, 'http:');
    return normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;
  }

  const inferredRenderOrigin = inferRenderBackendOrigin();
  if (inferredRenderOrigin) {
    return `${inferredRenderOrigin}/api`;
  }

  return import.meta.env.DEV ? `${LOCAL_API_BASE_URL}/api` : '/api';
};

export const resolveWebSocketUrl = () => {
  const configuredWsUrl = import.meta.env.VITE_WS_URL;
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;

  if (configuredWsUrl) {
    const normalizedUrl = addProtocol(configuredWsUrl, 'ws:');

    if (/^wss?:\/\//i.test(normalizedUrl)) {
      return normalizedUrl.endsWith('/ws') ? normalizedUrl : `${normalizedUrl}/ws`;
    }

    return `${normalizedUrl}/ws`;
  }

  if (configuredApiUrl) {
    const websocketOrigin = toWebSocketOrigin(configuredApiUrl);
    return websocketOrigin.endsWith('/ws') ? websocketOrigin : `${websocketOrigin}/ws`;
  }

  const inferredRenderOrigin = inferRenderBackendOrigin();
  if (inferredRenderOrigin) {
    return inferredRenderOrigin.replace(/^https:\/\//i, 'wss://') + '/ws';
  }

  return import.meta.env.DEV ? LOCAL_WS_URL : '/ws';
};
