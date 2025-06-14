import os
import logging
from typing import Dict, Any, List, Optional
from pyiceberg.catalog import load_catalog
from pyiceberg.schema import Schema
from pyiceberg.types import (
    NestedField, StringType, IntegerType, FloatType, DoubleType,
    BooleanType, TimestampType, DateType, LongType, DecimalType
)
import pandas as pd
import pyarrow as pa
import tempfile
import io
from .vault_service import VaultService
from .minio_service import MinioService

logger = logging.getLogger(__name__)


class IcebergServiceError(Exception):
    """Custom exception for Iceberg service errors"""
    pass


class IcebergService:
    """Service for managing Iceberg operations using the default catalog"""

    def __init__(self):
        self.vault = VaultService()
        self.minio_service = MinioService()
        self._catalog = None

    def _get_catalog(self):
        """Get the default Iceberg catalog"""
        if self._catalog is None:
            try:
                self._catalog = load_catalog('default',
                                             **{
                                                 "uri": "http://rest:8181",  # Inside Docker, use "rest" as host
                                                 # "uri": "http://localhost:8181",  # If running outside Docker
                                                 "warehouse": "s3://warehouse/",
                                                 "s3.endpoint": "http://minio:9000",
                                             }
                                             )
                logger.info("Successfully loaded default Iceberg catalog")
            except Exception as e:
                logger.error(f"Failed to load default catalog: {e}")
                raise
        return self._catalog

    def list_namespaces(self) -> List[str]:
        """List all namespaces in the catalog"""
        try:
            catalog = self._get_catalog()
            namespaces = catalog.list_namespaces()
            return ['.'.join(ns) if isinstance(ns, tuple) else str(ns) for ns in namespaces]
        except Exception as e:
            logger.error(f"Error listing namespaces: {e}")
            raise

    def create_namespace(self, namespace: str, properties: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Create a new namespace"""
        try:
            catalog = self._get_catalog()
            catalog.create_namespace(namespace, properties or {})
            logger.info(f"Created namespace: {namespace}")
            return {"namespace": namespace, "properties": properties or {}}
        except Exception as e:
            logger.error(f"Error creating namespace {namespace}: {e}")
            raise

    def list_tables(self, namespace: str = "default") -> List[str]:
        """List tables in a namespace - returns just table names"""
        try:
            catalog = self._get_catalog()
            table_identifiers = catalog.list_tables(namespace)
            # Extract just the table names from the identifiers
            table_names = []
            for identifier in table_identifiers:
                if hasattr(identifier, 'name'):
                    table_names.append(identifier.name)
                elif isinstance(identifier, tuple) and len(identifier) > 1:
                    table_names.append(identifier[1])  # namespace.table format
                else:
                    table_names.append(str(identifier).split('.')[-1])  # Get last part after dot
            return table_names
        except Exception as e:
            logger.error(f"Error listing tables in namespace {namespace}: {e}")
            raise

    def get_table_info(self, namespace: str, table_name: str) -> Dict[str, Any]:
        """Get detailed table information"""
        try:
            catalog = self._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            table = catalog.load_table(table_identifier)

            return {
                "table_identifier": table_identifier,
                "location": table.location(),
                "schema": self._iceberg_schema_to_dict(table.schema()),
                "current_snapshot_id": table.current_snapshot().snapshot_id if table.current_snapshot() else None,
                "metadata_location": table.metadata_location
            }
        except Exception as e:
            logger.error(
                f"Error getting table info for {namespace}.{table_name}: {e}")
            raise

    def create_table_from_csv(
        self,
        namespace: str,
        table_name: str,
        bucket: str,
        csv_path: str,
        base_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create an Iceberg table from CSV data"""
        try:
            # Build the full path
            if base_path:
                full_path = f"{base_path.rstrip('/')}/{csv_path.lstrip('/')}"
            else:
                full_path = csv_path.lstrip('/')

            logger.info(
                f"Creating table {namespace}.{table_name} from CSV: {bucket}/{full_path}")

            # Get CSV data from MinIO
            response = self.minio_service.client.get_object(bucket, full_path)
            csv_data = response.read()

            # Read CSV into DataFrame
            df = pd.read_csv(io.BytesIO(csv_data))
            logger.info(
                f"Loaded CSV with {len(df)} rows and {len(df.columns)} columns")

            # Convert to PyArrow table
            arrow_table = pa.Table.from_pandas(df)

            # Create table using the default catalog pattern
            catalog = self._get_catalog()
            table_identifier = f"{namespace}.{table_name}"

            # Drop table if it exists
            try:
                catalog.drop_table(table_identifier)
                logger.info(f"Dropped existing table: {table_identifier}")
            except:
                pass

            # Create the table with the schema from the DataFrame
            table = catalog.create_table(
                table_identifier, schema=arrow_table.schema)
            logger.info(f"Created table: {table_identifier}")

            # Append the data
            table.append(arrow_table)
            logger.info(
                f"Appended {len(df)} rows to table: {table_identifier}")

            return {
                "table_identifier": table_identifier,
                "location": table.location(),
                "schema": self._iceberg_schema_to_dict(table.schema()),
                "rows_loaded": len(df),
                "message": f"Table '{table_identifier}' created successfully from CSV data"
            }

        except Exception as e:
            logger.error(f"Error creating table from CSV: {e}")
            raise

    def create_empty_table(
        self,
        namespace: str,
        table_name: str,
        bucket: str,
        base_path: Optional[str] = None,
        schema_definition: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Create an empty Iceberg table"""
        try:
            catalog = self._get_catalog()
            table_identifier = f"{namespace}.{table_name}"

            # Default schema if none provided
            if not schema_definition:
                schema_definition = [
                    {"name": "id", "type": "bigint", "nullable": False},
                    {"name": "name", "type": "string", "nullable": True},
                    {"name": "created_at", "type": "timestamp", "nullable": True}
                ]

            # Build Iceberg schema
            iceberg_schema = self._build_iceberg_schema(schema_definition)

            # Drop table if it exists
            try:
                catalog.drop_table(table_identifier)
                logger.info(f"Dropped existing table: {table_identifier}")
            except:
                pass

            # Create the table
            table = catalog.create_table(
                table_identifier, schema=iceberg_schema)
            logger.info(f"Created empty table: {table_identifier}")

            return {
                "table_identifier": table_identifier,
                "location": table.location(),
                "schema": self._iceberg_schema_to_dict(iceberg_schema),
                "message": f"Empty table '{table_identifier}' created successfully"
            }

        except Exception as e:
            logger.error(f"Error creating empty table: {e}")
            raise

    def query_table(
        self,
        namespace: str,
        table_name: str,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Query table data"""
        try:
            catalog = self._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            table = catalog.load_table(table_identifier)

            # Scan the table with limit
            scan = table.scan(limit=limit)
            arrow_table = scan.to_arrow()

            # Convert to pandas for easier JSON serialization
            df = arrow_table.to_pandas()

            return {
                "table_identifier": table_identifier,
                "schema": self._iceberg_schema_to_dict(table.schema()),
                "sample_data": df.to_dict(orient="records"),
                "total_rows_scanned": len(df)
            }

        except Exception as e:
            logger.error(f"Error querying table {namespace}.{table_name}: {e}")
            raise

    def append_data_to_table(
        self,
        namespace: str,
        table_name: str,
        data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Append data to an existing table"""
        try:
            catalog = self._get_catalog()
            table_identifier = f"{namespace}.{table_name}"
            table = catalog.load_table(table_identifier)

            # Convert data to PyArrow table
            df = pd.DataFrame(data)
            arrow_table = pa.Table.from_pandas(df)

            # Append to table
            table.append(arrow_table)
            logger.info(
                f"Appended {len(data)} rows to table: {table_identifier}")

            return {
                "table_identifier": table_identifier,
                "rows_appended": len(data),
                "message": f"Successfully appended {len(data)} rows to '{table_identifier}'"
            }

        except Exception as e:
            logger.error(
                f"Error appending data to table {namespace}.{table_name}: {e}")
            raise

    def delete_table(self, namespace: str, table_name: str) -> Dict[str, Any]:
        """Delete a table"""
        try:
            catalog = self._get_catalog()
            table_identifier = f"{namespace}.{table_name}"

            catalog.drop_table(table_identifier)
            logger.info(f"Deleted table: {table_identifier}")

            return {
                "table_identifier": table_identifier,
                "message": f"Table '{table_identifier}' deleted successfully"
            }

        except Exception as e:
            logger.error(f"Error deleting table {namespace}.{table_name}: {e}")
            raise

    def _build_iceberg_schema(self, schema_definition: List[Dict[str, Any]]) -> Schema:
        """Convert schema definition to Iceberg Schema"""
        fields = []

        for i, column in enumerate(schema_definition):
            field_id = i + 1
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
                iceberg_type = DecimalType(precision=10, scale=2)
            else:
                # Default to string for unknown types
                iceberg_type = StringType()
                logger.warning(
                    f"Unknown type '{type_str}' for column '{name}', defaulting to string")

            field = NestedField(
                field_id=field_id,
                name=name,
                field_type=iceberg_type,
                required=not nullable
            )
            fields.append(field)

        return Schema(*fields)

    def _iceberg_schema_to_dict(self, schema: Schema) -> Dict[str, Any]:
        """Convert Iceberg schema to dictionary"""
        columns = []
        for field in schema.fields:
            columns.append({
                "name": field.name,
                "type": str(field.field_type),
                "nullable": not field.required,
                "field_id": field.field_id
            })

        return {
            "columns": columns,
            "schema_id": schema.schema_id if hasattr(schema, 'schema_id') else None
        }

    def _ensure_bucket_exists(self, bucket_name: str):
        """Ensure bucket exists in MinIO"""
        try:
            if not self.minio_service.client.bucket_exists(bucket_name):
                self.minio_service.client.make_bucket(bucket_name)
                logger.info(f"Created bucket: {bucket_name}")
        except Exception as e:
            logger.error(f"Error ensuring bucket exists: {e}")
            raise
