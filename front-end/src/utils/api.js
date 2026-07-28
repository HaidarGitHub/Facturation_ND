import axios from 'axios';
import { getToken, clearAuth } from './auth';

const api = axios.create();

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      // We had a token and the server still rejected it — the session
      // expired or was revoked. Clear it and send the user back to Login.
      clearAuth();
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
