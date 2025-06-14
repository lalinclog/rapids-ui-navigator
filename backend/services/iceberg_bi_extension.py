
from .bi_service import BIService
from .iceberg_service import IcebergService
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

class IcebergBIExtension:
    """Extension to BIService for Iceberg table management"""
    
    def __init__(self,  bi_service: BIService):
        logger.info("IcebergBIExtension.__init__ started")
        try:
            self.bi_service = bi_service
            logger.info("BIService initialized successfully")
            self.iceberg_service = IcebergService()
            logger.info("IcebergService initialized successfully")
            logger.info("IcebergBIExtension.__init__ completed")
        except Exception as e:
            logger.error(f"Error in IcebergBIExtension.__init__: {e}", exc_info=True)
            raise


    
    def create_iceberg_dataset(
        self,
        name: str,
        description: str,
        namespace: str = "default",
        #dataset_type: = "iceberg_table",
        user_id: int = 1,
        source_id: int = 1,
        table_name: Optional[str] = None,
        bucket: str = "warehouse",
        base_path: Optional[str] = None,
        csv_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new dataset backed by an Iceberg table using default catalog"""
        try:
            # Use name as table_name if not provided
            if not table_name:
                table_name = name
                logger.info(f"Using name as table_name: {table_name}")

            # Ensure the bucket exists
            logger.info(f"Ensuring bucket '{bucket}' exists...")
            self.iceberg_service._ensure_bucket_exists(bucket, namespace)
            logger.info(f"Bucket '{bucket}' verified/created successfully")

            # If creating from CSV, convert to Iceberg first
            if csv_path and csv_path.strip():
                logger.info(f"Creating Iceberg table from CSV: {csv_path}")
                table_info = self.iceberg_service.create_table_from_csv(
                    namespace=namespace,
                    table_name=table_name,
                    bucket=bucket,
                    csv_path=csv_path,
                    base_path=base_path
                )
                logger.info(f"Table created from CSV successfully: {table_info}")
            else:
                # Create a new empty Iceberg table
                logger.info(f"Creating new empty Iceberg table: {namespace}.{table_name}")
                table_info = self.iceberg_service.create_empty_table(
                    namespace=namespace,
                    table_name=table_name,
                    bucket=bucket,
                    base_path=base_path
                )
            
            # Create dataset record in the database
            logger.info("Creating dataset record in database...")
            with self.bi_service.postgres_service._get_connection() as conn:
                query = """
                INSERT INTO spark_rapids.public.datasets 
                (name, description, source_id, query_type, query_definition, schema, 
                 created_by, user_id, base_path, iceberg_namespace, iceberg_table)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """

                logger.info(f"Executing database insert query...")
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
                    "success": True,
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
            logger.error(f"=== IcebergBIExtension.create_iceberg_dataset ERROR ===")
            logger.error(f"Error creating Iceberg dataset: {e}", exc_info=True)
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")
            
            # Return error result instead of raising
            error_result = {
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__
            }
            logger.error(f"Returning error result: {error_result}")
            return error_result
    
    def preview_iceberg_dataset(
        self,
        namespace: str = "default",
        table_name: str = "",
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
                
                namespace = result[0]["iceberg_namespace"] or "default"
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
