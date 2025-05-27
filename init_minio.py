#!/usr/bin/env python3
import os
import time
from minio import Minio
from minio.error import S3Error
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from io import BytesIO

# MinIO configuration
MINIO_ENDPOINT = "minio:9000"
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"
MINIO_SECURE = False

# Buckets to initialize
MAIN_BUCKET = "bi-dashboard-data"
ADDITIONAL_BUCKETS = ["spark-logs", "rapids-outputs", "uploads", "output"]

# File structure in main bucket
FILE_STRUCTURE = {
    "sales/regional/": [
        "sales_data_2023.csv",
        "sales_data_2023.parquet"
    ],
    "sales/customers/": [
        "customer_segments.csv"
    ]
}

# Sample data
SALES_CSV_DATA = """region,quarter,product_category,units_sold,revenue,profit_margin
North America,Q1,Electronics,1500,375000,0.22
North America,Q1,Furniture,800,160000,0.18
North America,Q2,Electronics,1800,450000,0.24
North America,Q2,Furniture,950,190000,0.19
Europe,Q1,Electronics,1200,300000,0.20
Europe,Q1,Furniture,600,120000,0.15
Europe,Q2,Electronics,1400,350000,0.22
Europe,Q2,Furniture,750,150000,0.17
Asia Pacific,Q1,Electronics,2000,500000,0.25
Asia Pacific,Q1,Furniture,400,80000,0.12
Asia Pacific,Q2,Electronics,2200,550000,0.27
Asia Pacific,Q2,Furniture,500,100000,0.14"""

CUSTOMER_CSV_DATA = """customer_id,segment,first_purchase_date,avg_order_value,purchase_frequency,region
1001,Premium,2022-03-15,450.00,2.5,North America
1002,Standard,2023-01-22,120.00,1.2,Europe
1003,Value,2023-05-10,75.00,0.8,Asia Pacific
1004,Premium,2021-11-30,380.00,3.1,North America
1005,Standard,2023-02-18,150.00,1.5,Europe
1006,Value,2023-06-05,65.00,0.7,Asia Pacific
1007,Premium,2022-08-12,420.00,2.8,North America
1008,Standard,2023-03-25,135.00,1.3,Europe
1009,Value,2023-04-17,70.00,0.9,Asia Pacific
1010,Premium,2022-05-20,490.00,2.2,North America"""

def create_parquet_data(csv_data):
    """Convert CSV data to Parquet format in memory"""
    df = pd.read_csv(BytesIO(csv_data.encode()))
    table = pa.Table.from_pandas(df)
    buf = BytesIO()
    pq.write_table(table, buf)
    buf.seek(0)
    return buf

def upload_blank_file(client, bucket, folder_name):
    """Upload a .keep file to simulate folder visibility"""
    object_name = f"{folder_name}.keep"
    data = BytesIO(b"")
    client.put_object(bucket, object_name, data=data, length=0)
    print(f"Uploaded blank file to: {bucket}/{object_name}")

def initialize_minio():
    max_retries = 5
    retry_delay = 5

    for i in range(max_retries):
        try:
            client = Minio(
                MINIO_ENDPOINT,
                access_key=MINIO_ACCESS_KEY,
                secret_key=MINIO_SECRET_KEY,
                secure=MINIO_SECURE
            )

            # Create main bucket
            if not client.bucket_exists(MAIN_BUCKET):
                client.make_bucket(MAIN_BUCKET)
                print(f"Created bucket: {MAIN_BUCKET}")

            # Upload structured files to main bucket
            for folder, files in FILE_STRUCTURE.items():
                for filename in files:
                    object_path = f"{folder}{filename}"

                    try:
                        client.stat_object(MAIN_BUCKET, object_path)
                        print(f"File exists, skipping: {object_path}")
                        continue
                    except S3Error:
                        pass

                    if filename.endswith('.csv'):
                        data = SALES_CSV_DATA if 'sales_data' in filename else CUSTOMER_CSV_DATA
                        client.put_object(
                            MAIN_BUCKET,
                            object_path,
                            data=BytesIO(data.encode()),
                            length=len(data.encode()),
                            content_type='text/csv'
                        )
                        print(f"Uploaded CSV: {object_path}")
                    elif filename.endswith('.parquet'):
                        parquet_data = create_parquet_data(SALES_CSV_DATA)
                        client.put_object(
                            MAIN_BUCKET,
                            object_path,
                            data=parquet_data,
                            length=parquet_data.getbuffer().nbytes,
                            content_type='application/octet-stream'
                        )
                        print(f"Uploaded Parquet: {object_path}")

            # Create additional buckets with .keep file
            for bucket in ADDITIONAL_BUCKETS:
                if not client.bucket_exists(bucket):
                    client.make_bucket(bucket)
                    print(f"Created bucket: {bucket}")
                upload_blank_file(client, bucket, "placeholder")

            print("MinIO initialization completed successfully")
            return True

        except Exception as e:
            if i == max_retries - 1:
                print(f"Failed to initialize MinIO after {max_retries} attempts: {str(e)}")
                return False
            print(f"Attempt {i+1} failed, retrying in {retry_delay} seconds... Error: {str(e)}")
            time.sleep(retry_delay)

if __name__ == "__main__":
    initialize_minio()
