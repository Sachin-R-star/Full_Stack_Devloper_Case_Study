import axios from 'axios';

const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

const defaultBaseUrl = import.meta.env.PROD
  ? 'https://mini-erp-crm-backend-86nh.onrender.com'
  : 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: envApiUrl || defaultBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('erp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
    }
    return Promise.reject(error);
  }
);
