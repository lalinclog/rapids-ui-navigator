
import minio
from minio.error import S3Error
from sqlalchemy import create_engine, text
from typing import Optional, Dict, Any, List, Union
import pandas as pd
import io
import json
import logging
from .postgres_service import PostgresService

logger = logging.getLogger(__name__)

class DataSourceService:
    def __init__(self):
        self.postgres_service = PostgresService()
    
    def create_data_source(self, source_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create a new data source"""
        try:
            with self.postgres_service._get_connection() as conn:
                query = """
                INSERT INTO bi.data_sources (
                    name, type, description, connection_string, config, 
                    created_by, created_at, updated_at, is_active
                ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW(), %s)
                RETURNING id
                """
                
                config = json.dumps(source_data.get('config', {}))
                
                cursor = conn.cursor()
                cursor.execute(query, (
                    source_data['name'],
                    source_data['type'],
                    source_data.get('description'),
                    source_data['connection_string'],
                    config,
                    user_id,
                    True
                ))
                
                result = cursor.fetchone()
                source_id = result[0]
                conn.commit()
                
                return self.get_data_source(source_id)
                
        except Exception as e:
            logger.error(f"Error creating data source: {str(e)}")
            raise
    
    def update_data_source(self, source_id: int, source_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Update an existing data source"""
        try:
            with self.postgres_service._get_connection() as conn:
                query = """
                UPDATE bi.data_sources 
                SET name = %s, type = %s, description = %s, connection_string = %s,
                    config = %s, updated_at = NOW()
                WHERE id = %s AND (created_by = %s OR %s IN (
                    SELECT sub FROM keycloak_users WHERE realm_access->'roles' ? 'admin'
                ))
                """
                
                config = json.dumps(source_data.get('config', {}))
                
                cursor = conn.cursor()
                cursor.execute(query, (
                    source_data['name'],
                    source_data['type'],
                    source_data.get('description'),
                    source_data['connection_string'],
                    config,
                    source_id,
                    user_id,
                    user_id
                ))
                
                conn.commit()
                
                return self.get_data_source(source_id)
                
        except Exception as e:
            logger.error(f"Error updating data source: {str(e)}")
            raise
    
    def delete_data_source(self, source_id: int, user_id: str) -> bool:
        """Delete a data source"""
        try:
            with self.postgres_service._get_connection() as conn:
                # Check if any datasets are using this source
                check_query = "SELECT COUNT(*) FROM bi.datasets WHERE source_id = %s AND is_active = true"
                cursor = conn.cursor()
                cursor.execute(check_query, (source_id,))
                count = cursor.fetchone()[0]
                
                if count > 0:
                    raise ValueError(f"Cannot delete data source. {count} datasets are still using it.")
                
                # Delete the data source
                delete_query = """
                DELETE FROM bi.data_sources 
                WHERE id = %s AND (created_by = %s OR %s IN (
                    SELECT sub FROM keycloak_users WHERE realm_access->'roles' ? 'admin'
                ))
                """
                
                cursor.execute(delete_query, (source_id, user_id, user_id))
                conn.commit()
                
                return True
                
        except Exception as e:
            logger.error(f"Error deleting data source: {str(e)}")
            return False
        
    def get_data_source(self, source_id: int) -> Optional[Dict[str, Any]]:
        """Get a data source by ID"""
        try:
            query = """
            SELECT id, name, type, description, connection_string, config,
                   created_by, created_at, updated_at, is_active
            FROM bi.data_sources 
            WHERE id = %s
            """
            
            result = self.postgres_service.execute_query(query, (source_id,))
            
            if result:
                source = dict(result[0])
                # Parse config if it's a string
                if isinstance(source.get('config'), str):
                    try:
                        source['config'] = json.loads(source['config'])
                    except:
                        source['config'] = {}
                return source
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting data source {source_id}: {str(e)}")
            return None
    
    def get_data_sources(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all data sources"""
        try:
            query = """
            SELECT id, name, type, description, connection_string, config,
                   created_by, created_at, updated_at, is_active
            FROM bi.data_sources 
            WHERE is_active = true
            """
            
            if user_id:
                query += " AND (created_by = %s OR %s IN (SELECT sub FROM keycloak_users WHERE realm_access->'roles' ? 'admin'))"
                params = (user_id, user_id)
            else:
                params = ()
            
            query += " ORDER BY updated_at DESC"
            
            results = self.postgres_service.execute_query(query, params)
            
            sources = []
            for row in results:
                source = dict(row)
                # Parse config if it's a string
                if isinstance(source.get('config'), str):
                    try:
                        source['config'] = json.loads(source['config'])
                    except:
                        source['config'] = {}
                sources.append(source)
            
            return sources
            
        except Exception as e:
            logger.error(f"Error getting data sources: {str(e)}")
            return []
        
    def get_connection(self, source_id: int) -> Optional[Any]:
        """Get a connection object for the given source ID"""
        source = self.get_data_source(source_id)
        if not source:
            return None
            
        try:
            if source['type'].lower() in ['postgresql', 'postgres']:
                return create_engine(source['connection_string'])
            elif source['type'].lower() == 'minio':
                # Parse MinIO connection string (format: endpoint:port:access_key:secret_key:secure)
                parts = source['connection_string'].split(':')
                return minio.Minio(
                    f"{parts[0]}:{parts[1]}",
                    access_key=parts[2],
                    secret_key=parts[3],
                    secure=parts[4].lower() == 'true'
                )
            # Add other database types as needed
            else:
                logger.error(f"Unsupported data source type: {source['type']}")
                return None
        except Exception as e:
            logger.error(f"Failed to create connection for source {source_id}: {str(e)}")
            return None

    def execute_query(self, source_id: int, query: Union[str, Dict]) -> List[Dict]:
        """Execute a query against the data source"""
        source = self.get_data_source(source_id)
        if not source:
            return []
            
        try:
            if source['type'].lower() in ['postgresql', 'postgres', 'mysql', 'sqlserver']:
                # Handle SQL databases
                engine = create_engine(source['connection_string'])
                with engine.connect() as conn:
                    if isinstance(query, dict):
                        # Handle parameterized queries
                        sql = query.get('sql', '')
                        params = query.get('params', {})
                        result = conn.execute(text(sql), **params)
                    else:
                        result = conn.execute(text(query))
                    return [dict(row) for row in result.fetchall()]
                    
            elif source['type'].lower() == 'minio':
                # Handle MinIO queries
                client = self.get_connection(source_id)
                if not client:
                    return []
                    
                if isinstance(query, dict):
                    bucket = query.get('bucket')
                    prefix = query.get('prefix', '')
                    file_type = query.get('file_type', 'csv')
                    
                    objects = client.list_objects(bucket, prefix=prefix, recursive=True)
                    data = []
                    
                    for obj in objects:
                        if obj.object_name.endswith(f'.{file_type}'):
                            response = client.get_object(bucket, obj.object_name)
                            if file_type == 'csv':
                                df = pd.read_csv(io.BytesIO(response.data))
                            elif file_type == 'json':
                                df = pd.read_json(io.BytesIO(response.data))
                            elif file_type == 'parquet':
                                df = pd.read_parquet(io.BytesIO(response.data))
                            else:
                                continue
                                
                            data.extend(df.to_dict('records'))
                    return data
                    
            # Add other data source types as needed
            else:
                logger.error(f"Query execution not implemented for type: {source['type']}")
                return []
                
        except Exception as e:
            logger.error(f"Query execution failed for source {source_id}: {str(e)}")
            return []

    def test_connection(self, source_id: int) -> Dict[str, Any]:
        """Test connection to a data source"""
        try:
            connection = self.get_connection(source_id)
            if not connection:
                return {'success': False, 'message': 'Could not create connection'}
            
            source = self.get_data_source(source_id)
            
            if source['type'].lower() in ['postgresql', 'postgres']:
                with connection.connect() as conn:
                    conn.execute(text("SELECT 1"))
                return {'success': True, 'message': 'Connection successful'}
                
            elif source['type'].lower() == 'minio':
                # Test by listing buckets
                buckets = list(connection.list_buckets())
                return {'success': True, 'message': f'Connection successful. Found {len(buckets)} buckets.'}
            
            return {'success': False, 'message': 'Unsupported connection type'}
            
        except Exception as e:
            return {'success': False, 'message': f'Connection failed: {str(e)}'}
