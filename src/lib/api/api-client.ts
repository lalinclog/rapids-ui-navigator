
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API base URL from environment variable, defaulting to the backend API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"

// API client implementation
class ApiClient {
  private axiosInstance: AxiosInstance;
  
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptors for debugging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`Making API request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
      },
      (error) => {
        console.error('API request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`API response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API response error:', error.response?.status, error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }
  
  private async executeRequest<T>(
    method: string, 
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      let response: AxiosResponse<T>;
      
      switch (method) {
        case 'get':
          response = await this.axiosInstance.get<T>(url, config);
          break;
        case 'post':
          response = await this.axiosInstance.post<T>(url, data, config);
          break;
        case 'put':
          response = await this.axiosInstance.put<T>(url, data, config);
          break;
        case 'delete':
          response = await this.axiosInstance.delete<T>(url, config);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      
      return response.data;
    } catch (error: any) {
      console.error(`API ${method} request failed:`, error);
      throw error;
    }
  }
}

// Create and export singleton instance
const apiClient = new ApiClient();

// Export HTTP methods for backend API (including proxied Iceberg requests)
export const get = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeRequest']<T>('get', url, undefined, config);

export const post = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeRequest']<T>('post', url, data, config);

export const put = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeRequest']<T>('put', url, data, config);

export const del = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeRequest']<T>('delete', url, undefined, config);

export default apiClient;
