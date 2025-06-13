
from .iceberg_service import IcebergService
from .minio_service import MinioService
from typing import Dict, Any, List, Optional
import logging
import pandas as pd
import pyarrow as pa
import io

logger = logging.getLogger(__name__)

class IcebergTableService:
    """Service for managing Iceberg tables using the default catalog"""
    
    def __init__(self):
        self.iceberg_service = IcebergService()
        self.minio_service = MinioService()
    
    def list_tables_in_namespace(self, namespace: str = "default") -> Dict[str, Any]:
        """List all tables in a specific namespace"""
        try:
            tables = self.iceberg_service.list_tables(namespace)
            return {
                "namespace": namespace,
                "tables": tables,
                "count": len(tables)
            }
        except Exception as e:
            logger.error(f"Error listing tables in namespace {namespace}: {e}")
            raise
    
    def get_table_details(self, namespace: str, table_name: str) -> Dict[str, Any]:
        """Get detailed information about a table"""
        try:
            return self.iceberg_service.get_table_info(namespace, table_name)
        except Exception as e:
            logger.error(f"Error getting table details for {namespace}.{table_name}: {e}")
            raise
    
    def preview_table(
        self, 
        namespace: str, 
        table_name: str, 
        limit: int = 100
    ) -> Dict[str, Any]:
        """Preview table data"""
        try:
            return self.iceberg_service.query_table(
                namespace=namespace,
                table_name=table_name,
                limit=limit
            )
        except Exception as e:
            logger.error(f"Error previewing table {namespace}.{table_name}: {e}")
            raise
    
    def create_empty_table(
        self,
        namespace: str,
        table_name: str,
        bucket: str,
        schema: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create an empty Iceberg table with a defined schema"""
        try:
            # Ensure bucket exists
            self.iceberg_service._ensure_bucket_exists(bucket)
            
            # Create the table using the simplified approach
            result = self.iceberg_service.create_empty_table(
                namespace=namespace,
                table_name=table_name,
                bucket=bucket,
                schema_definition=schema
            )
            
            logger.info(f"Created empty table '{namespace}.{table_name}'")
            return result
            
        except Exception as e:
            logger.error(f"Error creating empty table: {e}")
            raise
    
    def ingest_data_to_table(
        self,
        namespace: str,
        table_name: str,
        data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Ingest data into an existing Iceberg table"""
        try:
            return self.iceberg_service.append_data_to_table(
                namespace=namespace,
                table_name=table_name,
                data=data
            )
        except Exception as e:
            logger.error(f"Error ingesting data into table {namespace}.{table_name}: {e}")
            raise
    
    def create_table_from_parquet(
        self,
        namespace: str,
        table_name: str,
        bucket: str,
        parquet_path: str,
        base_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create an Iceberg table from Parquet files"""
        try:
            # Build the full path
            if base_path:
                full_path = f"{base_path.rstrip('/')}/{parquet_path.lstrip('/')}"
            else:
                full_path = parquet_path.lstrip('/')
            
            logger.info(f"Creating table {namespace}.{table_name} from Parquet: {bucket}/{full_path}")
            
            # Get the Parquet file from MinIO
            objects = list(self.minio_service.list_objects(bucket, prefix=full_path))
            
            if not objects:
                raise FileNotFoundError(f"No Parquet files found at path: s3://{bucket}/{full_path}")
            
            # Find a .parquet file
            parquet_object = None
            for obj in objects:
                if obj.object_name == full_path or obj.object_name.endswith('.parquet'):
                    parquet_object = obj
                    break
            
            if not parquet_object:
                raise FileNotFoundError(f"No .parquet files found at path: s3://{bucket}/{full_path}")
            
            # Read the Parquet file
            response = self.minio_service.client.get_object(bucket, parquet_object.object_name)
            parquet_data = response.read()
            
            # Convert to DataFrame and then to PyArrow
            df = pd.read_parquet(io.BytesIO(parquet_data))
            arrow_table = pa.Table.from_pandas(df)
            
            # Create table using the default catalog pattern
            catalog = self.iceberg_service._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            
            # Drop table if it exists
            try:
                catalog.drop_table(table_identifier)
                logger.info(f"Dropped existing table: {table_identifier}")
            except:
                pass
            
            # Create the table
            table = catalog.create_table(table_identifier, schema=arrow_table.schema)
            logger.info(f"Created table: {table_identifier}")
            
            # Append the data
            table.append(arrow_table)
            logger.info(f"Appended {len(df)} rows to table: {table_identifier}")
            
            return {
                "table_identifier": table_identifier,
                "location": table.location(),
                "schema": self.iceberg_service._iceberg_schema_to_dict(table.schema()),
                "parquet_source": f"s3://{bucket}/{parquet_object.object_name}",
                "rows_loaded": len(df),
                "message": f"Table '{table_identifier}' created successfully from Parquet data"
            }
            
        except Exception as e:
            logger.error(f"Error creating table from Parquet: {e}")
            raise
    
    def delete_table(self, namespace: str, table_name: str) -> Dict[str, Any]:
        """Delete an Iceberg table"""
        try:
            return self.iceberg_service.delete_table(namespace, table_name)
        except Exception as e:
            logger.error(f"Error deleting table {namespace}.{table_name}: {e}")
            raise
    
    def get_table_statistics(self, namespace: str, table_name: str) -> Dict[str, Any]:
        """Get table statistics and metadata"""
        try:
            return self.iceberg_service.get_table_info(namespace, table_name)
        except Exception as e:
            logger.error(f"Error getting table statistics for {namespace}.{table_name}: {e}")
            raise
