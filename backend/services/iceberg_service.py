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
                "s3.endpoint": f"http://{os.environ.get('MINIO_ENDPOINT', 'minio')}:{os.environ.get('MINIO_PORT', '9000')}",
                "s3.access-key-id": access_key,
                "s3.secret-access-key": secret_key,
                "s3.path-style-access": "true",
                "s3.region": "us-east-1"  # Required for MinIO
            }
            
            self._catalog = SqlCatalog("sql_catalog", **catalog_config)
        
        return self._catalog
    
    def _ensure_bucket_exists(self, bucket_name: str) -> bool:
        """Ensure the MinIO bucket exists, create it if not"""
        try:
            if not self.minio_service.client.bucket_exists(bucket_name):
                logger.info(f"Creating bucket: {bucket_name}")
                self.minio_service.client.make_bucket(bucket_name)
                
                # Create placeholder file to make bucket visible
                self.minio_service._create_placeholder_file(bucket_name)
                
                # Set bucket policy for Iceberg operations
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
                
                logger.info(f"Successfully created bucket: {bucket_name}")
            else:
                logger.info(f"Bucket {bucket_name} already exists")
            return True
            
        except S3Error as e:
            logger.error(f"Error ensuring bucket {bucket_name} exists: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error with bucket {bucket_name}: {e}")
            return False
    
    def list_namespaces(self) -> List[str]:
        """List all namespaces in the catalog"""
        try:
            catalog = self._get_catalog()
            return [".".join(ns) for ns in catalog.list_namespaces()]
        except Exception as e:
            logger.error(f"Error listing namespaces: {e}")
            return []
    
    def create_namespace(self, namespace: str, properties: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Create a new namespace with bucket management"""
        try:
            catalog = self._get_catalog()
            
            # Check if namespace already exists
            existing_namespaces = [".".join(ns) for ns in catalog.list_namespaces()]
            if namespace in existing_namespaces:
                raise ValueError(f"Namespace '{namespace}' already exists")
            
            # Ensure the iceberg-warehouse bucket exists
            if not self._ensure_bucket_exists("iceberg-warehouse"):
                raise ValueError("Failed to create or access the iceberg-warehouse bucket")
            
            # Validate required properties
            required_props = ['owner', 'description', 'pii_classification']
            if properties:
                missing_props = [prop for prop in required_props if not properties.get(prop)]
                if missing_props:
                    raise ValueError(f"Missing required properties: {', '.join(missing_props)}")
            else:
                raise ValueError(f"Properties are required. Missing: {', '.join(required_props)}")
            
            # Validate PII classification values
            valid_pii_classifications = ['public', 'internal', 'confidential', 'restricted']
            if properties.get('pii_classification') not in valid_pii_classifications:
                raise ValueError(f"Invalid PII classification. Must be one of: {', '.join(valid_pii_classifications)}")
            
            # Set default location if not provided
            if 'location' not in properties:
                properties['location'] = f's3://iceberg-warehouse/{namespace}/'
            
            # Create the namespace with properties
            catalog.create_namespace(namespace, properties)
            
            logger.info(f"Created namespace '{namespace}' with bucket management")
            
            return {
                "namespace": namespace,
                "properties": properties,
                "bucket_created": True,
                "message": f"Namespace '{namespace}' and bucket created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error creating namespace {namespace}: {e}")
            raise
    
    def delete_namespace(self, namespace: str) -> Dict[str, Any]:
        """Delete a namespace (must be empty)"""
        try:
            catalog = self._get_catalog()
            
            # Check if namespace exists
            existing_namespaces = [".".join(ns) for ns in catalog.list_namespaces()]
            if namespace not in existing_namespaces:
                raise ValueError(f"Namespace '{namespace}' does not exist")
            
            # Check if namespace has tables
            tables = catalog.list_tables(namespace)
            if tables:
                raise ValueError(f"Cannot delete namespace '{namespace}': contains {len(tables)} tables")
            
            # Drop the namespace
            catalog.drop_namespace(namespace)
            
            # Note: We don't delete the bucket as it might contain other data
            # or be used by other applications
            logger.info(f"Deleted namespace '{namespace}' (bucket preserved)")
            
            return {
                "namespace": namespace,
                "message": f"Namespace '{namespace}' deleted successfully (bucket preserved)"
            }
            
        except Exception as e:
            logger.error(f"Error deleting namespace {namespace}: {e}")
            raise
    
    def get_namespace_properties(self, namespace: str) -> Dict[str, Any]:
        """Get namespace properties"""
        try:
            catalog = self._get_catalog()
            
            # Check if namespace exists
            existing_namespaces = [".".join(ns) for ns in catalog.list_namespaces()]
            if namespace not in existing_namespaces:
                raise ValueError(f"Namespace '{namespace}' does not exist")
            
            # Get namespace properties
            properties = catalog.load_namespace_properties(namespace)
            tables = catalog.list_tables(namespace)
            
            return {
                "namespace": namespace,
                "properties": properties,
                "table_count": len(tables),
                "tables": [str(table) for table in tables]
            }
            
        except Exception as e:
            logger.error(f"Error getting namespace properties for {namespace}: {e}")
            raise
    
    def update_namespace_properties(self, namespace: str, properties: Dict[str, str]) -> Dict[str, Any]:
        """Update namespace properties"""
        try:
            catalog = self._get_catalog()
            
            # Check if namespace exists
            existing_namespaces = [".".join(ns) for ns in catalog.list_namespaces()]
            if namespace not in existing_namespaces:
                raise ValueError(f"Namespace '{namespace}' does not exist")
            
            # Get current properties first
            current_properties = catalog.load_namespace_properties(namespace)
            logger.info(f"Current properties for {namespace}: {current_properties}")
            logger.info(f"New properties to update: {properties}")
            
            # Validate PII classification if provided
            if 'pii_classification' in properties and properties['pii_classification']:
                valid_pii_classifications = ['public', 'internal', 'confidential', 'restricted']
                if properties['pii_classification'] not in valid_pii_classifications:
                    raise ValueError(f"Invalid PII classification. Must be one of: {', '.join(valid_pii_classifications)}")
            
            # PyIceberg expects updates as a set of properties to remove and a dict of properties to update
            # We'll update all provided properties and remove none
            removals = set()  # Properties to remove (empty set means remove nothing)
            updates = {}
            
            # Only include non-empty properties in updates
            for key, value in properties.items():
                if value is not None and str(value).strip():  # Only add non-empty values
                    updates[key] = str(value).strip()
            
            logger.info(f"Properties to update: {updates}")
            logger.info(f"Properties to remove: {removals}")
            
            # Update properties using the correct PyIceberg API
            catalog.update_namespace_properties(namespace, removals, updates)
            
            # Get updated properties to return
            updated_properties = catalog.load_namespace_properties(namespace)
            
            return {
                "namespace": namespace,
                "properties": updated_properties,
                "message": f"Namespace '{namespace}' properties updated successfully"
            }
            
        except Exception as e:
            logger.error(f"Error updating namespace properties for {namespace}: {e}")
            raise
    
    def list_tables(self, namespace: str = "default") -> List[str]:
        """List all tables in a namespace"""
        try:
            catalog = self._get_catalog()
            return [str(table) for table in catalog.list_tables(namespace)]
        except Exception as e:
            logger.error(f"Error listing tables in namespace {namespace}: {e}")
            return []
    
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
                raise ValueError(f"No CSV files found at {full_path}")
            
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
            
            if all_data:
                combined_df = pd.concat(all_data, ignore_index=True)
                table.append(combined_df)
            
            return {
                "table_identifier": table_identifier,
                "schema": self._iceberg_schema_to_dict(schema),
                "location": table.location(),
                "row_count": len(combined_df) if all_data else 0
            }
            
        except Exception as e:
            logger.error(f"Error creating Iceberg table: {e}")
            raise
    
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
            raise ValueError(f"Table {namespace}.{table_name} not found")
        except Exception as e:
            logger.error(f"Error getting table info: {e}")
            raise
    
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
            logger.error(f"Error querying table: {e}")
            raise
    
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
            logger.error(f"Error evolving schema: {e}")
            raise
