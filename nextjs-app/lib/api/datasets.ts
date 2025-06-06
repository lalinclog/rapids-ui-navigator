import { get, post, put, del } from "./api-client"

export interface Dataset {
  id: number
  name: string
  description?: string
  source_id: number
  source_name?: string
  source_type?: string
  query_type: "table" | "view" | "custom" | "bucket" | "iceberg_table"
  query_definition: string
  query_value?: string  // Add this for backward compatibility with DatasetForm
  cache_policy?: string | object
  last_refreshed?: string
  last_refreshed_at?: string
  created_at: string
  updated_at: string
  created_by: string
  is_active: boolean
  fields?: Field[]
  schema?: SchemaInfo
  minio_metadata?: MinIOMetadata
  cache_info?: CacheInfo
  iceberg_namespace?: string
  iceberg_table?: string
  base_path?: string
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

export interface SchemaInfo {
  columns: SchemaColumn[]
  inferred?: boolean
  last_analyzed?: string
  sample_file?: string
  table_format?: "csv" | "parquet" | "iceberg"
  total_rows?: number
}

export interface SchemaColumn {
  name: string
  type: string
  nullable: boolean
  field_id?: number
  description?: string
}

export interface MinIOMetadata {
  bucket: string
  prefix?: string
  base_path?: string
  file_type: "csv" | "parquet" | "json" | "mixed"
  file_count: number
  total_size: number
  last_modified?: string
  files: MinIOFile[]
  compression?: string
  delimiter?: string
  has_header?: boolean
}

export interface MinIOFile {
  name: string
  key: string
  size: number
  last_modified: string
  etag?: string
}

export interface CacheInfo {
  enabled: boolean
  ttl_minutes: number
  auto_refresh: boolean
  last_refreshed?: string
  next_refresh?: string
  status: "valid" | "expired" | "refreshing" | "error" | "unknown"
  cache_size?: number
  hit_count?: number
  miss_count?: number
  error_message?: string
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

export interface IcebergDataset extends Dataset {
  iceberg_namespace?: string;
  iceberg_table?: string;
  base_path?: string;
}

/**
 * Get all datasets
 */
export async function getDatasets(): Promise<Dataset[]> {
  const datasets = await get<Dataset[]>("/api/bi/datasets")
  // Map query_definition to query_value for backward compatibility with DatasetForm
  return datasets.map(dataset => ({
    ...dataset,
    query_value: dataset.query_definition
  }))
}

/**
 * Get a specific dataset by ID
 */
export async function getDataset(id: number): Promise<Dataset> {
  const dataset = await get<Dataset>(`/api/bi/datasets/${id}`)
  // Map query_definition to query_value for backward compatibility with DatasetForm
  return {
    ...dataset,
    query_value: dataset.query_definition
  }
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

/**
 * Get Iceberg namespaces
 */
export async function getIcebergNamespaces(): Promise<string[]> {
  const response = await get<{namespaces: string[]}>("/api/iceberg/namespaces")
  return response.namespaces
}

/**
 * Get Iceberg tables in a namespace
 */
export async function getIcebergTables(namespace: string): Promise<string[]> {
  const response = await get<{tables: string[]}>(`/api/iceberg/namespaces/${namespace}/tables`)
  return response.tables
}

/**
 * Create Iceberg dataset
 */
export async function createIcebergDataset(dataset: {
  name: string;
  description?: string;
  source_id: number;
  namespace: string;
  table_name: string;
  bucket: string;
  base_path?: string;
  csv_path?: string;
}): Promise<IcebergDataset> {
  return post<IcebergDataset>("/api/iceberg/datasets", dataset)
}

/**
 * Preview Iceberg table
 */
export async function previewIcebergTable(
  namespace: string, 
  table_name: string, 
  limit: number = 100
): Promise<any> {
  return post<any>("/api/iceberg/preview", {
    namespace,
    table_name,
    limit
  })
}

/**
 * Update table schema
 */
export async function updateTableSchema(
  namespace: string,
  table_name: string,
  updates: any[]
): Promise<any> {
  return put<any>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}/schema`, {
    updates
  })
}

/**
 * Get table snapshots
 */
export async function getTableSnapshots(namespace: string, table_name: string): Promise<any[]> {
  const response = await get<{snapshots: any[]}>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}/snapshots`)
  return response.snapshots
}

/**
 * Create table snapshot
 */
export async function createTableSnapshot(
  namespace: string,
  table_name: string,
  summary?: Record<string, string>
): Promise<any> {
  return post<any>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}/snapshots`, {
    summary
  })
}

/**
 * Rollback to snapshot
 */
export async function rollbackToSnapshot(
  namespace: string,
  table_name: string,
  snapshot_id: string
): Promise<any> {
  return post<any>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}/rollback`, {
    snapshot_id
  })
}
