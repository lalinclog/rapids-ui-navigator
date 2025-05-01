
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

from .services.minio_service import MinioService
from .services.postgres_service import PostgresService
from .services.python_service import PythonService

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

@app.post("/api/python/check-env")
async def check_python_env(python_service: PythonService = Depends(get_python_service)):
    try:
        result = python_service.check_python_env()
        return {"success": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/python/setup-env")
async def setup_python_env(python_service: PythonService = Depends(get_python_service)):
    try:
        result = python_service.setup_python_env()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/qualification")
async def run_qualification(
    params: QualificationParams,
    background_tasks: BackgroundTasks,
    minio_service: MinioService = Depends(get_minio_service),
    postgres_service: PostgresService = Depends(get_postgres_service),
    python_service: PythonService = Depends(get_python_service)
):
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
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/profiling")
async def run_profiling(
    params: ProfilingParams,
    background_tasks: BackgroundTasks,
    minio_service: MinioService = Depends(get_minio_service),
    postgres_service: PostgresService = Depends(get_postgres_service),
    python_service: PythonService = Depends(get_python_service)
):
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs")
async def get_jobs(postgres_service: PostgresService = Depends(get_postgres_service)):
    try:
        jobs = postgres_service.get_jobs()
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: int, postgres_service: PostgresService = Depends(get_postgres_service)):
    try:
        job = postgres_service.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found")
        return job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    minio_service: MinioService = Depends(get_minio_service)
):
    try:
        # Generate a unique object name
        object_name = f"uploads/{uuid.uuid4()}/{file.filename}"
        
        # Upload to MinIO
        result = await minio_service.upload_file(file, object_name)
        
        return {
            "success": True,
            "url": f"s3://{result['bucket']}/{result['object_name']}",
            "fileName": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Serve static files
app.mount("/", StaticFiles(directory="dist", html=True), name="static")
