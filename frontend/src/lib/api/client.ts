import axios from 'axios';
import toast from 'react-hot-toast';
import { apiConfig } from '../../config/api.config';

export const apiClient = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  config.headers.set('X-Request-ID', crypto.randomUUID());
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        toast.error('Network error. Check your connection.');
      } else {
        const message = (error.response.data as { message?: string } | undefined)?.message;
        toast.error(message ?? 'The request could not be completed.');
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
