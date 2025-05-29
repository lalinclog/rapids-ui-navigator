
from minio import Minio
from minio.error import S3Error
from fastapi import UploadFile
import os
import io
import tempfile
import urllib3
import certifi
import ssl
from .vault_service import VaultService
import pandas as pd
from typing import Optional, List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MinioService:
    def __init__(self):
        endpoint = f"{os.environ.get('MINIO_ENDPOINT', 'localhost')}:{os.environ.get('MINIO_PORT', '9000')}"
        #access_key = os.environ.get('MINIO_ACCESS_KEY', 'minioadmin')
        #secret_key = os.environ.get('MINIO_SECRET_KEY', 'minioadmin')

        vault = VaultService()
        access_key, secret_key = vault.get_minio_creds()

        # Use certs/public.crt as CA root
        cert_path = "/etc/ssl/certs/minio/public.crt"
        ssl_context = ssl.create_default_context()
        ssl_context.load_verify_locations(cafile=cert_path)

        http_client = urllib3.PoolManager(ssl_context=ssl_context)

        self.client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=True,
            http_client=http_client
        )

        #self._ensure_buckets()

    def _ensure_buckets(self):
        """Create necessary buckets if they don't exist"""
        buckets = ["spark-logs", "rapids-outputs", "uploads"]
        for bucket in buckets:
            if not self.client.bucket_exists(bucket):
                self.client.make_bucket(bucket)

    async def upload_file(self, file: UploadFile, object_name: str):
        """Upload a file to MinIO"""
        bucket = "uploads"
        content = await file.read()
        content_stream = io.BytesIO(content)
        size = len(content)
        
        # Upload the file
        self.client.put_object(
            bucket_name=bucket,
            object_name=object_name, 
            data=content_stream,
            length=size,
            content_type=file.content_type
        )
        
        return {
            "bucket": bucket,
            "object_name": object_name
        }

    def get_file_url(self, bucket: str, object_name: str, expires=3600):
        """Generate a presigned URL for accessing a file"""
        try:
            url = self.client.presigned_get_object(
                bucket_name=bucket,
                object_name=object_name,
                expires=expires
            )
            return url
        except S3Error as e:
            raise Exception(f"Error generating presigned URL: {e}")

    def get_file(self, path: str):
        """Get file by S3 path (s3://bucket/path)"""
        if not path.startswith('s3://'):
            raise ValueError("Path must start with s3://")
        
        parts = path[5:].split('/', 1)
        if len(parts) < 2:
            raise ValueError("Invalid S3 path format")
        
        bucket = parts[0]
        object_name = parts[1]
        
        try:
            # Create a temporary file to store the content
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                self.client.fget_object(bucket, object_name, temp_file.name)
                return temp_file.name
        except S3Error as e:
            raise Exception(f"Error retrieving file: {e}")

    def store_file(self, file_path: str, target_path: str):
        """Store a file to an S3 path"""
        if not target_path.startswith('s3://'):
            raise ValueError("Target path must start with s3://")
        
        parts = target_path[5:].split('/', 1)
        if len(parts) < 2:
            raise ValueError("Invalid S3 path format")
        
        bucket = parts[0]
        object_name = parts[1]
        
        try:
            self.client.fput_object(bucket, object_name, file_path)
            return {
                "bucket": bucket,
                "object_name": object_name,
                "path": target_path
            }
        except S3Error as e:
            raise Exception(f"Error storing file: {e}")
        
    def list_objects(self, bucket_name, prefix=''):
        return list(self.client.list_objects(bucket_name, prefix=prefix, recursive=True))
    
    def list_minio_datasets(self, bucket_name="bi-dashboard-data"):
        objects = self.client.list_objects(bucket_name, recursive=True)
        datasets = []

        for obj in objects:
            if not obj.object_name.endswith((".csv", ".parquet")):
                continue

            response = self.client.get_object(bucket_name, obj.object_name)
            try:
                if obj.object_name.endswith(".csv"):
                    df = pd.read_csv(io.BytesIO(response.read()), nrows=5)
                else:
                    df = pd.read_parquet(io.BytesIO(response.read()), engine="pyarrow")
                    df = df.head(5)
            except Exception as e:
                print(f"Error reading {obj.object_name}: {e}")
                continue

            datasets.append({
                "name": obj.object_name,
                "preview": df.to_dict(orient="records"),
                "description": f"Preview from {obj.object_name}"
            })

        return datasets
    
    def _analyze_minio_file_schema(self, client, bucket: str, object_name: str, file_type: str) -> List[Dict[str, Any]]:
        """Analyze a MinIO file to infer its schema"""
        try:
            import pandas as pd
            import io
            
            response = client.get_object(bucket, object_name)
            
            if file_type == 'csv':
                df = pd.read_csv(io.BytesIO(response.data), nrows=100)
            elif file_type == 'json':
                df = pd.read_json(io.BytesIO(response.data))
            elif file_type == 'parquet':
                df = pd.read_parquet(io.BytesIO(response.data))
            else:
                return []
            
            fields = []
            for col in df.columns:
                dtype = str(df[col].dtype)
                
                # Map pandas dtypes to our schema types
                if 'int' in dtype:
                    field_type = 'integer'
                    data_type = 'metric'
                elif 'float' in dtype:
                    field_type = 'number'
                    data_type = 'metric'
                elif 'bool' in dtype:
                    field_type = 'boolean'
                    data_type = 'dimension'
                elif 'datetime' in dtype:
                    field_type = 'datetime'
                    data_type = 'dimension'
                else:
                    field_type = 'string'
                    data_type = 'dimension'
                
                fields.append({
                    'name': col,
                    'type': field_type,
                    'nullable': df[col].isnull().any(),
                    'description': None,
                    'field_type': data_type
                })
            
            return fields
            
        except Exception as e:
            logger.error(f"Error analyzing file {object_name}: {str(e)}")
            return []
