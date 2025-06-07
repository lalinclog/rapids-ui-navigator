
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API base URL from environment variable, defaulting to the backend API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"

// Iceberg REST catalog URL - direct connection
const ICEBERG_REST_URL = import.meta.env.VITE_ICEBERG_REST_URL || "http://localhost:8181/v1"

// API client implementation
class ApiClient {
  private axiosInstance: AxiosInstance;
  private icebergInstance: AxiosInstance;
  
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Separate instance for direct Iceberg REST catalog communication
    this.icebergInstance = axios.create({
      baseURL: ICEBERG_REST_URL,
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

  private async executeIcebergRequest<T>(
    method: string, 
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      let response: AxiosResponse<T>;
      
      switch (method) {
        case 'get':
          response = await this.icebergInstance.get<T>(url, config);
          break;
        case 'post':
          response = await this.icebergInstance.post<T>(url, data, config);
          break;
        case 'put':
          response = await this.icebergInstance.put<T>(url, data, config);
          break;
        case 'delete':
          response = await this.icebergInstance.delete<T>(url, config);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      
      return response.data;
    } catch (error: any) {
      console.error(`Iceberg ${method} request failed:`, error);
      throw error;
    }
  }
}

// Create and export singleton instance
const apiClient = new ApiClient();

// Export HTTP methods for backend API
export const get = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeRequest']<T>('get', url, undefined, config);

export const post = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeRequest']<T>('post', url, data, config);

export const put = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeRequest']<T>('put', url, data, config);

export const del = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeRequest']<T>('delete', url, undefined, config);

// Export HTTP methods for direct Iceberg REST catalog communication
export const icebergGet = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeIcebergRequest']<T>('get', url, undefined, config);

export const icebergPost = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeIcebergRequest']<T>('post', url, data, config);

export const icebergPut = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeIcebergRequest']<T>('put', url, data, config);

export const icebergDel = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
  apiClient['executeIcebergRequest']<T>('delete', url, undefined, config);

export default apiClient;
