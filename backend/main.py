import logging
import sys

# ───── Logging setup must run before ANY FastAPI/Uvicorn imports ─────
logging.basicConfig(
    level=logging.DEBUG,                   # capture DEBUG+ logs
    stream=sys.stdout,                     # send logs to stdout
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    force=True,                            # override any existing handlers (including Uvicorn’s)
)

# Make Uvicorn’s own logger propagate into our root handler
uvicorn_logger = logging.getLogger("uvicorn")
uvicorn_logger.setLevel(logging.DEBUG)
uvicorn_logger.propagate = True

logger = logging.getLogger(__name__)
# ──────────────────────────────────────────────────────────────────────




from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import json
import subprocess
import tempfile
from datetime import datetime
import uuid
from fastapi.responses import FileResponse, Response
from fastapi.encoders import jsonable_encoder
import pprint
from slowapi import Limiter
from slowapi.util import get_remote_address

from .services.minio_service import MinioService
from .services.postgres_service import PostgresService
from .services.python_service import PythonService
from .services.stats_service import StatsService
from .services.bi_service import BIService
from .services.iceberg_service import IcebergService
from .services.keycloak_service import KeycloakService
from .services.api_service import router as api_router, get_current_user

app = FastAPI(
    title="BI App API",
    description="API documentation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

#Make all routes in api_service.py accessible under http://localhost:8080/api
app.include_router(api_router, prefix="/api")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization"],
)

# app.include_router(services/api_service, prefix="/api")

# Dependencies
def get_minio_service():
    return MinioService()

def get_postgres_service():
    return PostgresService()

def get_python_service():
    return PythonService()

def get_stats_service():
    return StatsService()

def get_bi_service():
    return BIService()

def get_iceberg_service():
    return IcebergService()

def get_keycloak_service():
    return KeycloakService()

# Models
class QualificationParams(BaseModel):
    eventLogPath: str
    outputFormat: str
    applicationName: Optional[str] = None
    platform: Optional[str] = "onprem"
    additionalOptions: Optional[str] = None

class ProfilingParams(BaseModel):
    eventLogPath: str
    outputFormat: str
    applicationName: Optional[str] = None
    platform: Optional[str] = "onprem"
    generateTimeline: bool = True
    additionalOptions: Optional[str] = None

class JobBase(BaseModel):
    name: str
    type: str
    user: str
    eventLogPath: str
    applicationName: Optional[str] = None
    outputFormat: str
    additionalOptions: Optional[str] = None

class DataSourceCreate(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    connection_string: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = "admin"

class DataSourceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    connection_string: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class DatasetQuery(BaseModel):
    filters: Optional[Dict[str, Any]] = None

class DatasetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    source_id: int
    query_type: str
    query_value: str
    schema_definition: Optional[Dict[str, Any]] = Field(None, alias="schema")  # Fixed schema field name
    dimensions: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    cache_policy: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = "admin"

class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    source_id: Optional[int] = None
    query_type: Optional[str] = None
    query_value: Optional[str] = None
    schema_definition: Optional[Dict[str, Any]] = Field(None, alias="schema")  # Fixed schema field name
    dimensions: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    cache_policy: Optional[Dict[str, Any]] = None

class ColumnType(BaseModel):
    name: str
    type: str

class DatasetWithColumns(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    source_id: Optional[int] = None
    query_type: Optional[str] = None
    query_value: Optional[str] = None
    schema_definition: Optional[Dict[str, Any]] = Field(None, alias="schema")  # Fixed schema field name
    dimensions: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    cache_policy: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str
    created_by: Optional[str] = None
    last_refreshed_at: Optional[str] = None
    column_types: Optional[Dict[str, str]] = None

# Routes
@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/api/stats/dashboard")
async def get_dashboard_stats(stats_service: StatsService = Depends(get_stats_service)):
    logger.info("Received request for dashboard stats")
    try:
        stats = stats_service.get_dashboard_stats()
        logger.info(f"Returning dashboard stats: {stats}")
        return stats
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/python/check-env")
async def check_python_env(python_service: PythonService = Depends(get_python_service)):
    logger.info("Checking Python environment")
    try:
        result = python_service.check_python_env()
        logger.info(f"Python environment check result: {result}")
        return {"success": result}
    except Exception as e:
        logger.error(f"Error checking Python environment: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/python/setup-env")
async def setup_python_env(python_service: PythonService = Depends(get_python_service)):
    logger.info("Setting up Python environment")
    try:
        result = python_service.setup_python_env()
        logger.info(f"Python environment setup result: {result}")
        return result
    except Exception as e:
        logger.error(f"Error setting up Python environment: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/python/packages")
async def get_python_packages(python_service: PythonService = Depends(get_python_service)):
    logger.info("Getting installed Python packages")
    try:
        result = python_service.get_installed_packages()
        logger.info(f"Retrieved {len(result.get('packages', [])) if result.get('success') else 0} installed packages")
        return result
    except Exception as e:
        logger.error(f"Error getting installed packages: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/qualification")
@limiter.limit("5/minute")  # Add rate limiting
async def run_qualification(
    request: Request,
    params: QualificationParams,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),  # Add authentication
    minio_service: MinioService = Depends(get_minio_service),
    postgres_service: PostgresService = Depends(get_postgres_service),
    python_service: PythonService = Depends(get_python_service)
):
    logger.info(f"Running qualification with params: {params}")
    try:
        # Create a job entry
        job_id = postgres_service.create_job({
            "name": params.applicationName or f"Qualification-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "type": "qualification",
            "status": "pending",
            "user_id": current_user["sub"],  # Use authenticated user
            "event_log_path": params.eventLogPath,
            "application_name": params.applicationName,
            "output_format": params.outputFormat,
            "additional_options": params.additionalOptions
        })
        
        logger.info(f"Created qualification job with ID: {job_id}")
        
        # Run the task in background
        background_tasks.add_task(
            python_service.run_qualification_task,
            job_id,
            params,
            minio_service,
            postgres_service
        )
        
        return {"success": True, "jobId": job_id}
    except Exception as e:
        logger.error(f"Error running qualification: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/profiling")
async def run_profiling(
    params: ProfilingParams,
    background_tasks: BackgroundTasks,
    minio_service: MinioService = Depends(get_minio_service),
    postgres_service: PostgresService = Depends(get_postgres_service),
    python_service: PythonService = Depends(get_python_service)
):
    logger.info(f"Running profiling with params: {params}")
    try:
        # Create a job entry
        job_id = postgres_service.create_job({
            "name": params.applicationName or f"Profiling-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "type": "profiling",
            "status": "pending",
            "user_id": "admin",  # In a real app, get from auth
            "event_log_path": params.eventLogPath,
            "application_name": params.applicationName,
            "output_format": params.outputFormat,
            "additional_options": params.additionalOptions
        })
        
        logger.info(f"Created profiling job with ID: {job_id}")
        
        # Run the task in background
        background_tasks.add_task(
            python_service.run_profiling_task,
            job_id,
            params,
            minio_service,
            postgres_service
        )
        
        return {"success": True, "jobId": job_id}
    except Exception as e:
        logger.error(f"Error running profiling: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs")
async def get_jobs(postgres_service: PostgresService = Depends(get_postgres_service)):
    logger.info("Fetching all jobs")
    try:
        jobs = postgres_service.get_jobs()
        logger.info(f"Retrieved {len(jobs) if jobs else 0} jobs")
        return jobs
    except Exception as e:
        logger.error(f"Error fetching jobs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: int, postgres_service: PostgresService = Depends(get_postgres_service)):
    logger.info(f"Fetching job with ID: {job_id}")
    try:
        job = postgres_service.get_job(job_id)
        if not job:
            logger.warning(f"Job with ID {job_id} not found")
            raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found")
        logger.info(f"Retrieved job: {job}")
        return job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching job {job_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs/{job_id}/download")
async def download_job_results(
    job_id: int, 
    postgres_service: PostgresService = Depends(get_postgres_service),
    minio_service: MinioService = Depends(get_minio_service)
):
    logger.info(f"Download request for job with ID: {job_id}")
    try:
        # Get job details
        job = postgres_service.get_job(job_id)
        if not job:
            logger.warning(f"Job with ID {job_id} not found")
            raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found")
        
        if job["status"] != "completed":
            logger.warning(f"Cannot download job {job_id} as it is not completed")
            raise HTTPException(status_code=400, detail="Only completed jobs can be downloaded")
        
        # For demo purposes, we'll create a simple JSON file
        # In a real app, you would fetch the actual results from MinIO or elsewhere
        with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as tmp:
            job_results = {
                "id": job_id,
                "name": job["name"],
                "type": job["type"],
                "results": job.get("results", {}),
                "timestamp": datetime.now().isoformat()
            }
            tmp.write(json.dumps(job_results, indent=2).encode())
            tmp_path = tmp.name
        
        logger.info(f"Prepared download file for job {job_id} at {tmp_path}")
        # Return the file as a download
        return FileResponse(
            path=tmp_path,
            filename=f"{job['name']}-results.json",
            media_type="application/json"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading job {job_id} results: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    minio_service: MinioService = Depends(get_minio_service)
):
    logger.info(f"Uploading file: {file.filename}")
    try:
        # Generate a unique object name
        object_name = f"uploads/{uuid.uuid4()}/{file.filename}"
        
        # Upload to MinIO
        result = await minio_service.upload_file(file, object_name)
        
        logger.info(f"File uploaded successfully: {result}")
        return {
            "success": True,
            "url": f"s3://{result['bucket']}/{result['object_name']}",
            "fileName": file.filename
        }
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Add the new endpoint to check Java availability
@app.get("/api/java/check")
async def check_java(python_service: PythonService = Depends(get_python_service)):
    logger.info("Checking Java availability")
    try:
        is_available, version_info = python_service.check_java_availability()
        logger.info(f"Java check result: {is_available}, version: {version_info}")
        return {"available": is_available, "version_info": version_info}
    except Exception as e:
        logger.error(f"Error checking Java availability: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# BI Tool API Routes
@app.get("/api/bi/data-sources")
async def get_data_sources(bi_service: BIService = Depends(get_bi_service)):
    logger.info("Retrieving all data sources")
    try:
        data_sources = bi_service.get_data_sources()
        return data_sources
    except Exception as e:
        logger.error(f"Error getting data sources: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bi/data-sources/{source_id}")
async def get_data_source(source_id: int, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Retrieving data source with ID: {source_id}")
    try:
        data_source = bi_service.get_data_source(source_id)
        if not data_source:
            raise HTTPException(status_code=404, detail=f"Data source with ID {source_id} not found")
        return data_source
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting data source {source_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bi/data-sources/{source_id}/test-connection")
async def test_data_source_connection(source_id: int, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Testing connection to data source {source_id}")
    try:
        result = bi_service.test_data_source_connection(source_id)
        if not result["success"]:
            return {"success": False, "error": result.get("error", "Unknown error")}
        return {"success": True, "message": result.get("message", "Connection successful")}
    except Exception as e:
        logger.error(f"Error testing connection to data source {source_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bi/data-sources")
async def create_data_source(source: DataSourceCreate, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Creating new data source: {source.name}")
    try:
        source_id = bi_service.create_data_source(source.dict())
        if not source_id:
            raise HTTPException(status_code=500, detail="Failed to create data source")
        return {"id": source_id, "success": True}
    except Exception as e:
        logger.error(f"Error creating data source: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/bi/data-sources/{source_id}")
async def update_data_source(source_id: int, source: DataSourceUpdate, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Updating data source {source_id}")
    try:
        success = bi_service.update_data_source(source_id, source.dict(exclude_unset=True))
        if not success:
            raise HTTPException(status_code=404, detail=f"Data source with ID {source_id} not found or no changes made")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating data source {source_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/bi/data-sources/{source_id}")
async def delete_data_source(source_id: int, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Deleting data source {source_id}")
    try:
        success = bi_service.delete_data_source(source_id)
        if not success:
            raise HTTPException(status_code=400, detail=f"Data source with ID {source_id} cannot be deleted or not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting data source {source_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bi/datasets")
async def get_datasets(bi_service: BIService = Depends(get_bi_service)):
    logger.info("Retrieving all datasets")
    try:
        datasets = bi_service.get_datasets()
        return datasets
    except Exception as e:
        logger.error(f"Error getting datasets: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bi/datasets/{dataset_id}", response_model=DatasetWithColumns)
async def get_dataset(dataset_id: int, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Retrieving dataset with ID: {dataset_id}")
    try:
        dataset = bi_service.get_dataset(dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail=f"Dataset with ID {dataset_id} not found")
        return dataset
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dataset {dataset_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bi/datasets/{dataset_id}/preview")
async def preview_dataset_schema(preview_data: dict, bi_service: BIService = Depends(get_bi_service)):
    logger.info("Generating dataset schema preview Payload: {preview_data}")
    try:
        result = bi_service.preview_dataset_schema(
            preview_data.get('source_id'),
            preview_data.get('query_type'),
            preview_data.get('query_value')
        )
        
        print(f"📤 Returning preview result: {result}")

        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
        
        return {
            "columns": result.get("columns", []),
            "sample_data": result.get("sample_data", []),
            "total_rows": result.get("total_rows")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating dataset preview: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bi/datasets/{dataset_id}/query")
async def query_dataset(dataset_id: int, query: DatasetQuery, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Executing query for dataset {dataset_id}")
    try:
        result = bi_service.execute_dataset_query(dataset_id, query.filters)

        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
        
        # 🔧 Fix: convert RMKeyView to list before encoding
        if "columns" in result:
            try:
                result["columns"] = list(result["columns"])  # Fixes RMKeyView issue
            except Exception as e:
                logger.warning(f"Failed to convert columns to list: {e}")

        result["data"] = jsonable_encoder(result["data"])

        return result
                     
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying dataset {dataset_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Dataset CRUD operations
@app.post("/api/bi/datasets")
async def create_dataset(dataset: DatasetCreate, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Creating new dataset: {dataset.name}")
    try:
        # Convert model to dict, handling the schema_definition field
        dataset_dict = dataset.dict(by_alias=True)  # This ensures the "schema" alias is used
        dataset_id = bi_service.create_dataset(dataset_dict)
        if not dataset_id:
            raise HTTPException(status_code=500, detail="Failed to create dataset")
        return {"id": dataset_id, "success": True}
    except Exception as e:
        logger.error(f"Error creating dataset: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/bi/datasets/{dataset_id}")
async def update_dataset(dataset_id: int, dataset: DatasetUpdate, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Updating dataset {dataset_id}")
    try:
        # Convert model to dict, handling the schema_definition field
        dataset_dict = dataset.dict(exclude_unset=True, by_alias=True)
        success = bi_service.update_dataset(dataset_id, dataset_dict)
        if not success:
            raise HTTPException(status_code=404, detail=f"Dataset with ID {dataset_id} not found or no changes made")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating dataset {dataset_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/bi/datasets/{dataset_id}")
async def delete_dataset(dataset_id: int, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Deleting dataset {dataset_id}")
    try:
        success = bi_service.delete_dataset(dataset_id)
        if not success:
            raise HTTPException(status_code=400, detail=f"Dataset with ID {dataset_id} cannot be deleted or not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting dataset {dataset_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
# PUT endpoint to update column types
@app.put("api/bi/datasets/{dataset_id}/columns")
async def update_dataset_columns(dataset_id: int, columns: List[ColumnType], bi_service: BIService = Depends(get_bi_service)):
    success = bi_service.save_dataset_column_types(dataset_id, columns)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to save column types")
    return {"status": "success"}

@app.get("/api/bi/charts")
async def get_charts(bi_service: BIService = Depends(get_bi_service)):
    logger.info("Retrieving all charts")
    try:
        charts = bi_service.get_charts()
        return charts
    except Exception as e:
        logger.error(f"Error getting charts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bi/charts/{chart_id}")
async def get_chart(chart_id: int, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Retrieving chart with ID: {chart_id}")
    try:
        chart = bi_service.get_chart(chart_id)
        if not chart:
            raise HTTPException(status_code=404, detail=f"Chart with ID {chart_id} not found")
        return chart
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chart {chart_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bi/charts")
async def create_chart(data: dict, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Creating new chart: {data.get('name')}")
    try:
        chart_id = bi_service.create_chart(data)
        if not chart_id:
            raise HTTPException(status_code=500, detail="Failed to create chart")
        return {"id": chart_id, "success": True}
    except Exception as e:
        logger.error(f"Error creating chart: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/bi/charts/{chart_id}")
async def update_chart(chart_id: int, data: dict, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Updating chart {chart_id}: {data.get('name')}")
    try:
        success = bi_service.update_chart(chart_id, data)
        if not success:
            raise HTTPException(status_code=404, detail=f"Chart with ID {chart_id} not found or no changes made")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating chart {chart_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/bi/charts/{chart_id}")
async def delete_chart(chart_id: int, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Deleting chart {chart_id}")
    try:
        success = bi_service.delete_chart(chart_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Chart with ID {chart_id} not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chart {chart_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bi/charts/{chart_id}/data")
def get_chart_data(chart_id: int, bi_service: BIService = Depends(get_bi_service)):
    """Get data for a specific chart"""
    try:
        # bi_service = BIService()
        chart = bi_service.get_chart(chart_id)
        
        if not chart:
            raise HTTPException(status_code=404, detail=f"Chart with ID {chart_id} not found")
        
        # Fetch the dataset associated with this chart
        dataset_id = chart["dataset_id"]
        
        # Execute the query with filters from the chart
        result = bi_service.execute_dataset_query(
            dataset_id, 
            filters=chart.get("filters", {})
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # Ensure columns can be properly serialized
        if "columns" in result:
            try:
                result["columns"] = list(result["columns"])
            except Exception as e:
                logger.warning(f"Failed to convert columns to list: {e}")
        
        # Ensure data is serializable
        result["data"] = jsonable_encoder(result["data"])

        return result
    except Exception as e:
        logger.error(f"Error fetching chart data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Dashboards API
@app.get("/api/bi/dashboards")
async def get_dashboards(
    request: Request,
    bi_service: BIService = Depends(get_bi_service),
    user: dict = Depends(get_current_user)  # Ensure you extract user_id and roles here
    ):
    logger.info("Retrieving all dashboards")
    logger.info(f"[GET /api/bi/dashboards] called by user: {user}, user_id={user.get('sub')}, roles={user['realm_access'].get('roles')}")
    try:
        dashboards = bi_service.get_dashboards(user["sub"], user["realm_access"]["roles"])

         # Log the raw result you're about to return
        logger.debug(f"[GET /api/bi/dashboards] service returned: {dashboards!r}")

        return dashboards
    except Exception as e:
        logger.error(f"[GET /api/bi/dashboards] Error getting dashboards: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bi/dashboards/{dashboard_id}")
async def get_dashboard(
    dashboard_id: int, 
    bi_service: BIService = Depends(get_bi_service),
    user: dict = Depends(get_current_user)  # Ensure you extract user_id and roles here
    ):
    logger.info(f"Retrieving dashboard with ID: {dashboard_id}")
    try:
        dashboard = bi_service.get_dashboard(user["sub"], user["realm_access"]["roles"], dashboard_id)
        if not dashboard:
            raise HTTPException(status_code=404, detail=f"Dashboard with ID {dashboard_id} not found")
        return dashboard
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dashboard {dashboard_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bi/dashboards")
async def create_dashboard(data: dict, bi_service: BIService = Depends(get_bi_service)):
    # current_user: str = Depends(get_current_user)  # Add auth if needed
    logger.info(f"Creating new dashboard: {data.get('name')}")
    try:
        # Add current user to dashboard data
        # data['created_by'] = current_user.username  # Or similar
        dashboard_id = bi_service.create_dashboard(data)
        if not dashboard_id:
            raise HTTPException(status_code=500, detail="Failed to create dashboard")
        return {"id": dashboard_id, "success": True }
    except Exception as e:
        logger.error(f"Error creating dashboard: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/bi/dashboards/{dashboard_id}")
async def update_dashboard(dashboard_id: int, data: dict, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Updating dashboard {dashboard_id}")
    try:
        success = bi_service.update_dashboard(dashboard_id, data)
        if not success:
            raise HTTPException(status_code=404, detail=f"Dashboard with ID {dashboard_id} not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating dashboard {dashboard_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/bi/dashboards/{dashboard_id}")
async def update_dashboard_partial(dashboard_id: int, data: dict, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Partially updating dashboard {dashboard_id} with {data}")
    try:
        # For layout updates, extract the items array if provided
        items = data.get('items', None)
        if items is not None:
            # Update just the layout
            success = bi_service.update_dashboard_items(dashboard_id, items)
        else:
            # Regular update for other fields
            success = bi_service.update_dashboard(dashboard_id, data)
            
        if not success:
            raise HTTPException(status_code=404, detail=f"Dashboard with ID {dashboard_id} not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating dashboard {dashboard_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/bi/dashboards/{dashboard_id}")
def update_dashboard(dashboard_id: int, data: dict):
    """Update a dashboard"""
    try:
        bi_service = BIService()
        
        # Check if dashboard exists
        existing_dashboard = bi_service.get_dashboard(dashboard_id)
        if not existing_dashboard:
            raise HTTPException(status_code=404, detail=f"Dashboard with ID {dashboard_id} not found")
        
        # Update dashboard items if provided
        if "items" in data:
            result = bi_service.update_dashboard_items(dashboard_id, data["items"])
            if not result:
                raise HTTPException(status_code=500, detail="Failed to update dashboard items")
        
        # Update other dashboard properties if needed
        updated_fields = {k: v for k, v in data.items() if k != "items"}
        if updated_fields:
            result = bi_service.update_dashboard(dashboard_id, updated_fields)
            if not result:
                raise HTTPException(status_code=500, detail="Failed to update dashboard")
        
        # Return the updated dashboard
        updated_dashboard = bi_service.get_dashboard(dashboard_id)
        return updated_dashboard
    except Exception as e:
        logger.error(f"Error updating dashboard: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/bi/dashboards/{dashboard_id}")
async def delete_dashboard(dashboard_id: int, bi_service: BIService = Depends(get_bi_service)):
    logger.info(f"Deleting dashboard {dashboard_id}")
    try:
        success = bi_service.delete_dashboard(dashboard_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Dashboard with ID {dashboard_id} not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting dashboard {dashboard_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Serve static files
app.mount("/", StaticFiles(directory="dist", html=True), name="static")

# Endpoints for users and groups
@app.get("/api/keycloak/users")
async def get_users(keycloak_service: KeycloakService = Depends(get_keycloak_service),
                    current_user: dict = Depends(get_current_user)):  # Add authentication dependency
    """Get all users from Keycloak"""
    try:
        users = keycloak_service.get_all_users()
        return {"users": users}
    except Exception as e:
        logger.error(f"Failed to get users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/keycloak/groups")
async def get_groups(keycloak_service: KeycloakService = Depends(get_keycloak_service),
                     current_user: dict = Depends(get_current_user)):  # Add authentication dependency
    """Get all groups from Keycloak"""
    try:
        groups = keycloak_service.get_all_groups()
        return {"groups": groups}
    except Exception as e:
        logger.error(f"Failed to get groups: {e}")
        raise HTTPException(status_code=500, detail=str(e))
