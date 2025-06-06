
import logging
from typing import Dict, Any, List, Optional
import os
from pyiceberg.catalog import load_catalog
from pyiceberg.exceptions import NoSuchTableError, NoSuchNamespaceError
import pyarrow as pa
import pyarrow.parquet as pq
import pandas as pd

logger = logging.getLogger(__name__)

class IcebergService:
    """Service for managing Iceberg catalogs and tables"""
    
    def __init__(self):
        self.catalog_config = {
            'type': 'sql',
            'uri': os.getenv('POSTGRES_URL', 'postgresql://admin:password@localhost:5433/iceberg_catalog'),
            'warehouse': os.getenv('ICEBERG_WAREHOUSE', 's3://iceberg-warehouse'),
            's3.endpoint': os.getenv('MINIO_ENDPOINT', 'http://localhost:9000'),
            's3.access-key-id': os.getenv('MINIO_ACCESS_KEY', 'admin'),
            's3.secret-access-key': os.getenv('MINIO_SECRET_KEY', 'password'),
            's3.path-style-access': 'true'
        }
    
    def _get_catalog(self):
        """Get the Iceberg catalog instance"""
        try:
            return load_catalog("sql_catalog", **self.catalog_config)
        except Exception as e:
            logger.error(f"Failed to load catalog: {e}")
            raise
    
    def list_namespaces(self) -> List[str]:
        """List all namespaces in the catalog"""
        try:
            catalog = self._get_catalog()
            namespaces = catalog.list_namespaces()
            # Convert namespace tuples to strings
            return ['.'.join(ns) if isinstance(ns, tuple) else str(ns) for ns in namespaces]
        except Exception as e:
            logger.error(f"Error listing namespaces: {e}")
            raise
    
    def list_tables(self, namespace: str) -> List[str]:
        """List all tables in a namespace"""
        try:
            catalog = self._get_catalog()
            # Convert namespace string to tuple if needed
            namespace_tuple = tuple(namespace.split('.')) if '.' in namespace else (namespace,)
            
            tables = catalog.list_tables(namespace_tuple)
            # Extract table names from identifiers
            table_names = []
            for table in tables:
                if isinstance(table, tuple):
                    # Handle tuple format (namespace, table_name)
                    table_names.append(table[-1])  # Get the last part (table name)
                elif hasattr(table, 'name'):
                    # Handle object with name attribute
                    table_names.append(table.name)
                else:
                    # Handle string format
                    table_names.append(str(table).split('.')[-1])
            
            return table_names
        except Exception as e:
            logger.error(f"Error listing tables for namespace {namespace}: {e}")
            raise
    
    def create_namespace(self, namespace: str, properties: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Create a new namespace"""
        try:
            catalog = self._get_catalog()
            namespace_tuple = tuple(namespace.split('.')) if '.' in namespace else (namespace,)
            
            # Set default properties
            default_properties = {
                'warehouse': self.catalog_config['warehouse'],
                'bucket': 'iceberg-warehouse'
            }
            if properties:
                default_properties.update(properties)
            
            catalog.create_namespace(namespace_tuple, properties=default_properties)
            
            return {
                "namespace": namespace,
                "properties": default_properties,
                "message": f"Namespace '{namespace}' created successfully"
            }
        except Exception as e:
            logger.error(f"Error creating namespace: {e}")
            raise
    
    def delete_namespace(self, namespace: str) -> Dict[str, Any]:
        """Delete a namespace"""
        try:
            catalog = self._get_catalog()
            namespace_tuple = tuple(namespace.split('.')) if '.' in namespace else (namespace,)
            
            catalog.drop_namespace(namespace_tuple)
            
            return {
                "namespace": namespace,
                "message": f"Namespace '{namespace}' deleted successfully"
            }
        except Exception as e:
            logger.error(f"Error deleting namespace: {e}")
            raise
    
    def get_namespace_properties(self, namespace: str) -> Dict[str, Any]:
        """Get namespace properties"""
        try:
            catalog = self._get_catalog()
            namespace_tuple = tuple(namespace.split('.')) if '.' in namespace else (namespace,)
            
            properties = catalog.load_namespace_properties(namespace_tuple)
            
            return {
                "namespace": namespace,
                "properties": properties
            }
        except Exception as e:
            logger.error(f"Error getting namespace properties: {e}")
            raise
    
    def update_namespace_properties(self, namespace: str, properties: Dict[str, str]) -> Dict[str, Any]:
        """Update namespace properties"""
        try:
            catalog = self._get_catalog()
            namespace_tuple = tuple(namespace.split('.')) if '.' in namespace else (namespace,)
            
            # Update properties
            catalog.update_namespace_properties(namespace_tuple, updates=properties)
            
            return {
                "namespace": namespace,
                "properties": properties,
                "message": f"Namespace '{namespace}' properties updated successfully"
            }
        except Exception as e:
            logger.error(f"Error updating namespace properties: {e}")
            raise
    
    def create_table_from_parquet(
        self, 
        namespace: str, 
        table_name: str, 
        bucket: str,
        parquet_path: str
    ) -> Dict[str, Any]:
        """Create an Iceberg table from a Parquet file or directory"""
        try:
            catalog = self._get_catalog()
            
            # Build S3 path
            s3_path = f"s3://{bucket}/{parquet_path}"
            logger.info(f"Reading Parquet from: {s3_path}")
            
            # Read the Parquet file(s) to infer schema
            df = pd.read_parquet(s3_path)
            
            # Convert to PyArrow schema
            arrow_table = pa.Table.from_pandas(df)
            iceberg_schema = self._pyarrow_to_iceberg_schema(arrow_table.schema)
            
            # Create the table identifier
            table_identifier = f"{namespace}.{table_name}"
            
            # Create the table
            table = catalog.create_table(
                identifier=table_identifier,
                schema=iceberg_schema,
                location=f"s3://{bucket}/{namespace}/{table_name}"
            )
            
            # Load data into the table
            table.append(arrow_table)
            
            logger.info(f"Created table '{table_identifier}' with {len(df)} rows")
            
            return {
                "table_identifier": table_identifier,
                "location": table.location(),
                "schema": self._iceberg_schema_to_dict(table.schema()),
                "rows_loaded": len(df),
                "message": f"Table '{table_identifier}' created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error creating table from Parquet: {e}")
            raise
    
    def get_table_info(self, namespace: str, table_name: str) -> Dict[str, Any]:
        """Get detailed information about a table"""
        try:
            catalog = self._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            table = catalog.load_table(table_identifier)
            
            # Get current snapshot
            snapshot = table.current_snapshot()
            
            return {
                "identifier": table_identifier,
                "schema": self._iceberg_schema_to_dict(table.schema()),
                "location": table.location(),
                "snapshot_id": snapshot.snapshot_id if snapshot else None,
                "metadata_location": table.metadata_location
            }
            
        except Exception as e:
            logger.error(f"Error getting table info: {e}")
            raise
    
    def query_table(self, namespace: str, table_name: str, limit: int = 100) -> Dict[str, Any]:
        """Query table data with optional limit"""
        try:
            catalog = self._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            table = catalog.load_table(table_identifier)
            
            # Scan the table
            scan = table.scan(limit=limit)
            arrow_table = scan.to_arrow()
            
            # Convert to pandas for easier JSON serialization
            df = arrow_table.to_pandas()
            
            # Get column information
            columns = [
                {"name": field.name, "type": str(field.type)}
                for field in arrow_table.schema
            ]
            
            return {
                "columns": columns,
                "sample_data": df.to_dict('records'),
                "total_rows": len(df)
            }
            
        except Exception as e:
            logger.error(f"Error querying table: {e}")
            raise
    
    def _pyarrow_to_iceberg_schema(self, arrow_schema):
        """Convert PyArrow schema to Iceberg schema"""
        from pyiceberg.schema import Schema
        from pyiceberg.types import (
            StringType, IntegerType, LongType, FloatType, DoubleType, 
            BooleanType, TimestampType, DateType, DecimalType, NestedField
        )
        
        fields = []
        field_id = 1
        
        for field in arrow_schema:
            iceberg_type = None
            
            if pa.types.is_string(field.type):
                iceberg_type = StringType()
            elif pa.types.is_int32(field.type):
                iceberg_type = IntegerType()
            elif pa.types.is_int64(field.type):
                iceberg_type = LongType()
            elif pa.types.is_float32(field.type):
                iceberg_type = FloatType()
            elif pa.types.is_float64(field.type):
                iceberg_type = DoubleType()
            elif pa.types.is_boolean(field.type):
                iceberg_type = BooleanType()
            elif pa.types.is_timestamp(field.type):
                iceberg_type = TimestampType()
            elif pa.types.is_date(field.type):
                iceberg_type = DateType()
            elif pa.types.is_decimal(field.type):
                iceberg_type = DecimalType(precision=field.type.precision, scale=field.type.scale)
            else:
                # Default to string for unknown types
                iceberg_type = StringType()
            
            iceberg_field = NestedField(
                field_id=field_id,
                name=field.name,
                field_type=iceberg_type,
                required=not field.nullable
            )
            
            fields.append(iceberg_field)
            field_id += 1
        
        return Schema(*fields)
    
    def _iceberg_schema_to_dict(self, schema) -> Dict[str, Any]:
        """Convert Iceberg schema to dictionary format"""
        columns = []
        for field in schema.fields:
            columns.append({
                "name": field.name,
                "type": str(field.field_type),
                "nullable": not field.required,
                "field_id": field.field_id
            })
        
        return {"columns": columns}
