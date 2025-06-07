
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
 * List all namespaces - proxied through backend to Iceberg REST API
 */
export async function listNamespaces(token?: string): Promise<string[]> {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const response = await get<{namespaces: string[]}>("/api/iceberg/namespaces", config)
    return response.namespaces
  } catch (error) {
    console.error('Error listing namespaces:', error);
    throw error;
  }
}

/**
 * Create a new namespace - proxied through backend to Iceberg REST API
 */
export async function createNamespace(namespace: string, properties: Record<string, string> = {}, token?: string): Promise<IcebergNamespace> {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const response = await post<IcebergNamespace>("/api/iceberg/namespaces", {
      name: namespace,
      properties
    }, config)
    return {
      name: namespace,
      properties: response.properties || properties
    }
  } catch (error) {
    console.error('Error creating namespace:', error);
    throw error;
  }
}

/**
 * Get detailed namespace information - proxied through backend to Iceberg REST API
 */
export async function getNamespaceDetails(namespace: string, token?: string): Promise<IcebergNamespace> {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const response = await get<{properties: Record<string, string>}>(`/api/iceberg/namespaces/${namespace}`, config)
    return {
      name: namespace,
      properties: response.properties
    }
  } catch (error) {
    console.error('Error getting namespace details:', error);
    throw error;
  }
}

/**
 * Update namespace properties - proxied through backend to Iceberg REST API
 */
export async function updateNamespaceProperties(
  namespace: string, 
  properties: Record<string, string>,
  token?: string
): Promise<IcebergNamespace> {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const response = await put<{properties: Record<string, string>}>(`/api/iceberg/namespaces/${namespace}`, {
      properties
    }, config)
    return {
      name: namespace,
      properties: response.properties
    }
  } catch (error) {
    console.error('Error updating namespace properties:', error);
    throw error;
  }
}

/**
 * Delete a namespace - proxied through backend to Iceberg REST API
 */
export async function deleteNamespace(namespace: string, token?: string): Promise<void> {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    return del<void>(`/api/iceberg/namespaces/${namespace}`, config)
  } catch (error) {
    console.error('Error deleting namespace:', error);
    throw error;
  }
}

/**
 * List tables in a namespace - proxied through backend to Iceberg REST API
 */
export async function listTables(namespace: string, token?: string): Promise<string[]> {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const response = await get<{identifiers: Array<string[]>}>(`/api/iceberg/namespaces/${namespace}/tables`, config)
    // Iceberg returns table identifiers as arrays, we need just the table names
    return response.identifiers.map(identifier => identifier[identifier.length - 1])
  } catch (error) {
    console.error('Error listing tables:', error);
    throw error;
  }
}

/**
 * Get detailed table information - proxied through backend to Iceberg REST API
 */
export async function getTableDetails(namespace: string, table_name: string, token?: string): Promise<IcebergTable> {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const response = await get<any>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}`, config)
    return {
      name: table_name,
      namespace: namespace,
      location: response.metadata.location,
      schema: {
        columns: response.metadata.schema.fields.map((field: any) => ({
          name: field.name,
          type: field.type,
          nullable: !field.required,
          field_id: field.id,
          description: field.doc
        })),
        schema_id: response.metadata.schema.schemaId
      },
      current_snapshot_id: response.metadata.currentSnapshotId
    }
  } catch (error) {
    console.error('Error getting table details:', error);
    throw error;
  }
}

/**
 * Get table statistics and metadata - proxied through backend to Iceberg REST API
 */
export async function getTableStatistics(namespace: string, table_name: string, token?: string): Promise<any> {
  // For now, return the same as table details since Iceberg REST doesn't have separate stats endpoint
  return getTableDetails(namespace, table_name, token)
}

/**
 * Update table schema - proxied through backend to Iceberg REST API
 */
export async function updateTableSchema(schemaUpdate: SchemaUpdateRequest, token?: string): Promise<IcebergTable> {
  // This would need to be implemented based on Iceberg's schema update API
  // For now, return placeholder
  throw new Error("Schema updates not yet implemented for proxied Iceberg communication")
}

/**
 * Get table snapshots - proxied through backend to Iceberg REST API
 */
export async function getTableSnapshots(namespace: string, table_name: string, token?: string): Promise<Snapshot[]> {
  try {
    const tableDetails = await getTableDetails(namespace, table_name, token)
    // Extract snapshots from table metadata if available
    return tableDetails.snapshots || []
  } catch (error) {
    console.error('Error getting table snapshots:', error);
    throw error;
  }
}

/**
 * Rollback table to a specific snapshot - proxied through backend to Iceberg REST API
 */
export async function rollbackToSnapshot(
  namespace: string, 
  table_name: string, 
  snapshot_id: string,
  token?: string
): Promise<IcebergTable> {
  // This would need to be implemented based on Iceberg's rollback API
  throw new Error("Snapshot rollback not yet implemented for proxied Iceberg communication")
}

/**
 * Create table snapshot - proxied through backend to Iceberg REST API
 */
export async function createTableSnapshot(
  namespace: string, 
  table_name: string, 
  summary?: Record<string, string>,
  token?: string
): Promise<Snapshot> {
  // This would need to be implemented based on Iceberg's snapshot API
  throw new Error("Snapshot creation not yet implemented for proxied Iceberg communication")
}

/**
 * Delete table - proxied through backend to Iceberg REST API
 */
export async function deleteTable(namespace: string, table_name: string, token?: string): Promise<void> {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    return del<void>(`/api/iceberg/namespaces/${namespace}/tables/${table_name}`, config)
  } catch (error) {
    console.error('Error deleting table:', error);
    throw error;
  }
}
