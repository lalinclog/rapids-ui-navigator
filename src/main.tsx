
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import axios from 'axios';
import AuthService from './services/AuthService.ts';

// Set up axios interceptors for authentication
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Also check for API keys in localStorage for API key authentication
    const apiKey = localStorage.getItem('currentApiKey');
    if (apiKey && !token) {  // Only use API key if JWT token is not available
      config.headers['X-API-Key'] = apiKey;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        // Call refresh token endpoint using our service
        const response = await AuthService.refreshToken(refreshToken);
        
        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${response.access_token}`;
        return axios(originalRequest);
      } catch (err) {
        // If refresh fails, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    
    return Promise.reject(error);
  }
);

createRoot(document.getElementById("root")!).render(<App />);