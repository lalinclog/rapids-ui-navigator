
import json
import logging
from typing import List, Dict, Any, Optional
from .postgres_service import PostgresService
from .data_source_service import DataSourceService

logger = logging.getLogger(__name__)

class BIService:
    def __init__(self):
        self.postgres_service = PostgresService()
        self.data_source_service = DataSourceService()
    
    def create_dataset(self, dataset_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create a new dataset with all related information"""
        try:
            with self.postgres_service._get_connection() as conn:
                # Start transaction
                conn.execute("BEGIN;")
                
                try:
                    # Insert the dataset
                    insert_query = """
                    INSERT INTO bi.datasets (
                        name, description, source_id, query_type, query_definition,
                        cache_policy, created_by, created_at, updated_at, is_active
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), %s)
                    RETURNING id
                    """
                    
                    cache_policy = json.dumps(dataset_data.get('cache_policy', {}))
                    
                    result = self._execute_query(conn, insert_query, (
                        dataset_data['name'],
                        dataset_data.get('description'),
                        dataset_data['source_id'],
                        dataset_data['query_type'],
                        dataset_data['query_definition'],
                        cache_policy,
                        user_id,
                        True
                    ))
                    
                    dataset_id = result[0]['id']
                    
                    # Get the source type to determine how to handle schema
                    source_query = "SELECT type, connection_string FROM bi.data_sources WHERE id = %s"
                    source_result = self._execute_query(conn, source_query, (dataset_data['source_id'],))
                    
                    if source_result:
                        source_type = source_result[0]['type']
                        
                        # Auto-generate schema and fields based on source type
                        schema_info = self._generate_schema_for_dataset({
                            'id': dataset_id,
                            'source_id': dataset_data['source_id'],
                            'source_type': source_type,
                            'query_definition': dataset_data['query_definition'],
                            'query_type': dataset_data['query_type']
                        })
                        
                        # Insert fields if schema was successfully generated
                        if schema_info and 'fields' in schema_info:
                            for field in schema_info['fields']:
                                field_query = """
                                INSERT INTO bi.fields (
                                    dataset_id, name, display_name, field_type, data_type,
                                    format_pattern, is_visible, created_at, updated_at
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                                """
                                
                                self._execute_query(conn, field_query, (
                                    dataset_id,
                                    field['name'],
                                    field.get('display_name', field['name']),
                                    field.get('field_type', 'dimension'),
                                    field.get('type', 'string'),
                                    field.get('format_pattern'),
                                    True
                                ))
                    
                    # Commit transaction
                    conn.execute("COMMIT;")
                    
                    # Return the created dataset with all information
                    return self.get_dataset(dataset_id, user_id)
                    
                except Exception as e:
                    conn.execute("ROLLBACK;")
                    raise e
                    
        except Exception as e:
            logger.error(f"Error creating dataset: {str(e)}")
            raise
    
    def update_dataset(self, dataset_id: int, dataset_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Update an existing dataset and related information"""
        try:
            with self.postgres_service._get_connection() as conn:
                conn.execute("BEGIN;")
                
                try:
                    # Update the dataset
                    update_query = """
                    UPDATE bi.datasets 
                    SET name = %s, description = %s, source_id = %s, query_type = %s,
                        query_definition = %s, cache_policy = %s, updated_at = NOW()
                    WHERE id = %s AND (created_by = %s OR %s IN (
                        SELECT sub FROM keycloak_users WHERE realm_access->'roles' ? 'admin'
                    ))
                    """
                    
                    cache_policy = json.dumps(dataset_data.get('cache_policy', {}))
                    
                    self._execute_query(conn, update_query, (
                        dataset_data['name'],
                        dataset_data.get('description'),
                        dataset_data['source_id'],
                        dataset_data['query_type'],
                        dataset_data['query_definition'],
                        cache_policy,
                        dataset_id,
                        user_id,
                        user_id  # For admin check
                    ))
                    
                    # If source or query changed, regenerate schema
                    if 'source_id' in dataset_data or 'query_definition' in dataset_data:
                        # Get updated dataset info
                        dataset_query = """
                        SELECT d.*, ds.type as source_type 
                        FROM bi.datasets d
                        JOIN bi.data_sources ds ON d.source_id = ds.id
                        WHERE d.id = %s
                        """
                        dataset_result = self._execute_query(conn, dataset_query, (dataset_id,))
                        
                        if dataset_result:
                            dataset_info = dict(dataset_result[0])
                            
                            # Remove existing fields
                            self._execute_query(conn, "DELETE FROM bi.fields WHERE dataset_id = %s", (dataset_id,))
                            
                            # Regenerate schema and fields
                            schema_info = self._generate_schema_for_dataset(dataset_info)
                            
                            if schema_info and 'fields' in schema_info:
                                for field in schema_info['fields']:
                                    field_query = """
                                    INSERT INTO bi.fields (
                                        dataset_id, name, display_name, field_type, data_type,
                                        format_pattern, is_visible, created_at, updated_at
                                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                                    """
                                    
                                    self._execute_query(conn, field_query, (
                                        dataset_id,
                                        field['name'],
                                        field.get('display_name', field['name']),
                                        field.get('field_type', 'dimension'),
                                        field.get('type', 'string'),
                                        field.get('format_pattern'),
                                        True
                                    ))
                    
                    conn.execute("COMMIT;")
                    
                    # Return updated dataset
                    return self.get_dataset(dataset_id, user_id)
                    
                except Exception as e:
                    conn.execute("ROLLBACK;")
                    raise e
                    
        except Exception as e:
            logger.error(f"Error updating dataset: {str(e)}")
            raise
    
    def delete_dataset(self, dataset_id: int, user_id: str) -> bool:
        """Delete a dataset and all related information"""
        try:
            with self.postgres_service._get_connection() as conn:
                conn.execute("BEGIN;")
                
                try:
                    # Delete related fields first
                    self._execute_query(conn, "DELETE FROM bi.fields WHERE dataset_id = %s", (dataset_id,))
                    
                    # Delete the dataset (with permission check)
                    delete_query = """
                    DELETE FROM bi.datasets 
                    WHERE id = %s AND (created_by = %s OR %s IN (
                        SELECT sub FROM keycloak_users WHERE realm_access->'roles' ? 'admin'
                    ))
                    """
                    
                    result = self._execute_query(conn, delete_query, (dataset_id, user_id, user_id))
                    
                    conn.execute("COMMIT;")
                    
                    return True
                    
                except Exception as e:
                    conn.execute("ROLLBACK;")
                    raise e
                    
        except Exception as e:
            logger.error(f"Error deleting dataset: {str(e)}")
            return False
    
    def get_dataset(self, dataset_id: int, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get a single dataset with all related information"""
        datasets = self.get_datasets(user_id)
        for dataset in datasets:
            if dataset['id'] == dataset_id:
                return dataset
        return None
    
    def get_datasets(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all datasets with source information and metadata"""
        try:
            query = """
            SELECT 
                d.id,
                d.name,
                d.description,
                d.source_id,
                d.query_type,
                d.query_definition,
                d.cache_policy,
                d.last_refreshed,
                d.created_at,
                d.updated_at,
                d.created_by,
                d.is_active,
                ds.name as source_name,
                ds.type as source_type,
                ds.connection_string,
                ds.config as source_config
            FROM bi.datasets d
            LEFT JOIN bi.data_sources ds ON d.source_id = ds.id
            WHERE d.is_active = true
            """
            
            if user_id:
                query += " AND (d.created_by = %s OR %s IN (SELECT sub FROM keycloak_users WHERE realm_access->'roles' ? 'admin'))"
                params = (user_id, user_id)
            else:
                params = ()
            
            query += " ORDER BY d.updated_at DESC"
            
            results = self.postgres_service.execute_query(query, params)
            
            # Enrich each dataset with metadata and schema information
            enriched_datasets = []
            for row in results:
                dataset = dict(row)
                
                # Add computed fields
                dataset['last_refreshed_at'] = dataset.get('last_refreshed')
                
                # Get schema information based on source type
                schema_info = self._get_schema_info(dataset)
                dataset['schema'] = schema_info
                
                # Get MinIO-specific metadata if applicable
                if dataset.get('source_type') == 'minio':
                    minio_metadata = self._get_minio_metadata(dataset)
                    dataset['minio_metadata'] = minio_metadata
                
                # Get fields for this dataset
                fields = self._get_dataset_fields(dataset['id'])
                dataset['fields'] = fields
                
                # Add cache information
                cache_info = self._get_cache_info(dataset)
                dataset['cache_info'] = cache_info
                
                enriched_datasets.append(dataset)
            
            return enriched_datasets
            
        except Exception as e:
            logger.error(f"Error getting datasets: {str(e)}")
            return []
    
    def _generate_schema_for_dataset(self, dataset: Dict[str, Any]) -> Dict[str, Any]:
        """Generate schema information for a dataset based on its source type"""
        try:
            source_type = dataset.get('source_type', '').lower()
            
            if source_type in ['postgresql', 'postgres', 'mysql', 'sqlserver']:
                return self._generate_sql_schema(dataset)
            elif source_type == 'minio':
                return self._generate_minio_schema(dataset)
            else:
                return {'fields': [], 'inferred': False}
                
        except Exception as e:
            logger.error(f"Error generating schema for dataset {dataset.get('id')}: {str(e)}")
            return {'fields': [], 'inferred': False}
    
    def _generate_sql_schema(self, dataset: Dict[str, Any]) -> Dict[str, Any]:
        """Generate schema for SQL-based datasets"""
        try:
            source_id = dataset.get('source_id')
            query_definition = dataset.get('query_definition', '')
            query_type = dataset.get('query_type', 'table')
            
            if not source_id or not query_definition:
                return {'fields': [], 'inferred': False}
            
            connection = self.data_source_service.get_connection(source_id)
            if not connection:
                return {'fields': [], 'inferred': False}
            
            # Build the actual query based on query_type
            if query_type == 'custom':
                sample_query = f"SELECT * FROM ({query_definition}) as sample_query LIMIT 0"
            else:  # table or view
                sample_query = f"SELECT * FROM {query_definition} LIMIT 0"
            
            with connection.connect() as conn:
                from sqlalchemy import text
                result = conn.execute(text(sample_query))
                columns = result.keys()
                
                fields = []
                for col in columns:
                    fields.append({
                        'name': col,
                        'type': 'string',  # Default to string, could be enhanced with type detection
                        'nullable': True,
                        'description': None,
                        'field_type': 'dimension'
                    })
                
                return {
                    'fields': fields,
                    'inferred': True,
                    'last_analyzed': dataset.get('updated_at')
                }
                
        except Exception as e:
            logger.error(f"Error generating SQL schema: {str(e)}")
            return {'fields': [], 'inferred': False}
    
    def _generate_minio_schema(self, dataset: Dict[str, Any]) -> Dict[str, Any]:
        """Generate schema for MinIO-based datasets"""
        try:
            query_definition = dataset.get('query_definition', '{}')
            
            # Parse MinIO query definition
            try:
                minio_query = json.loads(query_definition) if isinstance(query_definition, str) else query_definition
            except:
                minio_query = {}
            
            bucket = minio_query.get('bucket', '')
            prefix = minio_query.get('prefix', '')
            file_type = minio_query.get('file_type', 'csv')
            
            if not bucket:
                return {'fields': [], 'inferred': False}
            
            source_id = dataset.get('source_id')
            connection = self.data_source_service.get_connection(source_id)
            
            if connection:
                try:
                    objects = connection.list_objects(bucket, prefix=prefix, recursive=True)
                    
                    # Find the first file of the specified type
                    for obj in objects:
                        if obj.object_name.endswith(f'.{file_type}'):
                            schema_fields = self._analyze_minio_file_schema(
                                connection, bucket, obj.object_name, file_type
                            )
                            return {
                                'fields': schema_fields,
                                'inferred': True,
                                'last_analyzed': dataset.get('updated_at'),
                                'sample_file': obj.object_name
                            }
                except Exception as e:
                    logger.error(f"Error analyzing MinIO files: {str(e)}")
            
            return {'fields': [], 'inferred': False}
            
        except Exception as e:
            logger.error(f"Error generating MinIO schema: {str(e)}")
            return {'fields': [], 'inferred': False}
    
    def _analyze_minio_file_schema(self, client, bucket: str, object_name: str, file_type: str) -> List[Dict[str, Any]]:
        """Analyze a MinIO file to infer its schema"""
        try:
            import pandas as pd
            import io
            
            response = client.get_object(bucket, object_name)
            
            if file_type == 'csv':
                df = pd.read_csv(io.BytesIO(response.data), nrows=100)
            elif file_type == 'json':
                df = pd.read_json(io.BytesIO(response.data))
            elif file_type == 'parquet':
                df = pd.read_parquet(io.BytesIO(response.data))
            else:
                return []
            
            fields = []
            for col in df.columns:
                dtype = str(df[col].dtype)
                
                # Map pandas dtypes to our schema types
                if 'int' in dtype:
                    field_type = 'integer'
                    data_type = 'metric'
                elif 'float' in dtype:
                    field_type = 'number'
                    data_type = 'metric'
                elif 'bool' in dtype:
                    field_type = 'boolean'
                    data_type = 'dimension'
                elif 'datetime' in dtype:
                    field_type = 'datetime'
                    data_type = 'dimension'
                else:
                    field_type = 'string'
                    data_type = 'dimension'
                
                fields.append({
                    'name': col,
                    'type': field_type,
                    'nullable': df[col].isnull().any(),
                    'description': None,
                    'field_type': data_type
                })
            
            return fields
            
        except Exception as e:
            logger.error(f"Error analyzing file {object_name}: {str(e)}")
            return []
    
    # ... keep existing code (_get_schema_info, _get_minio_metadata, _get_dataset_fields, _get_cache_info methods)
    
    def _execute_query(self, conn, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Execute a query and return results as list of dictionaries"""
        cursor = conn.cursor()
        cursor.execute(query, params)
        
        if query.strip().upper().startswith('SELECT') or 'RETURNING' in query.upper():
            columns = [desc[0] for desc in cursor.description]
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            return results
        else:
            conn.commit()
            return []
