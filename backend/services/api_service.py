import logging
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks, File, UploadFile, Form
from typing import Optional, Dict, Any, List
import json
from datetime import datetime
import uuid

from .keycloak_service import KeycloakService
from .iceberg_bi_extension import IcebergBIExtension
from .minio_service import MinioService
from .postgres_service import PostgresService

logger = logging.getLogger(__name__)

router = APIRouter()

def get_keycloak_service():
    return KeycloakService()

def get_minio_service():
    return MinioService()

def get_postgres_service():
    return PostgresService()

async def get_current_user(
    request: Request,
    keycloak_service: KeycloakService = Depends(get_keycloak_service)
):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")

        user_info = keycloak_service.decode_token(token)
        return user_info
    except Exception as e:
        logger.error(f"Error decoding token: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.get("/items/")
async def read_items(current_user: dict = Depends(get_current_user)):
    return {"item_id": "Foo", "owner": current_user["sub"]}

@router.post("/iceberg/datasets")
async def create_iceberg_dataset(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new Iceberg dataset/table"""
    logger.info("=== CREATE ICEBERG DATASET ENDPOINT ===")
    
    try:
        # Get the request body
        body = await request.json()
        logger.info(f"Request body received: {json.dumps(body, indent=2)}")
        logger.info(f"Request body type: {type(body)}")
        logger.info(f"Request body keys: {list(body.keys()) if isinstance(body, dict) else 'Not a dict'}")
        
        # Log user information
        logger.info(f"Current user: {current_user.get('sub', 'unknown')}")
        logger.info(f"User roles: {current_user.get('realm_access', {}).get('roles', [])}")
        
        # Validate required fields
        required_fields = ['name', 'namespace', 'dataset_type']
        missing_fields = [field for field in required_fields if field not in body]
        if missing_fields:
            logger.error(f"Missing required fields: {missing_fields}")
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
        
        # Extract and log individual parameters
        name = body.get('name')
        namespace = body.get('namespace')
        dataset_type = body.get('dataset_type')
        description = body.get('description', '')
        
        logger.info(f"=== DATASET CREATION PARAMETERS ===")
        logger.info(f"Name: {name}")
        logger.info(f"Namespace: {namespace}")
        logger.info(f"Dataset type: {dataset_type}")
        logger.info(f"Description: {description}")
        
        # Initialize the Iceberg BI extension
        logger.info("=== INITIALIZING ICEBERG BI EXTENSION ===")
        iceberg_bi = IcebergBIExtension()
        logger.info("Iceberg BI extension initialized successfully")
        
        # Attempt to create the dataset
        logger.info("=== ATTEMPTING TO CREATE ICEBERG DATASET ===")
        logger.info(f"Calling create_iceberg_dataset with params:")
        logger.info(f"  - name: {name}")
        logger.info(f"  - namespace: {namespace}")
        logger.info(f"  - dataset_type: {dataset_type}")
        logger.info(f"  - description: {description}")
        logger.info(f"  - user_id: {current_user.get('sub')}")
        
        # Before calling the service, log environment variables
        import os
        logger.info("=== ENVIRONMENT VARIABLES DEBUG ===")
        logger.info(f"MINIO_ENDPOINT: {os.environ.get('MINIO_ENDPOINT', 'Not set')}")
        logger.info(f"MINIO_PORT: {os.environ.get('MINIO_PORT', 'Not set')}")
        logger.info(f"MINIO_REGION: {os.environ.get('MINIO_REGION', 'Not set')}")
        logger.info(f"ICEBERG_REST_URL: {os.environ.get('ICEBERG_REST_URL', 'Not set')}")
        logger.info(f"AWS_REGION: {os.environ.get('AWS_REGION', 'Not set')}")
        logger.info(f"AWS_DEFAULT_REGION: {os.environ.get('AWS_DEFAULT_REGION', 'Not set')}")
        
        # Test network connectivity before proceeding
        logger.info("=== TESTING NETWORK CONNECTIVITY ===")
        try:
            import socket
            
            # Test MinIO connectivity
            minio_host = os.environ.get('MINIO_ENDPOINT', 'minio')
            minio_port = int(os.environ.get('MINIO_PORT', '9000'))
            logger.info(f"Testing connection to MinIO: {minio_host}:{minio_port}")
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((minio_host, minio_port))
            sock.close()
            
            if result == 0:
                logger.info(f"✅ MinIO connection test successful: {minio_host}:{minio_port}")
            else:
                logger.error(f"❌ MinIO connection test failed: {minio_host}:{minio_port}, error: {result}")
            
            # Test Iceberg REST connectivity
            iceberg_host = 'iceberg-rest'
            iceberg_port = 8181
            logger.info(f"Testing connection to Iceberg REST: {iceberg_host}:{iceberg_port}")
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((iceberg_host, iceberg_port))
            sock.close()
            
            if result == 0:
                logger.info(f"✅ Iceberg REST connection test successful: {iceberg_host}:{iceberg_port}")
            else:
                logger.error(f"❌ Iceberg REST connection test failed: {iceberg_host}:{iceberg_port}, error: {result}")
                
        except Exception as conn_error:
            logger.error(f"Error during connectivity test: {conn_error}")
        
        # Now attempt the actual dataset creation
        result = iceberg_bi.create_iceberg_dataset(
            name=name,
            namespace=namespace,
            dataset_type=dataset_type,
            description=description,
            user_id=current_user.get("sub")
        )
        
        logger.info(f"=== DATASET CREATION RESULT ===")
        logger.info(f"Result type: {type(result)}")
        logger.info(f"Result: {result}")
        
        if result and result.get("success"):
            logger.info(f"✅ Successfully created Iceberg dataset: {result}")
            return result
        else:
            error_msg = result.get("error", "Unknown error") if result else "No result returned"
            logger.error(f"❌ Failed to create Iceberg dataset: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Failed to create dataset: {error_msg}")
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in create_iceberg_dataset endpoint: {e}", exc_info=True)
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error args: {getattr(e, 'args', 'Not available')}")
        
        # Log the full traceback
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Error creating New Iceberg dataset: {str(e)}"
        )
