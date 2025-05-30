
import { get, post, put, del } from "./api-client"

export interface Dataset {
  id: number
  name: string
  description?: string
  source_id: number
  query_type: string
  query_definition: string
  cache_policy?: string
  last_refreshed?: string
  created_at: string
  updated_at: string
  created_by: string
  is_active: boolean
  fields?: Field[]
}

export interface Field {
  id: number
  dataset_id: number
  name: string
  display_name?: string
  field_type: string
  data_type: string
  format_pattern?: string
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface Chart {
  id: number
  name: string
  description: string
  dataset_id: number
  chart_type: string
  config: any
  dimensions?: any
  metrics?: any
  filters?: any
  created_at: string
  updated_at: string
  created_by: string
}

export interface Dashboard {
  id: number
  name: string
  description: string
  layout?: any
  global_filters?: any
  created_at: string
  updated_at: string
  created_by: string
  is_public: boolean
  status: string
  classification?: string
  owner_id?: string
  tags?: string[]
  last_viewed?: string
  access_roles?: string[]
  hasAccess?: boolean
  isFavorited?: boolean
  items?: DashboardItem[]
  has_pending_request?: boolean
}

export interface DashboardItem {
  id: number
  dashboard_id: number
  chart_id: number
  position_x: number
  position_y: number
  width: number
  height: number
  config?: any
  created_at: string
  updated_at: string
  chart?: Chart
}

export interface AccessRequest {
  id: number
  user_id: string
  dashboard_id: number
  request_date: string
  status: "pending" | "approved" | "rejected"
  response_date?: string
  response_by?: string
  reason?: string
}

export interface DatasetCreateParams {
  name: string
  description?: string
  source_id?: number
  query_type: string
  query_value: string
  schema?: object
  dimensions?: object
  metrics?: object
  filters?: object
  cache_policy?: object
}

/**
 * Get all datasets
 */
export async function getDatasets(): Promise<Dataset[]> {
  return get<Dataset[]>("/api/bi/datasets")
}

/**
 * Get a specific dataset by ID
 */
export async function getDataset(id: number): Promise<Dataset> {
  return get<Dataset>(`/api/bi/datasets/${id}`)
}

/**
 * Get data for a specific dataset
 */
export async function getDatasetData(id: number, params?: Record<string, string>): Promise<any[]> {
  const queryParams = params ? new URLSearchParams(params).toString() : ""
  const url = `/api/bi/datasets/${id}/data${queryParams ? `?${queryParams}` : ""}`
  return get<any[]>(url)
}

/**
 * Create a new dataset
 */
export async function createDataset(dataset: Omit<Dataset, "id" | "created_at" | "updated_at">): Promise<Dataset> {
  return post<Dataset>("/api/bi/datasets", dataset)
}

/**
 * Update an existing dataset
 */
export async function updateDataset(id: number, dataset: Partial<Dataset>): Promise<Dataset> {
  return put<Dataset>(`/api/bi/datasets/${id}`, dataset)
}

/**
 * Delete a dataset
 */
export async function deleteDataset(id: number): Promise<void> {
  return del<void>(`/api/bi/datasets/${id}`)
}
