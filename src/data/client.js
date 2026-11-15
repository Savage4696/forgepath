// Connect directly to the API backend in both dev and preview environments
export const API_BASE = (typeof window !== 'undefined' && (window.location.port === '4173' || import.meta.env.DEV))
  ? 'http://127.0.0.1:8787'
  : '';
