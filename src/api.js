import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:5000/api' : '/api',
  withCredentials: true
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url;
    const isCredentialSubmission = requestUrl === '/auth/login' || requestUrl === '/auth/register';
    if (error.response?.status === 401 && !isCredentialSubmission && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sokobora:session-expired'));
    }
    return Promise.reject(error);
  }
);

export default api;