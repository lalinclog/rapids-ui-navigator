
from minio import Minio
from minio.error import S3Error
from fastapi import UploadFile
import os
import io
import tempfile

class MinioService:
    def __init__(self):
        self.client = Minio(
            f"{os.environ.get('MINIO_ENDPOINT', 'localhost')}:{os.environ.get('MINIO_PORT', '9000')}",
            access_key=os.environ.get('MINIO_ACCESS_KEY', 'minioadmin'),
            secret_key=os.environ.get('MINIO_SECRET_KEY', 'minioadmin'),
            secure=False
        )
        self._ensure_buckets()

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
