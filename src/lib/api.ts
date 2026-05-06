const isLocalHost = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

const defaultApiBase = isLocalHost() ? 'http://localhost:8000' : 'https://examaid-pro.onrender.com';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBase;

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}
