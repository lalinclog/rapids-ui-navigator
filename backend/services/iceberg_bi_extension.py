
from .bi_service import BIService
from .iceberg_service import IcebergService
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

class IcebergBIExtension:
    """Extension to BIService for Iceberg table management"""
    
    def __init__(self, bi_service: BIService):
        self.bi_service = bi_service
        self.iceberg_service = IcebergService()
    
    def create_iceberg_dataset(
        self,
        name: str,
        description: str,
        source_id: int,
        namespace: str,
        table_name: str,
        bucket: str,
        base_path: Optional[str] = None,
        csv_path: Optional[str] = None,
        user_id: int = 1
    ) -> Dict[str, Any]:
        """Create a new dataset backed by an Iceberg table"""
        try:
            # If creating from CSV, convert to Iceberg first
            if csv_path:
                table_info = self.iceberg_service.create_table_from_csv(
                    namespace=namespace,
                    table_name=table_name,
                    bucket=bucket,
                    csv_path=csv_path,
                    base_path=base_path
                )
            else:
                # Load existing Iceberg table
                table_info = self.iceberg_service.get_table_info(namespace, table_name)
            
            # Create dataset record in the database
            with self.bi_service.postgres_service._get_connection() as conn:
                query = """
                INSERT INTO spark_rapids.public.datasets 
                (name, description, source_id, query_type, query_definition, schema, 
                 created_by, user_id, base_path, iceberg_namespace, iceberg_table)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """
                
                result = self.bi_service._execute_query(conn, query, (
                    name,
                    description,
                    source_id,
                    "iceberg_table",
                    f"{namespace}.{table_name}",
                    table_info["schema"],
                    str(user_id),
                    user_id,
                    base_path,
                    namespace,
                    table_name
                ))
                
                dataset_id = result[0]["id"]
                
                return {
                    "id": dataset_id,
                    "name": name,
                    "description": description,
                    "source_id": source_id,
                    "query_type": "iceberg_table",
                    "query_definition": f"{namespace}.{table_name}",
                    "schema": table_info["schema"],
                    "iceberg_namespace": namespace,
                    "iceberg_table": table_name,
                    "base_path": base_path
                }
                
        except Exception as e:
            logger.error(f"Error creating Iceberg dataset: {e}")
            raise
    
    def preview_iceberg_dataset(
        self,
        namespace: str,
        table_name: str,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Preview an Iceberg table"""
        try:
            return self.iceberg_service.query_table(
                namespace=namespace,
                table_name=table_name,
                limit=limit
            )
        except Exception as e:
            logger.error(f"Error previewing Iceberg table: {e}")
            raise
    
    def get_iceberg_data(
        self,
        dataset_id: int,
        limit: int = 1000,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get data from an Iceberg dataset"""
        try:
            # Get dataset info
            with self.bi_service.postgres_service._get_connection() as conn:
                query = """
                SELECT iceberg_namespace, iceberg_table 
                FROM spark_rapids.public.datasets 
                WHERE id = %s AND query_type = 'iceberg_table'
                """
                result = self.bi_service._execute_query(conn, query, (dataset_id,))
                
                if not result:
                    raise ValueError(f"Iceberg dataset {dataset_id} not found")
                
                namespace = result[0]["iceberg_namespace"]
                table_name = result[0]["iceberg_table"]
                
                # Query the Iceberg table
                table_data = self.iceberg_service.query_table(
                    namespace=namespace,
                    table_name=table_name,
                    limit=limit
                )
                
                return table_data["sample_data"]
                
        except Exception as e:
            logger.error(f"Error getting Iceberg data: {e}")
            raise
