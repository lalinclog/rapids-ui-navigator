
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
                query += " AND d.created_by = %s"
                params = (user_id,)
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
    
    def _get_schema_info(self, dataset: Dict[str, Any]) -> Dict[str, Any]:
        """Get schema information for a dataset based on its source type"""
        try:
            source_type = dataset.get('source_type', '').lower()
            query_definition = dataset.get('query_definition', '')
            
            if source_type in ['postgresql', 'postgres', 'mysql', 'sqlserver']:
                return self._get_sql_schema_info(dataset)
            elif source_type == 'minio':
                return self._get_minio_schema_info(dataset)
            else:
                return {
                    'fields': [],
                    'inferred': False,
                    'last_analyzed': None
                }
                
        except Exception as e:
            logger.error(f"Error getting schema info for dataset {dataset.get('id')}: {str(e)}")
            return {'fields': [], 'inferred': False, 'last_analyzed': None}
    
    def _get_sql_schema_info(self, dataset: Dict[str, Any]) -> Dict[str, Any]:
        """Get schema information for SQL-based datasets"""
        try:
            source_id = dataset.get('source_id')
            query_definition = dataset.get('query_definition', '')
            
            if not source_id or not query_definition:
                return {'fields': [], 'inferred': False}
            
            # Execute DESCRIBE or similar query to get column information
            connection = self.data_source_service.get_connection(source_id)
            if not connection:
                return {'fields': [], 'inferred': False}
            
            # For PostgreSQL, we can use INFORMATION_SCHEMA or analyze the query
            # This is a simplified approach - in production, you'd want more robust schema detection
            sample_query = f"SELECT * FROM ({query_definition}) as sample_query LIMIT 0"
            
            with connection.connect() as conn:
                from sqlalchemy import text
                result = conn.execute(text(sample_query))
                columns = result.keys()
                
                fields = []
                for col in columns:
                    fields.append({
                        'name': col,
                        'type': 'unknown',  # Would need more sophisticated type detection
                        'nullable': True,
                        'description': None
                    })
                
                return {
                    'fields': fields,
                    'inferred': True,
                    'last_analyzed': dataset.get('updated_at')
                }
                
        except Exception as e:
            logger.error(f"Error getting SQL schema info: {str(e)}")
            return {'fields': [], 'inferred': False}
    
    def _get_minio_schema_info(self, dataset: Dict[str, Any]) -> Dict[str, Any]:
        """Get schema information for MinIO-based datasets"""
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
            
            # Try to analyze a sample file to infer schema
            source_id = dataset.get('source_id')
            connection = self.data_source_service.get_connection(source_id)
            
            if connection:
                try:
                    objects = connection.list_objects(bucket, prefix=prefix, recursive=True)
                    
                    # Find the first file of the specified type
                    for obj in objects:
                        if obj.object_name.endswith(f'.{file_type}'):
                            # Analyze this file for schema
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
            logger.error(f"Error getting MinIO schema info: {str(e)}")
            return {'fields': [], 'inferred': False}
    
    def _analyze_minio_file_schema(self, client, bucket: str, object_name: str, file_type: str) -> List[Dict[str, Any]]:
        """Analyze a MinIO file to infer its schema"""
        try:
            import pandas as pd
            import io
            
            response = client.get_object(bucket, object_name)
            
            if file_type == 'csv':
                df = pd.read_csv(io.BytesIO(response.data), nrows=100)  # Sample first 100 rows
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
                elif 'float' in dtype:
                    field_type = 'number'
                elif 'bool' in dtype:
                    field_type = 'boolean'
                elif 'datetime' in dtype:
                    field_type = 'datetime'
                else:
                    field_type = 'string'
                
                fields.append({
                    'name': col,
                    'type': field_type,
                    'nullable': df[col].isnull().any(),
                    'description': None
                })
            
            return fields
            
        except Exception as e:
            logger.error(f"Error analyzing file {object_name}: {str(e)}")
            return []
    
    def _get_minio_metadata(self, dataset: Dict[str, Any]) -> Dict[str, Any]:
        """Get MinIO-specific metadata for a dataset"""
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
            
            metadata = {
                'bucket': bucket,
                'prefix': prefix,
                'file_type': file_type,
                'file_count': 0,
                'total_size': 0,
                'last_modified': None,
                'files': []
            }
            
            if not bucket:
                return metadata
            
            # Get MinIO connection and gather file information
            source_id = dataset.get('source_id')
            connection = self.data_source_service.get_connection(source_id)
            
            if connection:
                try:
                    objects = connection.list_objects(bucket, prefix=prefix, recursive=True)
                    
                    files = []
                    total_size = 0
                    latest_modified = None
                    
                    for obj in objects:
                        if obj.object_name.endswith(f'.{file_type}'):
                            file_info = {
                                'name': obj.object_name,
                                'size': obj.size,
                                'last_modified': obj.last_modified.isoformat() if obj.last_modified else None
                            }
                            files.append(file_info)
                            total_size += obj.size or 0
                            
                            if obj.last_modified and (not latest_modified or obj.last_modified > latest_modified):
                                latest_modified = obj.last_modified
                    
                    metadata.update({
                        'file_count': len(files),
                        'total_size': total_size,
                        'last_modified': latest_modified.isoformat() if latest_modified else None,
                        'files': files[:10]  # Limit to first 10 files for performance
                    })
                    
                except Exception as e:
                    logger.error(f"Error getting MinIO metadata: {str(e)}")
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error getting MinIO metadata for dataset {dataset.get('id')}: {str(e)}")
            return {
                'bucket': '',
                'prefix': '',
                'file_type': 'csv',
                'file_count': 0,
                'total_size': 0,
                'last_modified': None,
                'files': []
            }
    
    def _get_dataset_fields(self, dataset_id: int) -> List[Dict[str, Any]]:
        """Get field definitions for a dataset"""
        try:
            query = """
            SELECT 
                id,
                dataset_id,
                name,
                display_name,
                field_type,
                data_type,
                format_pattern,
                is_visible,
                created_at,
                updated_at
            FROM bi.fields
            WHERE dataset_id = %s
            ORDER BY name
            """
            
            results = self.postgres_service.execute_query(query, (dataset_id,))
            return [dict(row) for row in results]
            
        except Exception as e:
            logger.error(f"Error getting fields for dataset {dataset_id}: {str(e)}")
            return []
    
    def _get_cache_info(self, dataset: Dict[str, Any]) -> Dict[str, Any]:
        """Get cache information for a dataset"""
        try:
            cache_policy = dataset.get('cache_policy')
            last_refreshed = dataset.get('last_refreshed')
            
            if isinstance(cache_policy, str):
                try:
                    cache_policy = json.loads(cache_policy)
                except:
                    cache_policy = {}
            
            cache_info = {
                'enabled': cache_policy.get('enabled', False) if cache_policy else False,
                'ttl_minutes': cache_policy.get('ttl_minutes', 60) if cache_policy else 60,
                'auto_refresh': cache_policy.get('auto_refresh', False) if cache_policy else False,
                'last_refreshed': last_refreshed,
                'next_refresh': None,
                'status': 'unknown'
            }
            
            # Calculate next refresh time if auto refresh is enabled
            if cache_info['enabled'] and cache_info['auto_refresh'] and last_refreshed:
                from datetime import datetime, timedelta
                try:
                    if isinstance(last_refreshed, str):
                        last_refresh_dt = datetime.fromisoformat(last_refreshed.replace('Z', '+00:00'))
                    else:
                        last_refresh_dt = last_refreshed
                    
                    next_refresh = last_refresh_dt + timedelta(minutes=cache_info['ttl_minutes'])
                    cache_info['next_refresh'] = next_refresh.isoformat()
                    
                    # Determine cache status
                    now = datetime.now(last_refresh_dt.tzinfo) if last_refresh_dt.tzinfo else datetime.now()
                    if now > next_refresh:
                        cache_info['status'] = 'expired'
                    else:
                        cache_info['status'] = 'valid'
                except Exception as e:
                    logger.error(f"Error calculating cache times: {str(e)}")
            
            return cache_info
            
        except Exception as e:
            logger.error(f"Error getting cache info: {str(e)}")
            return {
                'enabled': False,
                'ttl_minutes': 60,
                'auto_refresh': False,
                'last_refreshed': None,
                'next_refresh': None,
                'status': 'unknown'
            }
