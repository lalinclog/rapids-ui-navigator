
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
import pyarrow.fs as fs
from .vault_service import VaultService
import time

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
            
            logger.info(f"Creating table {namespace}.{table_name} from Parquet path: {bucket}/{full_path}")
            
            # Get MinIO-configured filesystem with logging
            filesystem = self._get_s3_filesystem()
            
            # Test filesystem connectivity with enhanced debugging
            logger.info(f"Testing filesystem connectivity to bucket: {bucket}")
            
            # Try multiple connection tests
            connection_success = self._test_minio_connection(filesystem, bucket, full_path)
            
            if not connection_success:
                logger.error("Failed all connection tests to MinIO")
                raise ConnectionError("Unable to establish connection to MinIO storage")
            
            # Read the Parquet schema to understand the data structure
            try:
                # Use bucket-relative path for PyArrow with custom filesystem
                bucket_relative_path = f"{bucket}/{full_path}"
                logger.info(f"Reading Parquet file with bucket-relative path: {bucket_relative_path}")
                
                # Try to read a sample to get schema
                parquet_table = pq.read_table(bucket_relative_path, filesystem=filesystem)
                arrow_schema = parquet_table.schema
                logger.info(f"Successfully read Parquet schema with {len(arrow_schema)} columns")
                logger.info(f"Parquet table contains {len(parquet_table)} rows")
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
                "parquet_source": f"s3://{bucket_relative_path}",
                "rows_loaded": len(parquet_table),
                "message": f"Table '{table_identifier}' created successfully from Parquet data"
            }
            
        except Exception as e:
            logger.error(f"Error creating table from Parquet: {e}")
            raise
    
    def _test_minio_connection(self, filesystem, bucket: str, full_path: str) -> bool:
        """Test MinIO connection with multiple approaches"""
        
        # Test 1: Simple bucket existence check
        logger.info("=== Connection Test 1: Basic bucket check ===")
        try:
            # Try a simpler approach first - just check if bucket exists
            bucket_info = filesystem.get_file_info(bucket)
            logger.info(f"Bucket info: type={bucket_info.type}, path={bucket_info.path}")
            
            if bucket_info.type == fs.FileType.Directory:
                logger.info(f"✓ Bucket '{bucket}' exists and is accessible")
            else:
                logger.warning(f"⚠ Bucket '{bucket}' may not exist or is not a directory")
                
        except Exception as bucket_error:
            logger.error(f"✗ Basic bucket check failed: {bucket_error}")
        
        # Test 2: Try listing with selector (more robust)
        logger.info("=== Connection Test 2: List with FileSelector ===")
        try:
            selector = fs.FileSelector(bucket, recursive=False)
            bucket_files = filesystem.get_file_info(selector)
            logger.info(f"✓ Successfully listed bucket contents using FileSelector")
            logger.info(f"Found {len(bucket_files)} items in bucket '{bucket}'")
            
            # Log first few items for debugging
            for i, file_info in enumerate(bucket_files[:5]):
                logger.info(f"  Item {i+1}: {file_info.path} (type: {file_info.type}, size: {file_info.size})")
            
            # Test 3: Check for the specific file
            logger.info("=== Connection Test 3: Specific file check ===")
            target_path = f"{bucket}/{full_path}"
            logger.info(f"Looking for specific file: {target_path}")
            
            file_info = filesystem.get_file_info(target_path)
            logger.info(f"File info for '{full_path}': type={file_info.type}, size={file_info.size}")
            
            if file_info.type == fs.FileType.File:
                logger.info(f"✓ Target file found: {target_path}")
                return True
            elif file_info.type == fs.FileType.NotFound:
                logger.warning(f"⚠ Target file not found: {target_path}")
                # Try to find similar files
                self._search_for_similar_files(filesystem, bucket, full_path)
                return False
            else:
                logger.warning(f"⚠ Target path exists but is not a file: {target_path}")
                return False
                
        except Exception as selector_error:
            logger.error(f"✗ FileSelector listing failed: {selector_error}")
            
            # Test 4: Alternative connection method
            logger.info("=== Connection Test 4: Alternative method ===")
            try:
                # Try using a different approach - get filesystem info
                fs_info = filesystem.get_file_info(f"{bucket}/")
                logger.info(f"Alternative bucket check: type={fs_info.type}")
                
                if fs_info.type == fs.FileType.Directory:
                    logger.info("✓ Alternative bucket check successful")
                    return True
                    
            except Exception as alt_error:
                logger.error(f"✗ Alternative connection method failed: {alt_error}")
        
        return False
    
    def _search_for_similar_files(self, filesystem, bucket: str, target_path: str):
        """Search for files similar to the target path"""
        try:
            # Try searching in parent directories
            path_parts = target_path.split('/')
            
            for i in range(len(path_parts)):
                search_path = '/'.join(path_parts[:i+1])
                logger.info(f"Searching in path: {bucket}/{search_path}")
                
                try:
                    search_selector = fs.FileSelector(f"{bucket}/{search_path}", recursive=False)
                    search_files = filesystem.get_file_info(search_selector)
                    
                    if search_files:
                        logger.info(f"Found {len(search_files)} items in {search_path}:")
                        for file_info in search_files[:10]:  # Limit to first 10
                            logger.info(f"  - {file_info.path} (type: {file_info.type})")
                        break
                    else:
                        logger.info(f"No items found in {search_path}")
                        
                except Exception as search_error:
                    logger.warning(f"Search failed for {search_path}: {search_error}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error in similar file search: {e}")
    
    def _get_s3_filesystem(self):
        """Get S3 filesystem configured for MinIO operations"""
        # Get MinIO credentials from Vault
        access_key, secret_key = self.vault_service.get_minio_creds()
        
        # Get MinIO endpoint from environment
        minio_endpoint = f"{os.environ.get('MINIO_ENDPOINT', 'localhost')}:{os.environ.get('MINIO_PORT', '9000')}"
        
        # Log connection details (without sensitive info)
        logger.info(f"Configuring S3 filesystem for MinIO")
        logger.info(f"MinIO endpoint: {minio_endpoint}")
        logger.info(f"Access key: {access_key[:10]}..." if access_key else "Access key: None")
        logger.info(f"Secret key configured: {'Yes' if secret_key else 'No'}")
        
        # Determine if we should use HTTPS
        use_https = os.environ.get('MINIO_USE_HTTPS', 'false').lower() == 'true'
        scheme = "https" if use_https else "http"
        endpoint_url = f"{scheme}://{minio_endpoint}"
        
        logger.info(f"Using scheme: {scheme}")
        logger.info(f"Full endpoint URL: {endpoint_url}")
        
        # Log environment variables for debugging
        logger.info(f"Environment check:")
        logger.info(f"  MINIO_ENDPOINT: {os.environ.get('MINIO_ENDPOINT', 'not set')}")
        logger.info(f"  MINIO_PORT: {os.environ.get('MINIO_PORT', 'not set')}")
        logger.info(f"  MINIO_USE_HTTPS: {os.environ.get('MINIO_USE_HTTPS', 'not set')}")
        
        try:
            # Configure S3FileSystem for MinIO with correct parameter names
            filesystem = fs.S3FileSystem(
                access_key=access_key,
                secret_key=secret_key,
                endpoint_override=endpoint_url,
                scheme=scheme
            )
            logger.info("S3FileSystem created successfully")
            return filesystem
        except Exception as fs_error:
            logger.error(f"Failed to create S3FileSystem: {fs_error}")
            raise

    # ... keep existing code (all remaining methods unchanged)
    
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
                            first_file = parquet_files[0]
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
                file_table = pq.read_table(file_path, filesystem=filesystem)
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
