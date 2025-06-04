import os
import boto3
from typing import Dict, Any, List, Optional
import logging
from pyiceberg.catalog import load_catalog
from pyiceberg.exceptions import NamespaceNotFoundError, TableNotFoundError
from pyiceberg.schema import Schema
from pyiceberg.types import NestedField, StringType, IntegerType, FloatType, BooleanType
import pandas as pd
from .minio_service import MinioService
import tempfile

logger = logging.getLogger(__name__)

class IcebergService:
    def __init__(self):
        self.minio_service = MinioService()
        
        # Configure catalog
        catalog_config = {
            'type': 'rest',
            'uri': os.environ.get('ICEBERG_CATALOG_URI', 'http://localhost:8181'),
            's3.endpoint': f"https://{os.environ.get('MINIO_ENDPOINT', 'localhost')}:{os.environ.get('MINIO_PORT', '9000')}",
            's3.access-key-id': os.environ.get('MINIO_ACCESS_KEY', 'minioadmin'),
            's3.secret-access-key': os.environ.get('MINIO_SECRET_KEY', 'minioadmin'),
            's3.path-style-access': 'true'
        }
        
        try:
            self.catalog = load_catalog('iceberg_catalog', **catalog_config)
            logger.info("Iceberg catalog initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Iceberg catalog: {e}")
            self.catalog = None

    def create_table_from_csv(
        self,
        namespace: str,
        table_name: str,
        bucket: str,
        csv_path: str,
        base_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create an Iceberg table from a CSV file in MinIO"""
        try:
            if not self.catalog:
                raise Exception("Iceberg catalog not initialized")

            # Infer schema from CSV
            temp_file = self.minio_service.get_file(f"s3://{bucket}/{csv_path}")
            df = pd.read_csv(temp_file)
            schema = self._infer_schema(df)

            # Define table location
            table_location = f"{base_path}/{namespace}/{table_name}" if base_path else f"s3://{bucket}/{namespace}/{table_name}"

            # Create Iceberg table
            self.catalog.create_table(
                name=f"{namespace}.{table_name}",
                schema=schema,
                location=table_location
            )

            # Load table and write data
            table = self.catalog.load_table(f"{namespace}.{table_name}")
            table.append(df)

            logger.info(f"Created Iceberg table {namespace}.{table_name} from CSV {csv_path}")

            return {
                "name": table_name,
                "namespace": namespace,
                "location": table.location(),
                "schema": str(schema)
            }

        except Exception as e:
            logger.error(f"Error creating Iceberg table: {e}")
            raise

    def get_table_info(self, namespace: str, table_name: str) -> Dict[str, Any]:
        """Get information about an Iceberg table"""
        try:
            if not self.catalog:
                raise Exception("Iceberg catalog not initialized")

            table = self.catalog.load_table(f"{namespace}.{table_name}")
            schema = table.schema()

            return {
                "name": table_name,
                "namespace": namespace,
                "location": table.location(),
                "schema": str(schema)
            }

        except TableNotFoundError:
            logger.warning(f"Iceberg table {namespace}.{table_name} not found")
            return None
        except Exception as e:
            logger.error(f"Error getting Iceberg table info: {e}")
            raise

    def query_table(self, namespace: str, table_name: str, limit: int = 100) -> Dict[str, Any]:
        """Query an Iceberg table and return a sample of the data"""
        try:
            if not self.catalog:
                raise Exception("Iceberg catalog not initialized")

            table = self.catalog.load_table(f"{namespace}.{table_name}")
            df = table.scan().to_arrow().to_pandas()
            sample_data = df.head(limit).to_dict(orient="records")

            return {
                "name": table_name,
                "namespace": namespace,
                "sample_data": sample_data
            }

        except TableNotFoundError:
            logger.warning(f"Iceberg table {namespace}.{table_name} not found")
            return None
        except Exception as e:
            logger.error(f"Error querying Iceberg table: {e}")
            raise

    def _infer_schema(self, df: pd.DataFrame) -> Schema:
        """Infer Iceberg schema from Pandas DataFrame"""
        fields = []
        for col_name, dtype in df.dtypes.items():
            if dtype == "int64":
                fields.append(NestedField(name=col_name, field_type=IntegerType(), field_id=len(fields) + 1))
            elif dtype == "float64":
                fields.append(NestedField(name=col_name, field_type=FloatType(), field_id=len(fields) + 1))
            elif dtype == "bool":
                fields.append(NestedField(name=col_name, field_type=BooleanType(), field_id=len(fields) + 1))
            else:
                fields.append(NestedField(name=col_name, field_type=StringType(), field_id=len(fields) + 1))

        return Schema(*fields)

    def create_namespace(self, namespace: str, properties: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Create a new Iceberg namespace"""
        try:
            if not self.catalog:
                raise Exception("Iceberg catalog not initialized")
            
            namespace_props = properties or {}
            self.catalog.create_namespace(namespace, properties=namespace_props)
            
            logger.info(f"Created Iceberg namespace: {namespace}")
            return {
                "name": namespace,
                "properties": namespace_props,
                "location": namespace_props.get("location", ""),
                "tables": []
            }
        except Exception as e:
            logger.error(f"Error creating namespace {namespace}: {e}")
            raise

    def list_namespaces(self) -> List[Dict[str, Any]]:
        """List all Iceberg namespaces"""
        try:
            if not self.catalog:
                raise Exception("Iceberg catalog not initialized")
            
            namespaces = []
            for ns in self.catalog.list_namespaces():
                try:
                    ns_name = ns[0] if isinstance(ns, tuple) else str(ns)
                    properties = self.catalog.load_namespace_properties(ns_name)
                    tables = self.catalog.list_tables(ns_name)
                    
                    namespaces.append({
                        "name": ns_name,
                        "properties": properties,
                        "location": properties.get("location", ""),
                        "tables": [table.name for table in tables] if tables else []
                    })
                except Exception as e:
                    logger.warning(f"Error loading namespace {ns}: {e}")
                    continue
            
            return namespaces
        except Exception as e:
            logger.error(f"Error listing namespaces: {e}")
            return []

    def delete_namespace(self, namespace: str) -> bool:
        """Delete an Iceberg namespace"""
        try:
            if not self.catalog:
                raise Exception("Iceberg catalog not initialized")
            
            # Check if namespace has tables
            tables = self.catalog.list_tables(namespace)
            if tables:
                raise Exception(f"Cannot delete namespace {namespace}: contains {len(tables)} tables")
            
            self.catalog.drop_namespace(namespace)
            logger.info(f"Deleted Iceberg namespace: {namespace}")
            return True
        except NamespaceNotFoundError:
            logger.warning(f"Namespace {namespace} not found")
            return False
        except Exception as e:
            logger.error(f"Error deleting namespace {namespace}: {e}")
            raise

    def list_namespace_tables(self, namespace: str) -> List[str]:
        """List tables in a specific namespace"""
        try:
            if not self.catalog:
                raise Exception("Iceberg catalog not initialized")
            
            tables = self.catalog.list_tables(namespace)
            return [table.name for table in tables] if tables else []
        except NamespaceNotFoundError:
            logger.warning(f"Namespace {namespace} not found")
            return []
        except Exception as e:
            logger.error(f"Error listing tables in namespace {namespace}: {e}")
            return []
