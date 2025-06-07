
from .iceberg_service import IcebergService
from typing import Dict, Any, List, Optional
import logging
import os
from pyiceberg.schema import Schema
from pyiceberg.types import (
    NestedField, StringType, LongType, IntegerType, DoubleType, 
    BooleanType, TimestampType, DateType, DecimalType
)
import pyarrow as pa
import pyarrow.parquet as pq
from .vault_service import VaultService

logger = logging.getLogger(__name__)

class IcebergTableService:
    """Service for managing Iceberg tables specifically"""
    
    def __init__(self):
        self.iceberg_service = IcebergService()
        self.vault_service = VaultService()
    
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
        """Create an Iceberg table from Parquet files with proper metadata creation"""
        try:
            # Build the full path dynamically
            if base_path:
                full_path = f"{base_path.rstrip('/')}/{parquet_path.lstrip('/')}"
            else:
                full_path = parquet_path.lstrip('/')
            
            # Build the S3 path for reading Parquet
            s3_parquet_path = f"s3://{bucket}/{full_path}"
            
            logger.info(f"Creating table {namespace}.{table_name} from Parquet path: {s3_parquet_path}")
            
            # Get MinIO-configured filesystem
            filesystem = self._get_s3_filesystem()
            
            # Read the Parquet schema to understand the data structure
            try:
                # Try to read a sample to get schema
                parquet_table = pq.read_table(s3_parquet_path, filesystem=filesystem)
                arrow_schema = parquet_table.schema
                logger.info(f"Successfully read Parquet schema with {len(arrow_schema)} columns")
            except Exception as schema_error:
                logger.error(f"Failed to read Parquet schema: {schema_error}")
                # If we can't read the Parquet file, try to handle different path patterns
                return self._handle_parquet_path_discovery(namespace, table_name, bucket, full_path)
            
            # Convert PyArrow schema to Iceberg schema
            iceberg_schema = self._convert_arrow_schema_to_iceberg(arrow_schema)
            
            # Create the table location
            table_location = f"s3://{bucket}/{namespace}/{table_name}/"
            
            catalog = self.iceberg_service._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            
            # Create the Iceberg table with the inferred schema
            table = catalog.create_table(
                identifier=table_identifier,
                schema=iceberg_schema,
                location=table_location
            )
            
            logger.info(f"Created Iceberg table '{table_identifier}' at location: {table_location}")
            
            # Now load the Parquet data into the table
            table.append(parquet_table)
            
            logger.info(f"Successfully loaded Parquet data into table '{table_identifier}'")
            
            return {
                "table_identifier": table_identifier,
                "location": table_location,
                "schema": self.iceberg_service._iceberg_schema_to_dict(iceberg_schema),
                "parquet_source": s3_parquet_path,
                "rows_loaded": len(parquet_table),
                "message": f"Table '{table_identifier}' created successfully from Parquet data"
            }
            
        except Exception as e:
            logger.error(f"Error creating table from Parquet: {e}")
            raise
    
    def _get_s3_filesystem(self):
        """Get S3 filesystem configured for MinIO operations"""
        import pyarrow.fs as fs
        
        # Get MinIO credentials from Vault
        access_key, secret_key = self.vault_service.get_minio_creds()
        
        # Get MinIO endpoint from environment
        minio_endpoint = f"{os.environ.get('MINIO_ENDPOINT', 'localhost')}:{os.environ.get('MINIO_PORT', '9000')}"
        
        # Configure S3FileSystem for MinIO
        return fs.S3FileSystem(
            "access_key": access_key,
            "secret_key": secret_key,
            "endpoint_override"=f"https://{minio_endpoint}",
            "scheme": "http",
            "allow_bucket_creation": True,
        )
    
    def _handle_parquet_path_discovery(self, namespace: str, table_name: str, bucket: str, path: str) -> Dict[str, Any]:
        """Handle discovery of Parquet files when direct path access fails"""
        try:
            filesystem = self._get_s3_filesystem()
            
            # Try to list files in the path
            if path.endswith('/'):
                # Directory path - look for .parquet files
                try:
                    file_info = filesystem.get_file_info(f"{bucket}/{path}")
                    if file_info.type == fs.FileType.Directory:
                        files = filesystem.get_file_info(fs.FileSelector(f"{bucket}/{path}", recursive=True))
                        parquet_files = [f.path for f in files if f.path.endswith('.parquet')]
                        
                        if parquet_files:
                            # Use the first Parquet file to get schema
                            first_file = f"s3://{parquet_files[0]}"
                            parquet_table = pq.read_table(first_file, filesystem=filesystem)
                            return self._create_table_from_discovered_files(
                                namespace, table_name, bucket, parquet_files, parquet_table
                            )
                except Exception as e:
                    logger.warning(f"Directory listing failed: {e}")
            
            # If all else fails, create an empty table and let user load data later
            raise FileNotFoundError(f"Could not find or access Parquet files at path: s3://{bucket}/{path}")
            
        except Exception as e:
            logger.error(f"Error in Parquet path discovery: {e}")
            raise
    
    def _create_table_from_discovered_files(
        self, 
        namespace: str, 
        table_name: str, 
        bucket: str, 
        parquet_files: List[str], 
        sample_table: pa.Table
    ) -> Dict[str, Any]:
        """Create Iceberg table from discovered Parquet files"""
        try:
            # Convert schema
            iceberg_schema = self._convert_arrow_schema_to_iceberg(sample_table.schema)
            
            # Create table
            table_location = f"s3://{bucket}/{namespace}/{table_name}/"
            catalog = self.iceberg_service._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            
            table = catalog.create_table(
                identifier=table_identifier,
                schema=iceberg_schema,
                location=table_location
            )
            
            # Load data from all discovered files
            total_rows = 0
            filesystem = self._get_s3_filesystem()
            
            for file_path in parquet_files:
                file_table = pq.read_table(f"s3://{file_path}", filesystem=filesystem)
                table.append(file_table)
                total_rows += len(file_table)
            
            return {
                "table_identifier": table_identifier,
                "location": table_location,
                "schema": self.iceberg_service._iceberg_schema_to_dict(iceberg_schema),
                "parquet_files": parquet_files,
                "total_rows": total_rows,
                "message": f"Table '{table_identifier}' created from {len(parquet_files)} Parquet files"
            }
            
        except Exception as e:
            logger.error(f"Error creating table from discovered files: {e}")
            raise
    
    def _convert_arrow_schema_to_iceberg(self, arrow_schema: pa.Schema) -> Schema:
        """Convert PyArrow schema to Iceberg schema"""
        fields = []
        
        for i, field in enumerate(arrow_schema):
            field_id = i + 1
            name = field.name
            arrow_type = field.type
            nullable = field.nullable
            
            # Convert PyArrow types to Iceberg types
            if pa.types.is_string(arrow_type) or pa.types.is_large_string(arrow_type):
                iceberg_type = StringType()
            elif pa.types.is_integer(arrow_type):
                if arrow_type.bit_width <= 32:
                    iceberg_type = IntegerType()
                else:
                    iceberg_type = LongType()
            elif pa.types.is_floating(arrow_type):
                iceberg_type = DoubleType()
            elif pa.types.is_boolean(arrow_type):
                iceberg_type = BooleanType()
            elif pa.types.is_timestamp(arrow_type):
                iceberg_type = TimestampType()
            elif pa.types.is_date(arrow_type):
                iceberg_type = DateType()
            elif pa.types.is_decimal(arrow_type):
                iceberg_type = DecimalType(precision=arrow_type.precision, scale=arrow_type.scale)
            else:
                # Default to string for unknown types
                iceberg_type = StringType()
                logger.warning(f"Unknown PyArrow type '{arrow_type}' for field '{name}', defaulting to string")
            
            iceberg_field = NestedField(
                field_id=field_id,
                name=name,
                field_type=iceberg_type,
                required=not nullable
            )
            fields.append(iceberg_field)
        
        return Schema(*fields)
    
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
