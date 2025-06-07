
import { icebergGet, icebergPost, icebergPut, icebergDel } from "./api-client"

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
 * List all namespaces - direct Iceberg REST API call
 */
export async function listNamespaces(): Promise<string[]> {
  const response = await icebergGet<{namespaces: string[]}>("/namespaces")
  return response.namespaces
}

/**
 * Create a new namespace - direct Iceberg REST API call
 */
export async function createNamespace(namespace: string, properties: Record<string, string> = {}): Promise<IcebergNamespace> {
  const response = await icebergPost<IcebergNamespace>("/namespaces", {
    namespace,
    properties
  })
  return response
}

/**
 * Get detailed namespace information - direct Iceberg REST API call
 */
export async function getNamespaceDetails(namespace: string): Promise<IcebergNamespace> {
  const response = await icebergGet<{properties: Record<string, string>}>(`/namespaces/${namespace}`)
  return {
    name: namespace,
    properties: response.properties
  }
}

/**
 * Update namespace properties - direct Iceberg REST API call
 */
export async function updateNamespaceProperties(
  namespace: string, 
  properties: Record<string, string>
): Promise<IcebergNamespace> {
  const response = await icebergPut<{properties: Record<string, string>}>(`/namespaces/${namespace}`, {
    properties
  })
  return {
    name: namespace,
    properties: response.properties
  }
}

/**
 * Delete a namespace - direct Iceberg REST API call
 */
export async function deleteNamespace(namespace: string): Promise<void> {
  return icebergDel<void>(`/namespaces/${namespace}`)
}

/**
 * List tables in a namespace - direct Iceberg REST API call
 */
export async function listTables(namespace: string): Promise<string[]> {
  const response = await icebergGet<{identifiers: Array<string[]>}>(`/namespaces/${namespace}/tables`)
  // Iceberg returns table identifiers as arrays, we need just the table names
  return response.identifiers.map(identifier => identifier[identifier.length - 1])
}

/**
 * Get detailed table information - direct Iceberg REST API call
 */
export async function getTableDetails(namespace: string, table_name: string): Promise<IcebergTable> {
  const response = await icebergGet<any>(`/namespaces/${namespace}/tables/${table_name}`)
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
}

/**
 * Get table statistics and metadata - direct Iceberg REST API call
 */
export async function getTableStatistics(namespace: string, table_name: string): Promise<any> {
  // For now, return the same as table details since Iceberg REST doesn't have separate stats endpoint
  return getTableDetails(namespace, table_name)
}

/**
 * Update table schema - direct Iceberg REST API call
 */
export async function updateTableSchema(schemaUpdate: SchemaUpdateRequest): Promise<IcebergTable> {
  // This would need to be implemented based on Iceberg's schema update API
  // For now, return placeholder
  throw new Error("Schema updates not yet implemented for direct Iceberg communication")
}

/**
 * Get table snapshots - direct Iceberg REST API call
 */
export async function getTableSnapshots(namespace: string, table_name: string): Promise<Snapshot[]> {
  const tableDetails = await getTableDetails(namespace, table_name)
  // Extract snapshots from table metadata if available
  return tableDetails.snapshots || []
}

/**
 * Rollback table to a specific snapshot - direct Iceberg REST API call
 */
export async function rollbackToSnapshot(
  namespace: string, 
  table_name: string, 
  snapshot_id: string
): Promise<IcebergTable> {
  // This would need to be implemented based on Iceberg's rollback API
  throw new Error("Snapshot rollback not yet implemented for direct Iceberg communication")
}

/**
 * Create table snapshot - direct Iceberg REST API call
 */
export async function createTableSnapshot(
  namespace: string, 
  table_name: string, 
  summary?: Record<string, string>
): Promise<Snapshot> {
  // This would need to be implemented based on Iceberg's snapshot API
  throw new Error("Snapshot creation not yet implemented for direct Iceberg communication")
}

/**
 * Delete table - direct Iceberg REST API call
 */
export async function deleteTable(namespace: string, table_name: string): Promise<void> {
  return icebergDel<void>(`/namespaces/${namespace}/tables/${table_name}`)
}
