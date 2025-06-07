from pyiceberg.catalog.sql import SqlCatalog
from pyiceberg.exceptions import NoSuchTableError, NoSuchNamespaceError
from pyiceberg.schema import Schema
from pyiceberg.types import (
    NestedField, StringType, IntegerType, FloatType, BooleanType, 
    TimestampType, DateType, LongType
)
from pyiceberg.table import Table
from pyiceberg.partitioning import PartitionSpec
import pandas as pd
import logging
import os
from typing import Dict, Any, List, Optional
from minio.error import S3Error
from .vault_service import VaultService
from .minio_service import MinioService

logger = logging.getLogger(__name__)

class IcebergServiceError(Exception):
    """Custom exception for Iceberg service errors"""
    pass

class IcebergService:
    def __init__(self):
        self.vault = VaultService()
        self.minio_service = MinioService()
        self._catalog = None
        
    def _get_catalog(self):
        """Initialize and return Iceberg SQL catalog"""
        if self._catalog is None:
            access_key, secret_key = self.vault.get_minio_creds()

            # Use SQL catalog with PostgreSQL backend
            postgres_host = os.environ.get("POSTGRES_HOST", "postgres")
            postgres_port = os.environ.get("POSTGRES_PORT", "5432")
            postgres_user = os.environ.get("POSTGRES_USER", "postgres")
            postgres_password = os.environ.get("POSTGRES_PASSWORD", "postgres")
            postgres_db = os.environ.get("POSTGRES_DB", "spark_rapids")
            
            catalog_config = {
                "uri": f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}",
                "warehouse": f"s3://iceberg-warehouse/",
                "s3.endpoint": f"https://{os.environ.get('MINIO_ENDPOINT', 'minio')}:{os.environ.get('MINIO_PORT', '9000')}",
                "s3.access-key-id": access_key,
                "s3.secret-access-key": secret_key,
                "s3.path-style-access": "true",
                "s3.region": "us-east-1"  # Required for MinIO
            }
            
            self._catalog = SqlCatalog("sql_catalog", **catalog_config)
        
        return self._catalog
    
    def _log_and_raise_error(self, operation: str, error: Exception, namespace: str = None, table: str = None):
        """Standardized error logging and raising"""
        context = f"namespace '{namespace}'" if namespace else ""
        if table:
            context += f", table '{table}'" if context else f"table '{table}'"
        
        error_msg = f"Error {operation}"
        if context:
            error_msg += f" for {context}"
        error_msg += f": {str(error)}"
        
        logger.error(error_msg)
        raise IcebergServiceError(error_msg) from error
    
    def _ensure_bucket_exists(self, bucket_name: str) -> bool:
        """Ensure the MinIO bucket exists, create it if not"""
        try:
            if not self.minio_service.client.bucket_exists(bucket_name):
                logger.info(f"Creating bucket: {bucket_name}")
                self.minio_service.client.make_bucket(bucket_name)
                self.minio_service._create_placeholder_file(bucket_name)
                self._set_bucket_policy(bucket_name)
                logger.info(f"Successfully created bucket: {bucket_name}")
            else:
                logger.info(f"Bucket {bucket_name} already exists")
            return True
            
        except S3Error as e:
            self._log_and_raise_error("ensuring bucket exists", e)
        except Exception as e:
            self._log_and_raise_error("ensuring bucket exists (unexpected error)", e)
    
    def _set_bucket_policy(self, bucket_name: str):
        """Set bucket policy for Iceberg operations"""
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "*"},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                },
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "*"},
                    "Action": ["s3:ListBucket"],
                    "Resource": [f"arn:aws:s3:::{bucket_name}"]
                }
            ]
        }
        
        try:
            import json
            self.minio_service.client.set_bucket_policy(bucket_name, json.dumps(policy))
            logger.info(f"Set bucket policy for {bucket_name}")
        except Exception as e:
            logger.warning(f"Could not set bucket policy for {bucket_name}: {e}")
    
    def list_namespaces(self) -> List[str]:
        """List all namespaces in the catalog"""
        try:
            catalog = self._get_catalog()
            return [".".join(ns) for ns in catalog.list_namespaces()]
        except Exception as e:
            self._log_and_raise_error("listing namespaces", e)
    
    def create_namespace(self, namespace: str, properties: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Create a new namespace with bucket management"""
        try:
            catalog = self._get_catalog()
            
            # Check if namespace already exists
            existing_namespaces = [".".join(ns) for ns in catalog.list_namespaces()]
            if namespace in existing_namespaces:
                raise IcebergServiceError(f"Namespace '{namespace}' already exists")

            # Ensure the iceberg-warehouse bucket exists
            self._ensure_bucket_exists("iceberg-warehouse")
            
            # Validate properties
            self._validate_namespace_properties(properties)
            
            # Set default location if not provided
            if not properties.get('location') or properties.get('location').strip() == '':
                properties['location'] = f's3://iceberg-warehouse/{namespace}/'
                logger.info(f"Using default location for namespace '{namespace}': {properties['location']}")
            
            # Create the namespace with properties
            catalog.create_namespace(namespace, properties)
            self._create_namespace_readme(namespace, properties)
            
            logger.info(f"Created namespace '{namespace}' with location: {properties['location']}")

            return {
                "namespace": namespace,
                "properties": properties,
                "bucket_created": True,
                "location": properties['location'],
                "message": f"Namespace '{namespace}' created successfully at {properties['location']}"
            }
            
        except IcebergServiceError:
            raise
        except Exception as e:
            self._log_and_raise_error("creating namespace", e, namespace)
    
    def _validate_namespace_properties(self, properties: Optional[Dict[str, str]]):
        """Validate namespace properties"""
        required_props = ['owner', 'description', 'pii_classification']
        if not properties:
            raise IcebergServiceError(f"Properties are required. Missing: {', '.join(required_props)}")
        
        missing_props = [prop for prop in required_props if not properties.get(prop)]
        if missing_props:
            raise IcebergServiceError(f"Missing required properties: {', '.join(missing_props)}")
        
        valid_pii_classifications = ['public', 'internal', 'confidential', 'restricted']
        if properties.get('pii_classification') not in valid_pii_classifications:
            raise IcebergServiceError(f"Invalid PII classification. Must be one of: {', '.join(valid_pii_classifications)}")
    
    def _create_namespace_readme(self, namespace: str, properties: Dict[str, str]):
        """Create README.md for namespace"""
        namespace_path = f"{namespace}/"
        readme_content = f"""# {namespace} Namespace

**Description:** {properties.get('description', 'No description provided')}
**Owner(s):** {properties.get('owner', 'Not specified')}
**PII Classification:** {properties.get('pii_classification', 'Not specified')}
**Retention Policy:** {properties.get('retention_policy', 'Not specified')}
**Location:** {properties.get('location')}

## Purpose
This namespace contains Iceberg tables for {namespace} data.

## Data Governance
- **Created:** {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
- **Classification:** {properties.get('pii_classification', 'Not specified')}
- **Retention:** {properties.get('retention_policy', 'Not specified')}

## Tables
Tables will be listed here as they are created within this namespace.
"""
        
        try:
            import io
            content_stream = io.BytesIO(readme_content.encode('utf-8'))
            
            self.minio_service.client.put_object(
                bucket_name="iceberg-warehouse",
                object_name=f"{namespace_path}README.md",
                data=content_stream,
                length=len(readme_content.encode('utf-8')),
                content_type="text/markdown"
            )
            
            logger.info(f"Created README.md for namespace '{namespace}' at path: iceberg-warehouse/{namespace_path}README.md")
            
        except Exception as e:
            logger.warning(f"Could not create README.md for namespace {namespace}: {e}")
    
    def delete_namespace(self, namespace: str) -> Dict[str, Any]:
        """Delete a namespace (must be empty)"""
        try:
            catalog = self._get_catalog()
            
            # Check if namespace exists
            existing_namespaces = [".".join(ns) for ns in catalog.list_namespaces()]
            if namespace not in existing_namespaces:
                raise IcebergServiceError(f"Namespace '{namespace}' does not exist")
            
            # Check if namespace has tables
            tables = catalog.list_tables(namespace)
            if tables:
                raise IcebergServiceError(f"Cannot delete namespace '{namespace}': contains {len(tables)} tables")
            
            # Drop the namespace
            catalog.drop_namespace(namespace)
            logger.info(f"Deleted namespace '{namespace}' (bucket preserved)")
            
            return {
                "namespace": namespace,
                "message": f"Namespace '{namespace}' deleted successfully (bucket preserved)"
            }
            
        except IcebergServiceError:
            raise
        except Exception as e:
            self._log_and_raise_error("deleting namespace", e, namespace)
    
    def get_namespace_properties(self, namespace: str) -> Dict[str, Any]:
        """Get namespace properties"""
        try:
            catalog = self._get_catalog()
            
            # Check if namespace exists
            existing_namespaces = [".".join(ns) for ns in catalog.list_namespaces()]
            if namespace not in existing_namespaces:
                raise IcebergServiceError(f"Namespace '{namespace}' does not exist")
            
            # Get namespace properties
            properties = catalog.load_namespace_properties(namespace)
            tables = catalog.list_tables(namespace)
            
            return {
                "namespace": namespace,
                "properties": properties,
                "table_count": len(tables),
                "tables": [str(table) for table in tables]
            }
            
        except IcebergServiceError:
            raise
        except Exception as e:
            self._log_and_raise_error("getting namespace properties", e, namespace)
    
    def update_namespace_properties(self, namespace: str, properties: Dict[str, str]) -> Dict[str, Any]:
        """Update namespace properties"""
        try:
            catalog = self._get_catalog()
            
            # Check if namespace exists
            existing_namespaces = [".".join(ns) for ns in catalog.list_namespaces()]
            if namespace not in existing_namespaces:
                raise IcebergServiceError(f"Namespace '{namespace}' does not exist")
            
            # Get current properties first
            current_properties = catalog.load_namespace_properties(namespace)
            logger.info(f"Current properties for {namespace}: {current_properties}")
            logger.info(f"New properties to update: {properties}")
            
            # Validate PII classification if provided
            if 'pii_classification' in properties and properties['pii_classification']:
                valid_pii_classifications = ['public', 'internal', 'confidential', 'restricted']
                if properties['pii_classification'] not in valid_pii_classifications:
                    raise IcebergServiceError(f"Invalid PII classification. Must be one of: {', '.join(valid_pii_classifications)}")
            
            # Prepare updates - only include non-empty properties
            removals = set()
            updates = {key: str(value).strip() for key, value in properties.items() 
                      if value is not None and str(value).strip()}
            
            logger.info(f"Properties to update: {updates}")
            
            # Update properties using the correct PyIceberg API
            catalog.update_namespace_properties(namespace, removals, updates)
            
            # Get updated properties to return
            updated_properties = catalog.load_namespace_properties(namespace)
            
            return {
                "namespace": namespace,
                "properties": updated_properties,
                "message": f"Namespace '{namespace}' properties updated successfully"
            }
            
        except IcebergServiceError:
            raise
        except Exception as e:
            self._log_and_raise_error("updating namespace properties", e, namespace)
    
    def list_tables(self, namespace: str = "default") -> Dict[str, Any]:
        """List all tables in a namespace"""
        try:
            catalog = self._get_catalog()
            
            # Log catalog information
            logger.info(f"Catalog type: {type(catalog)}")
            logger.info(f"Catalog class: {catalog.__class__}")
            
            # Convert namespace string to tuple format that PyIceberg expects
            if isinstance(namespace, str):
                namespace_tuple = tuple(namespace.split('.')) if '.' in namespace else (namespace,)
            else:
                namespace_tuple = namespace
            
            logger.info(f"Input namespace: '{namespace}' (type: {type(namespace)})")
            logger.info(f"Namespace tuple: {namespace_tuple} (type: {type(namespace_tuple)})")
            
            # Get tables from catalog with detailed logging
            logger.info(f"Calling catalog.list_tables() with namespace_tuple: {namespace_tuple}")
            tables = catalog.list_tables(namespace_tuple)
            
            # Log what we got back
            logger.info(f"Raw tables result type: {type(tables)}")
            logger.info(f"Raw tables result: {tables}")
            logger.info(f"Raw tables result length: {len(tables) if hasattr(tables, '__len__') else 'No length'}")
            
            # Handle empty tables case
            if not tables:
                logger.info(f"No tables found in namespace '{namespace}'")
                return {"tables": []}
            
            # Extract table names - handle different return formats
            table_names = []
            for i, table in enumerate(tables):
                try:
                    logger.info(f"Processing table {i}: {table} (type: {type(table)})")
                    table_name = None
                    
                    if isinstance(table, tuple):
                        logger.info(f"Table {i} is tuple with {len(table)} elements: {table}")
                        # If it's a tuple, take the last element (table name)
                        table_name = str(table[-1])
                        logger.info(f"Extracted from tuple: '{table_name}'")
                    elif isinstance(table, str):
                        logger.info(f"Table {i} is string: '{table}'")
                        # If it's a string, extract table name
                        table_name = table.split('.')[-1]
                        logger.info(f"Extracted from string: '{table_name}'")
                    elif isinstance(table, dict):
                        logger.info(f"Table {i} is dict: {table}")
                        # Handle dict case - this might be causing the issue
                        if 'name' in table:
                            table_name = str(table['name']).split('.')[-1]
                        elif 'identifier' in table:
                            table_name = str(table['identifier']).split('.')[-1]
                        else:
                            logger.warning(f"Dict table {i} has no 'name' or 'identifier' key: {table.keys()}")
                            continue
                        logger.info(f"Extracted from dict: '{table_name}'")
                    elif hasattr(table, 'name'):
                        logger.info(f"Table {i} has name attribute: {table.name}")
                        # If it has a name attribute
                        table_name = str(table.name).split('.')[-1]
                        logger.info(f"Extracted from name attribute: '{table_name}'")
                    elif hasattr(table, '__str__'):
                        logger.info(f"Table {i} converting to string: {str(table)}")
                        # Fallback - convert to string and extract last part
                        table_name = str(table).split('.')[-1]
                        logger.info(f"Extracted from string conversion: '{table_name}'")
                    else:
                        logger.warning(f"Unknown table identifier format: {type(table)} - {table}")
                        continue
                    
                    # Only add if it's a valid non-empty string
                    if table_name and isinstance(table_name, str) and table_name.strip():
                        logger.info(f"Adding table name: '{table_name.strip()}'")
                        table_names.append(table_name.strip())
                    else:
                        logger.warning(f"Invalid table name extracted: '{table_name}' (type: {type(table_name)})")
                        
                except Exception as e:
                    logger.error(f"Error processing table identifier {table}: {e}", exc_info=True)
                    continue
            
            # Remove duplicates and sort - ensure we return strings only
            table_names = sorted(list(set(str(name) for name in table_names if isinstance(name, str))))
            
            logger.info(f"Final table names: {table_names}")
            logger.info(f"Successfully listed {len(table_names)} tables in namespace '{namespace}': {table_names}")
            
            result = {"tables": table_names}
            logger.info(f"Returning result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Exception in list_tables: {e}", exc_info=True)
            self._log_and_raise_error("listing tables", e, namespace)
    
    def create_table_from_csv(
        self, 
        namespace: str, 
        table_name: str, 
        bucket: str, 
        csv_path: str,
        base_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create an Iceberg table from CSV files in MinIO"""
        try:
            catalog = self._get_catalog()
            
            # Ensure namespace exists
            try:
                catalog.create_namespace(namespace)
            except Exception:
                pass  # Namespace might already exist
            
            # Read sample CSV to infer schema
            full_path = f"{base_path}/{csv_path}" if base_path else csv_path
            objects = list(self.minio_service.client.list_objects(bucket, prefix=full_path))
            
            if not objects:
                raise IcebergServiceError(f"No CSV files found at {full_path}")
            
            # Read first CSV file to infer schema
            first_file = objects[0].object_name
            response = self.minio_service.client.get_object(bucket, first_file)
            df_sample = pd.read_csv(response, nrows=100)
            
            # Convert pandas schema to Iceberg schema
            schema = self._pandas_to_iceberg_schema(df_sample)
            
            # Create table identifier
            table_identifier = f"{namespace}.{table_name}"
            
            # Create the table
            table = catalog.create_table(
                identifier=table_identifier,
                schema=schema,
                location=f"s3://{bucket}/{full_path}"
            )
            
            # Load all CSV data into the table
            all_data = []
            for obj in objects:
                if obj.object_name.endswith('.csv'):
                    response = self.minio_service.client.get_object(bucket, obj.object_name)
                    df = pd.read_csv(response)
                    all_data.append(df)
            
            row_count = 0
            if all_data:
                combined_df = pd.concat(all_data, ignore_index=True)
                row_count = len(combined_df)
                table.append(combined_df)
            
            return {
                "table_identifier": table_identifier,
                "schema": self._iceberg_schema_to_dict(schema),
                "location": table.location(),
                "row_count": row_count
            }
            
        except IcebergServiceError:
            raise
        except Exception as e:
            self._log_and_raise_error("creating table from CSV", e, namespace, table_name)

    def create_table_from_parquet(
        self, 
        namespace: str, 
        table_name: str, 
        bucket: str, 
        parquet_path: str
    ) -> Dict[str, Any]:
        """Create an Iceberg table from Parquet files in MinIO"""
        try:
            catalog = self._get_catalog()
            
            # Ensure namespace exists
            try:
                catalog.create_namespace(namespace)
                logger.info(f"Created namespace {namespace}")
            except Exception as e:
                logger.info(f"Namespace {namespace} already exists or creation failed: {e}")
            
            # Clean and normalize the parquet path
            parquet_path = parquet_path.strip('/')
            
            # Check if parquet files exist at the specified path
            objects = list(self.minio_service.client.list_objects(bucket, prefix=parquet_path))
            
            if not objects:
                # Try to find parquet files in the directory
                directory_path = parquet_path + '/'
                objects = list(self.minio_service.client.list_objects(bucket, prefix=directory_path))
                objects = [obj for obj in objects if obj.object_name.endswith('.parquet')]
            
            if not objects:
                raise IcebergServiceError(f"No Parquet files found at {parquet_path}")
            
            logger.info(f"Found {len(objects)} objects at path {parquet_path}")
            
            # Read first Parquet file to infer schema
            first_file = None
            for obj in objects:
                if obj.object_name.endswith('.parquet'):
                    first_file = obj.object_name
                    break
            
            if not first_file:
                raise IcebergServiceError(f"No Parquet files found in the specified path: {parquet_path}")
            
            logger.info(f"Using {first_file} to infer schema")
            
            # Read parquet file using pandas
            import pandas as pd
            import io
            
            response = self.minio_service.client.get_object(bucket, first_file)
            parquet_data = response.read()
            df_sample = pd.read_parquet(io.BytesIO(parquet_data))
            
            logger.info(f"Sample DataFrame shape: {df_sample.shape}")
            logger.info(f"Sample DataFrame columns: {list(df_sample.columns)}")
            
            # Convert pandas schema to Iceberg schema
            schema = self._pandas_to_iceberg_schema(df_sample)
            
            # Create table identifier
            table_identifier = f"{namespace}.{table_name}"
            
            # Set table location in the bucket - fix double slash issue
            table_location = f"s3://{bucket}/{namespace}/{table_name}"
            
            logger.info(f"Creating table {table_identifier} at location {table_location}")
            
            # Create the table
            table = catalog.create_table(
                identifier=table_identifier,
                schema=schema,
                location=table_location
            )
            
            # Load all Parquet data into the table
            all_data = []
            for obj in objects:
                if obj.object_name.endswith('.parquet'):
                    logger.info(f"Loading data from {obj.object_name}")
                    response = self.minio_service.client.get_object(bucket, obj.object_name)
                    parquet_data = response.read()
                    df = pd.read_parquet(io.BytesIO(parquet_data))
                    all_data.append(df)
            
            total_rows = 0
            if all_data:
                combined_df = pd.concat(all_data, ignore_index=True)
                total_rows = len(combined_df)
                logger.info(f"Appending {total_rows} rows to table {table_identifier}")
                table.append(combined_df)
            
            logger.info(f"Successfully created table {table_identifier} with {total_rows} rows")
            
            return {
                "table_identifier": table_identifier,
                "schema": self._iceberg_schema_to_dict(schema),
                "location": table.location(),
                "row_count": total_rows,
                "source_files": len([obj for obj in objects if obj.object_name.endswith('.parquet')])
            }
            
        except IcebergServiceError:
            raise
        except Exception as e:
            self._log_and_raise_error("creating table from Parquet", e, namespace, table_name)
    
    def get_table_info(self, namespace: str, table_name: str) -> Dict[str, Any]:
        """Get detailed information about an Iceberg table"""
        try:
            catalog = self._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            table = catalog.load_table(table_identifier)
            
            return {
                "identifier": table_identifier,
                "schema": self._iceberg_schema_to_dict(table.schema()),
                "location": table.location(),
                "snapshot_id": table.current_snapshot().snapshot_id if table.current_snapshot() else None,
                "metadata_location": table.metadata_location
            }
        except NoSuchTableError:
            raise IcebergServiceError(f"Table {namespace}.{table_name} not found")
        except Exception as e:
            self._log_and_raise_error("getting table info", e, namespace, table_name)
    
    def query_table(
        self, 
        namespace: str, 
        table_name: str, 
        limit: int = 100,
        columns: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Query an Iceberg table and return sample data"""
        try:
            catalog = self._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            table = catalog.load_table(table_identifier)
            
            # Convert to pandas for easier manipulation
            df = table.scan(limit=limit).to_pandas()
            
            if columns:
                df = df[columns]
            
            return {
                "columns": [{"name": col, "type": str(df[col].dtype)} for col in df.columns],
                "sample_data": df.to_dict(orient="records"),
                "total_rows": len(df)
            }
            
        except Exception as e:
            self._log_and_raise_error("querying table", e, namespace, table_name)
    
    def _pandas_to_iceberg_schema(self, df: pd.DataFrame) -> Schema:
        """Convert pandas DataFrame schema to Iceberg schema"""
        fields = []
        field_id = 1
        
        for col_name, dtype in df.dtypes.items():
            if pd.api.types.is_integer_dtype(dtype):
                iceberg_type = LongType()
            elif pd.api.types.is_float_dtype(dtype):
                iceberg_type = FloatType()
            elif pd.api.types.is_bool_dtype(dtype):
                iceberg_type = BooleanType()
            elif pd.api.types.is_datetime64_any_dtype(dtype):
                iceberg_type = TimestampType()
            else:
                iceberg_type = StringType()
            
            fields.append(NestedField(
                field_id=field_id,
                name=col_name,
                field_type=iceberg_type,
                required=not df[col_name].isnull().any()
            ))
            field_id += 1
        
        return Schema(*fields)
    
    def _iceberg_schema_to_dict(self, schema: Schema) -> Dict[str, Any]:
        """Convert Iceberg schema to dictionary representation"""
        columns = []
        for field in schema.fields:
            columns.append({
                "name": field.name,
                "type": str(field.field_type),
                "nullable": not field.required,
                "field_id": field.field_id
            })
        
        return {"columns": columns}
    
    def evolve_schema(
        self, 
        namespace: str, 
        table_name: str, 
        schema_changes: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evolve the schema of an Iceberg table"""
        try:
            catalog = self._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            table = catalog.load_table(table_identifier)
            
            # Apply schema evolution based on changes
            # This is a simplified implementation - in practice, you'd want more sophisticated schema evolution
            with table.update_schema() as update:
                for change in schema_changes.get("add_columns", []):
                    update.add_column(change["name"], change["type"])
                
                for change in schema_changes.get("rename_columns", []):
                    update.rename_column(change["old_name"], change["new_name"])
            
            return {
                "table_identifier": table_identifier,
                "new_schema": self._iceberg_schema_to_dict(table.schema()),
                "message": "Schema evolved successfully"
            }
            
        except Exception as e:
            self._log_and_raise_error("evolving schema", e, namespace, table_name)
