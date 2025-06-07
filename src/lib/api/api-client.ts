
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api"

// API client implementation
class ApiClient {
  private axiosInstance: AxiosInstance;
  
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
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

// Export HTTP methods
export const get = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeRequest']<T>('get', url, undefined, config);

export const post = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeRequest']<T>('post', url, data, config);

export const put = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeRequest']<T>('put', url, data, config);

export const del = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeRequest']<T>('delete', url, undefined, config);

export default apiClient;
