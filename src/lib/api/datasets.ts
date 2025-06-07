
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
  query_value?: string
  cache_policy?: string | object
  last_refreshed?: string
  last_refreshed_at?: string
  created_at: string
  updated_at: string
  created_by: string
  is_active: boolean
  fields?: Field[]
  schema?: SchemaInfo
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

export interface IcebergDataset extends Dataset {
  iceberg_namespace?: string;
  iceberg_table?: string;
  base_path?: string;
}

export interface IcebergTable {
  name: string;
  namespace: string;
  location: string;
  schema: any;
  current_snapshot_id: string;
}

/**
 * Get Iceberg namespaces - using the backend API
 */
export async function getIcebergNamespaces(): Promise<string[]> {
  const response = await get<{namespaces: string[]}>("/api/iceberg/namespaces")
  return response.namespaces
}

/**
 * Get Iceberg tables in a namespace
 */
export async function getIcebergTables(namespace: string): Promise<IcebergTable[]> {
  const response = await get<{tables: IcebergTable[]}>(`/api/iceberg/namespaces/${namespace}/tables`)
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
