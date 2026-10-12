export const apiConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT ?? 30000),
};
