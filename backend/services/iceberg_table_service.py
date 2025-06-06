
from .iceberg_service import IcebergService
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

class IcebergTableService:
    """Service for managing Iceberg tables specifically"""
    
    def __init__(self):
        self.iceberg_service = IcebergService()
    
    def list_tables_in_namespace(self, namespace: str) -> Dict[str, Any]:
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
            # For now, we'll use the existing CSV method as a template
            # In a real implementation, you'd want a dedicated Parquet reader
            return self.iceberg_service.create_table_from_csv(
                namespace=namespace,
                table_name=table_name,
                bucket=bucket,
                csv_path=parquet_path,  # This would need to be adapted for Parquet
                base_path=base_path
            )
        except Exception as e:
            logger.error(f"Error creating table from Parquet: {e}")
            raise
    
    def delete_table(self, namespace: str, table_name: str) -> Dict[str, Any]:
        """Delete an Iceberg table"""
        try:
            catalog = self.iceberg_service._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            
            # Drop the table
            catalog.drop_table(table_identifier)
            
            logger.info(f"Deleted table '{table_identifier}'")
            
            return {
                "table_identifier": table_identifier,
                "message": f"Table '{table_identifier}' deleted successfully"
            }
            
        except Exception as e:
            logger.error(f"Error deleting table {namespace}.{table_name}: {e}")
            raise
    
    def get_table_statistics(self, namespace: str, table_name: str) -> Dict[str, Any]:
        """Get table statistics and metadata"""
        try:
            catalog = self.iceberg_service._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            table = catalog.load_table(table_identifier)
            
            # Get current snapshot
            snapshot = table.current_snapshot()
            
            stats = {
                "table_identifier": table_identifier,
                "location": table.location(),
                "schema": self.iceberg_service._iceberg_schema_to_dict(table.schema()),
                "current_snapshot_id": snapshot.snapshot_id if snapshot else None,
                "metadata_location": table.metadata_location,
                "properties": table.properties if hasattr(table, 'properties') else {}
            }
            
            if snapshot:
                stats.update({
                    "snapshot_timestamp": snapshot.timestamp_ms,
                    "manifest_list": snapshot.manifest_list,
                    "summary": snapshot.summary if hasattr(snapshot, 'summary') else {}
                })
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting table statistics for {namespace}.{table_name}: {e}")
            raise
