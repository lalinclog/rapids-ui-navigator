
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
 * List all namespaces with authentication support
 */
export async function listNamespaces(token?: string): Promise<string[]> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  const response = await get<{ namespaces: string[] }>("/api/iceberg/namespaces", config);
  return response.namespaces;
}

/**
 * List tables in a namespace with authentication support
 */
export async function listTables(namespace: string, token?: string): Promise<string[]> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  const response = await get<{ tables: string[] }>(`/api/iceberg/namespaces/${namespace}/tables`, config);
  return response.tables;
}

/**
 * Get detailed namespace information
 */
export async function getNamespaceDetails(namespace: string, token?: string): Promise<IcebergNamespace> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  return get<IcebergNamespace>(`/api/iceberg/namespaces/${namespace}`, config);
}

/**
 * Update namespace properties
 */
export async function updateNamespaceProperties(
  namespace: string, 
  properties: Record<string, string>,
  token?: string
): Promise<IcebergNamespace> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  return put<IcebergNamespace>(`/api/iceberg/namespaces/${namespace}`, { properties }, config);
}

/**
 * Get detailed table information including snapshots
 */
export async function getTableDetails(namespace: string, table_name: string, token?: string): Promise<IcebergTable> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  return get<IcebergTable>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}`, config);
}

/**
 * Get table statistics and metadata
 */
export async function getTableStatistics(namespace: string, table_name: string, token?: string): Promise<any> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  return get<any>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}/statistics`, config);
}

/**
 * Update table schema
 */
export async function updateTableSchema(schemaUpdate: SchemaUpdateRequest, token?: string): Promise<IcebergTable> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  return put<IcebergTable>(
    `/api/iceberg/namespaces/${schemaUpdate.namespace}/tables/${schemaUpdate.table_name}/schema`,
    { updates: schemaUpdate.updates },
    config
  );
}

/**
 * Get table snapshots
 */
export async function getTableSnapshots(namespace: string, table_name: string, token?: string): Promise<Snapshot[]> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  const response = await get<{snapshots: Snapshot[]}>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}/snapshots`, config);
  return response.snapshots;
}

/**
 * Rollback table to a specific snapshot
 */
export async function rollbackToSnapshot(
  namespace: string, 
  table_name: string, 
  snapshot_id: string,
  token?: string
): Promise<IcebergTable> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  return post<IcebergTable>(
    `/api/iceberg/namespaces/${namespace}/tables/${table_name}/rollback`,
    { snapshot_id },
    config
  );
}

/**
 * Create table snapshot
 */
export async function createTableSnapshot(
  namespace: string, 
  table_name: string, 
  summary?: Record<string, string>,
  token?: string
): Promise<Snapshot> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  return post<Snapshot>(
    `/api/iceberg/namespaces/${namespace}/tables/${table_name}/snapshots`,
    { summary },
    config
  );
}

/**
 * Delete table
 */
export async function deleteTable(namespace: string, table_name: string, token?: string): Promise<void> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  return del<void>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}`, config);
}
