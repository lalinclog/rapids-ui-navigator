from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import json
import subprocess
import tempfile
from datetime import datetime
import uuid
from fastapi.responses import FileResponse, Response
import logging

from .services.minio_service import MinioService
from .services.postgres_service import PostgresService
from .services.python_service import PythonService
from .services.stats_service import StatsService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependencies
def get_minio_service():
    return MinioService()

def get_postgres_service():
    return PostgresService()

def get_python_service():
    return PythonService()

def get_stats_service():
    return StatsService()

# Models
class QualificationParams(BaseModel):
    eventLogPath: str
    outputFormat: str
    applicationName: Optional[str] = None
    additionalOptions: Optional[str] = None

class ProfilingParams(BaseModel):
    eventLogPath: str
    outputFormat: str
    applicationName: Optional[str] = None
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
async def run_qualification(
    params: QualificationParams,
    background_tasks: BackgroundTasks,
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
            "user_id": "admin",  # In a real app, get from auth
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

# Serve static files
app.mount("/", StaticFiles(directory="dist", html=True), name="static")
