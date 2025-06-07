
import { get, post, put, del } from "./api-client"

export interface IcebergNamespace {
  name: string;
  properties: Record<string, string>;
}

export interface IcebergTable {
  name: string;
  namespace: string;
  location: string;
  schema: SchemaInfo;
  snapshots?: Snapshot[];
  current_snapshot_id?: string;
}

export interface Snapshot {
  snapshot_id: string;
  timestamp_ms: number;
  summary: Record<string, any>;
  manifest_list?: string;
}

export interface SchemaInfo {
  columns: SchemaColumn[];
  schema_id?: number;
  identifier_field_ids?: number[];
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  field_id?: number;
  description?: string;
}

export interface SchemaUpdateRequest {
  namespace: string;
  table_name: string;
  updates: SchemaUpdate[];
}

export interface SchemaUpdate {
  action: "add-column" | "drop-column" | "rename-column" | "update-column";
  column?: {
    name: string;
    type: string;
    nullable?: boolean;
    description?: string;
  };
  old_name?: string;
  new_name?: string;
}

/**
 * Get detailed namespace information - using backend API
 */
export async function getNamespaceDetails(namespace: string): Promise<IcebergNamespace> {
  return get<IcebergNamespace>(`/api/iceberg/namespaces/${namespace}`)
}

/**
 * Update namespace properties - using backend API
 */
export async function updateNamespaceProperties(
  namespace: string, 
  properties: Record<string, string>
): Promise<IcebergNamespace> {
  return put<IcebergNamespace>(`/api/iceberg/namespaces/${namespace}`, { properties })
}

/**
 * Get detailed table information including snapshots - using backend API
 */
export async function getTableDetails(namespace: string, table_name: string): Promise<IcebergTable> {
  return get<IcebergTable>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}`)
}

/**
 * Get table statistics and metadata - using backend API
 */
export async function getTableStatistics(namespace: string, table_name: string): Promise<any> {
  return get<any>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}/statistics`)
}

/**
 * Update table schema - using backend API
 */
export async function updateTableSchema(schemaUpdate: SchemaUpdateRequest): Promise<IcebergTable> {
  return put<IcebergTable>(
    `/api/iceberg/namespaces/${schemaUpdate.namespace}/tables/${schemaUpdate.table_name}/schema`,
    { updates: schemaUpdate.updates }
  )
}

/**
 * Get table snapshots - using backend API
 */
export async function getTableSnapshots(namespace: string, table_name: string): Promise<Snapshot[]> {
  const response = await get<{snapshots: Snapshot[]}>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}/snapshots`)
  return response.snapshots
}

/**
 * Rollback table to a specific snapshot - using backend API
 */
export async function rollbackToSnapshot(
  namespace: string, 
  table_name: string, 
  snapshot_id: string
): Promise<IcebergTable> {
  return post<IcebergTable>(
    `/api/iceberg/namespaces/${namespace}/tables/${table_name}/rollback`,
    { snapshot_id }
  )
}

/**
 * Create table snapshot - using backend API
 */
export async function createTableSnapshot(
  namespace: string, 
  table_name: string, 
  summary?: Record<string, string>
): Promise<Snapshot> {
  return post<Snapshot>(
    `/api/iceberg/namespaces/${namespace}/tables/${table_name}/snapshots`,
    { summary }
  )
}

/**
 * Delete table - using backend API
 */
export async function deleteTable(namespace: string, table_name: string): Promise<void> {
  return del<void>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}`)
}
