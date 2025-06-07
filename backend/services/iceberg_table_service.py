

from .iceberg_service import IcebergService
from typing import Dict, Any, List, Optional
import logging
import os
from pyiceberg.schema import Schema
from pyiceberg.types import (
    NestedField, StringType, LongType, IntegerType, DoubleType, 
    BooleanType, TimestampType, DateType, DecimalType
)

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
    
    def create_empty_table(
        self,
        namespace: str,
        table_name: str,
        bucket: str,
        schema: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create an empty Iceberg table with a defined schema"""
        try:
            # Convert the schema to Iceberg format
            iceberg_schema = self._build_iceberg_schema(schema)
            
            # Build the table location
            table_location = f"s3://{bucket}/{namespace}/{table_name}/"
            
            catalog = self.iceberg_service._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            
            # Create the table with the schema
            table = catalog.create_table(
                identifier=table_identifier,
                schema=iceberg_schema,
                location=table_location
            )
            
            logger.info(f"Created empty table '{table_identifier}' at location: {table_location}")
            
            return {
                "table_identifier": table_identifier,
                "location": table_location,
                "schema": self.iceberg_service._iceberg_schema_to_dict(iceberg_schema),
                "message": f"Empty table '{table_identifier}' created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error creating empty table: {e}")
            raise
    
    def _build_iceberg_schema(self, schema_definition: List[Dict[str, Any]]) -> Schema:
        """Convert schema definition to Iceberg Schema"""
        fields = []
        
        for i, column in enumerate(schema_definition):
            field_id = i + 1  # Iceberg field IDs start from 1
            name = column["name"]
            type_str = column["type"].lower()
            nullable = column.get("nullable", True)
            
            # Map string types to Iceberg types
            if type_str == "string":
                iceberg_type = StringType()
            elif type_str == "bigint":
                iceberg_type = LongType()
            elif type_str in ["int", "integer"]:
                iceberg_type = IntegerType()
            elif type_str == "double":
                iceberg_type = DoubleType()
            elif type_str == "boolean":
                iceberg_type = BooleanType()
            elif type_str == "timestamp":
                iceberg_type = TimestampType()
            elif type_str == "date":
                iceberg_type = DateType()
            elif type_str == "decimal":
                iceberg_type = DecimalType(precision=10, scale=2)  # Default precision/scale
            else:
                # Default to string for unknown types
                iceberg_type = StringType()
                logger.warning(f"Unknown type '{type_str}' for column '{name}', defaulting to string")
            
            field = NestedField(
                field_id=field_id,
                name=name,
                field_type=iceberg_type,
                required=not nullable
            )
            fields.append(field)
        
        return Schema(*fields)
    
    def ingest_data_to_table(
        self,
        namespace: str,
        table_name: str,
        data: List[Dict[str, Any]],
        validate_schema: bool = True
    ) -> Dict[str, Any]:
        """Ingest data into an existing Iceberg table"""
        try:
            catalog = self.iceberg_service._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            table = catalog.load_table(table_identifier)
            
            if validate_schema:
                # Validate data against table schema
                self._validate_data_against_schema(data, table.schema())
            
            # Convert data to PyArrow format and append
            import pyarrow as pa
            
            # Convert data to PyArrow table
            arrow_table = pa.Table.from_pylist(data)
            
            # Append data to Iceberg table
            table.append(arrow_table)
            
            logger.info(f"Ingested {len(data)} rows into table '{table_identifier}'")
            
            return {
                "table_identifier": table_identifier,
                "rows_ingested": len(data),
                "message": f"Successfully ingested {len(data)} rows into '{table_identifier}'"
            }
            
        except Exception as e:
            logger.error(f"Error ingesting data into table {namespace}.{table_name}: {e}")
            raise
    
    def _validate_data_against_schema(self, data: List[Dict[str, Any]], schema: Schema):
        """Validate data against table schema"""
        if not data:
            return
        
        schema_fields = {field.name: field for field in schema.fields}
        sample_row = data[0]
        
        # Check for missing required fields
        for field in schema.fields:
            if field.required and field.name not in sample_row:
                raise ValueError(f"Required field '{field.name}' is missing from data")
        
        # Check for extra fields not in schema
        for key in sample_row.keys():
            if key not in schema_fields:
                logger.warning(f"Data contains field '{key}' not in table schema")
    
    def create_table_from_parquet(
        self,
        namespace: str,
        table_name: str,
        bucket: str,
        parquet_path: str,
        base_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create an Iceberg table from Parquet files with flexible path handling"""
        try:
            # Build the full path dynamically
            if base_path:
                full_path = f"{base_path.rstrip('/')}/{parquet_path.lstrip('/')}"
            else:
                full_path = parquet_path.lstrip('/')
            
            # Log the path being used
            logger.info(f"Creating table {namespace}.{table_name} from path: s3://{bucket}/{full_path}")
            
            # Use the existing create_table_from_parquet method from iceberg_service
            result = self.iceberg_service.create_table_from_parquet(
                namespace=namespace,
                table_name=table_name,
                bucket=bucket,
                parquet_path=full_path
            )
            
            logger.info(f"Successfully created table {namespace}.{table_name} at location: {result.get('location', 'unknown')}")
            
            return result
            
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
