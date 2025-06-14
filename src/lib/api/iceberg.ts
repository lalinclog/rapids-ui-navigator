
import { get, post, put, del } from "./api-client"

export interface IcebergNamespace {
  name: string;
  properties: Record<string, string>;
}

export interface IcebergTable {
  identifier: string;
  metadata: {
    table_identifier: string;
    location: string;
    schema: SchemaInfo;
    current_snapshot_id?: string | number;
    metadata_location?: string;
  };
  schema: SchemaInfo;
  sample_data?: Record<string, any>[];
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  field_id?: number;
  description?: string;
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
 * Get detailed namespace information
 */
export async function getNamespaceDetails(namespace: string, token?: string): Promise<IcebergNamespace> {
  return get<IcebergNamespace>(`/api/iceberg/namespaces/${namespace}`, token)
}

/**
 * Update namespace properties
 */
export async function updateNamespaceProperties(
  namespace: string, 
  properties: Record<string, string>,
  token?: string
): Promise<IcebergNamespace> {
  return put<IcebergNamespace>(`/api/iceberg/namespaces/${namespace}`, { properties }, token)
}

/**
 * List namespaces
 */
export async function listNamespaces(token?: string): Promise<string[]> {
  const response = await get<any>('/api/iceberg/namespaces', token);
  
  // Handle different response formats
  if (Array.isArray(response)) {
    return response;
  }
  
  if (response && response.namespaces) {
    return response.namespaces;
  }
  
  return [];
}

/**
 * List tables in a namespace
 */
export async function listTables(namespace: string, token?: string): Promise<{ tables: { name: string; error?: string }[] }> {
  const response = await get<any>(`/api/iceberg/namespaces/${namespace}/tables`, token);
  
  // Handle different response formats
  if (Array.isArray(response)) {
    return { tables: response.map(name => ({ name })) };
  }
  
  if (response && response.tables) {
    return response;
  }
  
  return { tables: [] };
}

/**
 * Get detailed table information including snapshots
 */
export async function getTableDetails(namespace: string, table_name: string, token?: string): Promise<IcebergTable> {
  const response = await get<any>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}`, token);
  
  console.log('[getTableDetails] Raw backend response:', response);
  
  // Handle the nested response structure from backend
  let tableData = response;
  
  // If response has a "table" wrapper, extract it
  if (response && response.table) {
    tableData = response.table;
  }
  
  // Extract schema from various possible locations
  let schema: SchemaInfo;
  if (tableData.metadata && tableData.metadata.schema) {
    schema = tableData.metadata.schema;
  } else if (tableData.schema) {
    schema = tableData.schema;
  } else {
    // Fallback empty schema
    schema = { columns: [] };
  }
  
  // Extract other metadata
  const identifier = tableData.identifier || tableData.metadata?.table_identifier || `${namespace}.${table_name}`;
  const location = tableData.metadata?.location || tableData.location || '';
  const current_snapshot_id = tableData.metadata?.current_snapshot_id || tableData.current_snapshot_id;
  const metadata_location = tableData.metadata?.metadata_location || tableData.metadata_location;
  const sample_data = tableData.sample_data || [];
  
  const result: IcebergTable = {
    identifier,
    metadata: {
      table_identifier: identifier,
      location,
      schema,
      current_snapshot_id,
      metadata_location
    },
    schema,
    sample_data
  };
  
  console.log('[getTableDetails] Processed result:', result);
  
  return result;
}

/**
 * Get table statistics and metadata
 */
export async function getTableStatistics(namespace: string, table_name: string, token?: string): Promise<any> {
  return get<any>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}/statistics`, token)
}

/**
 * Update table schema
 */
export async function updateTableSchema(schemaUpdate: SchemaUpdateRequest, token?: string): Promise<IcebergTable> {
  return put<IcebergTable>(
    `/api/iceberg/namespaces/${schemaUpdate.namespace}/tables/${schemaUpdate.table_name}/schema`,
    { updates: schemaUpdate.updates },
    token
  )
}

/**
 * Get table snapshots
 */
export async function getTableSnapshots(namespace: string, table_name: string, token?: string): Promise<Snapshot[]> {
  const response = await get<{snapshots: Snapshot[]}>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}/snapshots`, token)
  return response.snapshots
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
  return post<IcebergTable>(
    `/api/iceberg/namespaces/${namespace}/tables/${table_name}/rollback`,
    { snapshot_id },
    token
  )
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
  return post<Snapshot>(
    `/api/iceberg/namespaces/${namespace}/tables/${table_name}/snapshots`,
    { summary },
    token
  )
}

/**
 * Delete table
 */
export async function deleteTable(namespace: string, table_name: string, token?: string): Promise<void> {
  return del<void>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}`, token)
}
