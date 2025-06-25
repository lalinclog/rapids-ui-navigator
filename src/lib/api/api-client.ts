
import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"

// API client configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// HTTP method functions
export const get = async <T>(url: string, config?: any): Promise<T> => {
  const response = await apiClient.get<T>(url, config)
  return response.data
}

export const post = async <T>(url: string, data?: any, config?: any): Promise<T> => {
  const response = await apiClient.post<T>(url, data, config)
  return response.data
}

export const put = async <T>(url: string, data?: any, config?: any): Promise<T> => {
  const response = await apiClient.put<T>(url, data, config)
  return response.data
}

export const del = async <T>(url: string, config?: any): Promise<T> => {
  const response = await apiClient.delete<T>(url, config)
  return response.data
}

export interface Dashboard {
  id: string
  name: string
  description: string
  data?: any
  global_filters?: Record<string, any>
  layout?: any
}

export const getDashboardById = async (id: string): Promise<Dashboard> => {
  console.log("[API] Fetching dashboard:", id)
  
  // For development, return mock data
  return {
    id,
    name: "Sample Dashboard",
    description: "A sample dashboard for testing",
    data: {
      items: [],
      globalFilters: [],
      dimensions: { width: 1200, height: 800 }
    }
  }
}

export const updateDashboard = async (id: string, data: any): Promise<Dashboard> => {
  console.log("[API] Updating dashboard:", id, data)
  
  // For development, return mock success
  return {
    id,
    name: data.name || "Updated Dashboard",
    description: data.description || "Updated dashboard",
    data: data.data
  }
}

export const deleteDashboard = async (id: string): Promise<void> => {
  console.log("[API] Deleting dashboard:", id)
  // For development, just log
}

export default apiClient
