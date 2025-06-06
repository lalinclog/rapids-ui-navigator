from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os

# Import all route modules
from routes import (
    auth, bi, iceberg_namespaces, iceberg_tables, datasets, 
    dashboards, access_requests, stats, python_execution
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from services.app_lifecycle import AppLifecycle
    lifecycle = AppLifecycle()
    await lifecycle.startup()
    yield
    # Shutdown
    await lifecycle.shutdown()

app = FastAPI(
    title="Spark RAPIDS Platform API",
    description="API for data processing, analytics, and ML workloads",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:3000",
    "http://localhost:5173",
    os.environ.get("FRONTEND_URL"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(bi.router)
app.include_router(iceberg_namespaces.router)
app.include_router(iceberg_tables.router)
app.include_router(datasets.router)
app.include_router(dashboards.router)
app.include_router(access_requests.router)
app.include_router(stats.router)
app.include_router(python_execution.router)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom exception handler for HTTPExceptions."""
    logger.error(f"HTTPException: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Generic exception handler to log unexpected errors."""
    logger.exception(f"Unexpected error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error"},
    )
