
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { KeycloakUserInfo } from '@/lib/auth/keycloak';
//import type { Dataset, Dashboard, AccessRequest } from "./datasets"
import type { Dashboard, DashboardsResponse, AccessRequest, AccessRequestsResponse, DashboardStatus, DashboardClassification} from "@/lib/types"


// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api"

// Check if we're in dev mode
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true"


// Dashboard API calls
export const getDashboards = async (
  page = 1,
  pageSize = 10,
  filters?: {
    status?: string
    classification?: string
    search?: string
    tags?: string[]
    favorite?: boolean
    myDashboards?: boolean
    accessible?: boolean
  },
): Promise<DashboardsResponse> => {
  if (DEV_MODE) {
    // Use mock data in dev mode
    console.log("Using mock data for getDashboards")
    return getMockDashboards(page, pageSize, filters)
  }

  try {
    // Build query parameters
    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    })

    if (filters) {
      if (filters.status && filters.status !== "all") {
        queryParams.append("status", filters.status)
      }

      if (filters.classification && filters.classification !== "all") {
        queryParams.append("classification", filters.classification)
      }

      if (filters.search) {
        queryParams.append("search", filters.search)
      }

      if (filters.tags && filters.tags.length > 0) {
        filters.tags.forEach((tag) => queryParams.append("tags", tag))
      }

      if (filters.favorite) {
        queryParams.append("favorite", "true")
      }

      if (filters.myDashboards) {
        queryParams.append("created_by_me", "true")
      }

      if (filters.accessible) {
        queryParams.append("accessible", "true")
      }
    }

    // 1) Grab your stored token ()
    const token = localStorage.getItem("token") || ""

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/api/bi/dashboards?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // If you use Bearer tokens:
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching dashboards:", error)
    throw error
  }
}

export const getDashboardById = async (id: string): Promise<Dashboard> => {
  if (DEV_MODE) {
    // Use mock data in dev mode
    console.log("Using mock data for getDashboardById")
    return getMockDashboardById(id)
  }

  // 1) Grab your stored token ()
  const token = localStorage.getItem("token") || ""

  try {
    const response = await fetch(`${API_BASE_URL}/api/bi/dashboards/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // If you use Bearer tokens:
          Authorization: `Bearer ${token}`,
        },
      })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const raw = await response.json()

    // Normalize dashboard items
    raw.data.items = raw.data.items.map((item: any) => ({
      ...item,
      content: item.content ?? [],
      config: item.config ?? {},
      pageId: item.pageId ?? "main",
      zIndex: item.zIndex ?? 0,
    }))

    return raw

  } catch (error) {
    console.error(`Error fetching dashboard with ID ${id}:`, error)
    throw error
  }
}

export const createDashboard = async (dashboard: {
    name: string
    description: string
    status: DashboardStatus
    classification: DashboardClassification
    is_public: boolean
    tags: string[]
    created_by: string
    updated_by: string
    layout: any
    global_filters: any
    owner_id: string | null
    access_roles: any[]
  }): Promise<Dashboard> => {
  try {
    console.log("Creating dashboard with data:", dashboard)

    const response = await fetch(`${API_BASE_URL}/api/bi/dashboards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dashboard),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Error response:", errorData)
      throw new Error(`API error: ${response.status} ${response.statusText}. ${errorData}`)
    }

    const data = await response.json()
    console.log("Dashboard created successfully:", data)

    // If the API returns just the ID and success status, construct a dashboard object
    if (data.id && !data.name) {
      return {
        id: data.id,
        name: dashboard.name || "",
        description: dashboard.description || "",
        status: dashboard.status || "draft",
        classification: dashboard.classification || "internal",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: dashboard.created_by || "current-user",
        updated_by: dashboard.updated_by || "current-user",
        tags: dashboard.tags || [],
        is_public: dashboard.is_public || false,
        is_favorited_by: false,
        hasAccess: true,
      }
    }

    return data
  } catch (error) {
    console.error("Error creating dashboard:", error)
    throw error
  }
}

// Access Request API calls
export const getAccessRequests = async (
  page = 1,
  pageSize = 10,
  filters?: {
    status?: string
    dashboardId?: string
    myRequests?: boolean
  },
): Promise<{ requests: AccessRequestsResponse}> => {
  if (DEV_MODE) {
    // Use mock data in dev mode
    console.log("Using mock data for getAccessRequests")
    return { requests: getMockAccessRequests(page, pageSize, filters)}
  }

  try {
    // Build query parameters
    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    })

    if (filters) {
      if (filters.status && filters.status !== "all") {
        queryParams.append("status", filters.status)
      }

      if (filters.dashboardId) {
        queryParams.append("dashboard_id", filters.dashboardId)
      }
    }

    // 1) Grab your stored token ()
    const token = localStorage.getItem("token") || ""

    // Make API request
    const response = await fetch(`${API_BASE_URL}/api/access-requests?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // If you use Bearer tokens:
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    // Ensure we always return an object with requests array
    return { requests: data.requests || [] }
  } catch (error) {
    console.error("Error fetching access requests:", error)
    throw error
  }
}

export async function cancelAccessRequest(dashboardId: string) {
  if (DEV_MODE) {
    // Use mock data in dev mode
    console.log("Using mock data for cancelAccessRequest")
   // return cancelMockAccessRequest(request)
  }

  // 1) Grab your stored token ()
  const token = localStorage.getItem("token") || ""

  try {
    return fetch(`/api/access-requests/${dashboardId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error("Failed to cancel request")
      return res.json()
    })
  } catch (error) {
    console.error("Error creating access request:", error)
    throw error
  }
}


export const createAccessRequest = async (request: Partial<AccessRequest>): Promise<AccessRequest> => {
  if (DEV_MODE) {
    // Use mock data in dev mode
    console.log("Using mock data for createAccessRequest")
    return createMockAccessRequest(request)
  }

  // 1) Grab your stored token ()
  const token = localStorage.getItem("token") || ""

  try {
    const response = await fetch(`${API_BASE_URL}/api/access-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  } catch (error) {
    console.error("Error creating access request:", error)
    throw error
  }
}

export const updateAccessRequest = async (id: string, request: Partial<AccessRequest>): Promise<AccessRequest> => {
  if (DEV_MODE) {
    // Use mock data in dev mode
    console.log("Using mock data for updateAccessRequest")
    return updateMockAccessRequest(id, request)
  }

  // 1) Grab your stored token ()
  const token = localStorage.getItem("token") || ""

  try {
    const response = await fetch(`${API_BASE_URL}/api/access-requests/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  } catch (error) {
    console.error(`Error updating access request with ID ${id}:`, error)
    throw error
  }
}

export const updateDashboard = async (id: string, dashboard: Partial<Dashboard>): Promise<Dashboard> => {
  if (DEV_MODE) {
    // Use mock data in dev mode
    console.log("Using mock data for updateDashboard")
    return updateMockDashboard(id, dashboard)
  }

  // 1) Grab your stored token ()
  const token = localStorage.getItem("token") || ""

  try {
    const response = await fetch(`${API_BASE_URL}/api/bi/dashboards/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dashboard),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error updating dashboard with ID ${id}:`, error)
    throw error
  }
}

export const deleteDashboard = async (id: string): Promise<void> => {
  if (DEV_MODE) {
    // Use mock data in dev mode
    console.log("Using mock data for deleteDashboard")
    return deleteMockDashboard(id)
  }

  // 1) Grab your stored token ()
  const token = localStorage.getItem("token") || ""

  try {
    const response = await fetch(`${API_BASE_URL}/api/bi/dashboards/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error(`Error deleting dashboard with ID ${id}:`, error)
    throw error
  }
}

export const toggleFavorite = async (id: string, is_favorited_by: boolean): Promise<void> => {
  if (DEV_MODE) {
    // Use mock data in dev mode
    console.log("Using mock data for toggleFavorite")
    return toggleMockFavorite(id, is_favorited_by)
  }

  // 1) Grab your stored token ()
  const token = localStorage.getItem("token") || ""

  try {
    const response = await fetch(`${API_BASE_URL}/api/bi/dashboards/${id}/favorite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_favorited_by }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error(`Error toggling favorite for dashboard with ID ${id}:`, error)
    throw error
  }
}



import {
  mockDashboards,
  getMockDashboardById,
  updateMockDashboard,
  deleteMockDashboard,
  toggleMockFavorite,
  getMockAccessRequests,
  createMockAccessRequest,
  updateMockAccessRequest,
} from "@/lib/mock/mock-data"

// Mock function for getDashboards
const getMockDashboards = (
  page: number,
  pageSize: number,
  filters?: {
    status?: string
    classification?: string
    search?: string
    tags?: string[]
    favorite?: boolean
    myDashboards?: boolean
    accessible?: boolean
  },
): DashboardsResponse => {
  let filteredDashboards = [...mockDashboards]

  if (filters) {
    if (filters.status && filters.status !== "all") {
      filteredDashboards = filteredDashboards.filter((d) => d.status === filters.status)
    }

    if (filters.classification && filters.classification !== "all") {
      filteredDashboards = filteredDashboards.filter((d) => d.classification === filters.classification)
    }

    if (filters.search) {
      const search = filters.search.toLowerCase()
      filteredDashboards = filteredDashboards.filter(
        (d) =>
          d.name.toLowerCase().includes(search) ||
          d.description.toLowerCase().includes(search) ||
          d.tags.some((tag) => tag.toLowerCase().includes(search)),
      )
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredDashboards = filteredDashboards.filter((d) => filters.tags!.some((tag) => d.tags.includes(tag)))
    }

    if (filters.favorite) {
      filteredDashboards = filteredDashboards.filter((d) => d.is_favorited_by)
    }

    if (filters.myDashboards) {
      // In mock mode, assume current user is the admin
      filteredDashboards = filteredDashboards.filter((d) => d.created_by === "2af311d8-df7a-4881-ac38-4232d4f5959b")
    }

    if (filters.accessible) {
      filteredDashboards = filteredDashboards.filter((d) => d.hasAccess)
    }
  }

  const total = filteredDashboards.length
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedDashboards = filteredDashboards.slice(startIndex, endIndex)

  return {
    dashboards: paginatedDashboards,
    total,
    page,
    pageSize,
  }
}

// Define common response types
export interface DashboardStats {
  total_jobs: number;
  successful_jobs: number;
  job_trend: {
    value: number;
    positive: boolean;
  };
  avg_speedup: number;
  cost_savings: number;
}

export interface JobStatusType {
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface BaseJob {
  id: number;
  name: string;
  type: 'qualification' | 'profiling';
  status: JobStatusType;
  progress?: number;
  user_id?: string;
  user?: string;
  event_log_path?: string;
  eventLogPath?: string;
  application_name?: string;
  output_format?: string;
  additional_options?: string;
  start_time?: string;
  end_time?: string;
  results?: any;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// API client implementation with rate limiting and connection pooling
class ApiClient {
  private axiosInstance: AxiosInstance;
  private rateLimitQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private requestsPerSecond = 10;
  private requestCount = 0;
  private lastResetTime = Date.now();
  
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: '/api',
      timeout: 10000, // 10 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Initialize request tracking
    setInterval(() => {
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }, 1000); // Reset counter every second
  }
  
  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    
    while (this.rateLimitQueue.length > 0) {
      // Check rate limit
      if (this.requestCount >= this.requestsPerSecond) {
        const now = Date.now();
        const timeToWait = 1000 - (now - this.lastResetTime);
        if (timeToWait > 0) {
          await new Promise(resolve => setTimeout(resolve, timeToWait));
        }
        this.requestCount = 0;
        this.lastResetTime = Date.now();
      }
      
      // Process next request in queue
      const nextRequest = this.rateLimitQueue.shift();
      if (nextRequest) {
        await nextRequest();
        this.requestCount++;
      }
    }
    
    this.isProcessingQueue = false;
  }
  
  private async executeRequest<T>(
    method: string, 
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return new Promise<ApiResponse<T>>((resolve) => {
      const executeAxiosRequest = async () => {
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
          
          resolve({ data: response.data });
        } catch (error: any) {
          console.error(`API ${method} request failed:`, error);
          resolve({
            error: error.response?.data?.error || error.message || 'Unknown error'
          });
        }
      };
      
      // Add request to rate limit queue
      this.rateLimitQueue.push(executeAxiosRequest);
      this.processQueue();
    });
  }


  
  
  // Dashboard stats
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.executeRequest<DashboardStats>('get', '/dashboard/stats');
  }
  
  // Jobs API
  async getJobs(): Promise<ApiResponse<BaseJob[]>> {
    return this.executeRequest<BaseJob[]>('get', '/jobs');
  }
  
  async getJob(jobId: number): Promise<ApiResponse<BaseJob>> {
    return this.executeRequest<BaseJob>('get', `/jobs/${jobId}`);
  }
  
  async runQualification(params: {
    eventLogPath: string;
    outputFormat: string;
    applicationName?: string;
    additionalOptions?: string;
  }): Promise<ApiResponse<{ jobId: number }>> {
    return this.executeRequest<{ jobId: number }>('post', '/jobs/qualification', params);
  }
  
  async runProfiling(params: {
    eventLogPath: string;
    outputFormat: string;
    applicationName?: string;
    generateTimeline?: boolean;
    additionalOptions?: string;
  }): Promise<ApiResponse<{ jobId: number }>> {
    return this.executeRequest<{ jobId: number }>('post', '/jobs/profiling', params);
  }
  
  // File upload with progress tracking
  async uploadFile(
    file: File, 
    onProgress?: (percentage: number) => void
  ): Promise<ApiResponse<{ url: string; fileName: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    };
    
    return this.executeRequest<{ url: string; fileName: string }>(
      'post',
      '/files/upload',
      formData,
      config
    );
  }
  
  // Access management
  async requestAccess(requestData: {
    dashboardId: number;
    reason: string;
  }): Promise<ApiResponse<{ success: boolean }>> {
    return this.executeRequest<{ success: boolean }>(
      'post', 
      '/access-requests', 
      requestData
    );
  }
  

  
  // API keys management
  async getApiKeys(): Promise<ApiResponse<any[]>> {
    return this.executeRequest<any[]>('get', '/api-keys');
  }
  
  async createApiKey(keyData: {
    name: string;
    expiration_days: number;
    description?: string;
  }): Promise<ApiResponse<any>> {
    return this.executeRequest<any>('post', '/api-keys', keyData);
  }
  
  async deleteApiKey(keyId: string): Promise<ApiResponse<void>> {
    return this.executeRequest<void>('delete', `/api-keys/${keyId}`);
  }

  // Get user information
  async getUserInfo(): Promise<ApiResponse<KeycloakUserInfo>> {
    return this.executeRequest<KeycloakUserInfo>('get', '/auth/user');
  }

  // Check health status
  async checkHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.executeRequest<{ status: string; timestamp: string }>('get', '/health');
  }
}


// Create and export singleton instance
const apiClient = new ApiClient();
export default apiClient;
