# Add to your existing data_source_service.py or create a new file

import minio
from minio.error import S3Error
from sqlalchemy import create_engine
from typing import Optional, Dict, Any, List, Union
import pandas as pd
import io
import json
import logging

logger = logging.getLogger(__name__)

class DataSourceService:
    def __init__(self):
        self.postgres_service = PostgresService()
        
    def get_connection(self, source_id: int) -> Optional[Any]:
        """Get a connection object for the given source ID"""
        source = self.postgres_service.get_data_source(source_id)
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
        source = self.postgres_service.get_data_source(source_id)
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