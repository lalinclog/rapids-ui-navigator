
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, List, Optional
import logging
from .postgres_service import PostgresService
from .minio_service import MinioService
from .bi_service import BIService
from .iceberg_service import IcebergService
from .data_source_service import DataSourceService

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

# Initialize services
postgres_service = PostgresService()
minio_service = MinioService()
bi_service = BIService()
iceberg_service = IcebergService()
data_source_service = DataSourceService()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract user from token"""
    try:
        user = bi_service.get_user_from_token(credentials.credentials)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# Data Sources endpoints
@router.get("/bi/data-sources")
async def get_data_sources(current_user: dict = Depends(get_current_user)):
    """Get all data sources"""
    try:
        sources = data_source_service.get_data_sources(current_user.get('sub'))
        return sources
    except Exception as e:
        logger.error(f"Error fetching data sources: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch data sources")

@router.post("/bi/data-sources")
async def create_data_source(
    source_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Create a new data source"""
    try:
        source = data_source_service.create_data_source(source_data, current_user.get('sub'))
        return source
    except Exception as e:
        logger.error(f"Error creating data source: {e}")
        raise HTTPException(status_code=500, detail="Failed to create data source")

@router.put("/bi/data-sources/{source_id}")
async def update_data_source(
    source_id: int,
    source_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Update a data source"""
    try:
        source = data_source_service.update_data_source(source_id, source_data, current_user.get('sub'))
        return source
    except Exception as e:
        logger.error(f"Error updating data source: {e}")
        raise HTTPException(status_code=500, detail="Failed to update data source")

@router.delete("/bi/data-sources/{source_id}")
async def delete_data_source(
    source_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a data source"""
    try:
        success = data_source_service.delete_data_source(source_id, current_user.get('sub'))
        if not success:
            raise HTTPException(status_code=404, detail="Data source not found")
        return {"message": "Data source deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting data source: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete data source")

@router.post("/bi/data-sources/{source_id}/test-connection")
async def test_data_source_connection(
    source_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Test connection to a data source"""
    try:
        result = data_source_service.test_connection(source_id)
        return result
    except Exception as e:
        logger.error(f"Error testing connection: {e}")
        raise HTTPException(status_code=500, detail="Failed to test connection")

# Iceberg namespace endpoints
@router.get("/iceberg/namespaces")
async def get_iceberg_namespaces(current_user: dict = Depends(get_current_user)):
    """Get all Iceberg namespaces"""
    try:
        namespaces = iceberg_service.list_namespaces()
        return {"namespaces": namespaces}
    except Exception as e:
        logger.error(f"Error fetching namespaces: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch namespaces")

@router.post("/iceberg/namespaces")
async def create_iceberg_namespace(
    namespace_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Create a new Iceberg namespace"""
    try:
        namespace = namespace_data.get('namespace')
        if not namespace:
            raise HTTPException(status_code=400, detail="Namespace name is required")
        
        properties = namespace_data.get('properties', {})
        result = iceberg_service.create_namespace(namespace, properties)
        return result
    except Exception as e:
        logger.error(f"Error creating namespace: {e}")
        raise HTTPException(status_code=500, detail="Failed to create namespace")

@router.delete("/iceberg/namespaces/{namespace}")
async def delete_iceberg_namespace(
    namespace: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an Iceberg namespace"""
    try:
        success = iceberg_service.delete_namespace(namespace)
        if not success:
            raise HTTPException(status_code=404, detail="Namespace not found")
        return {"message": "Namespace deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting namespace: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete namespace")

@router.get("/iceberg/namespaces/{namespace}/tables")
async def get_namespace_tables(
    namespace: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all tables in a namespace"""
    try:
        tables = iceberg_service.list_namespace_tables(namespace)
        return {"tables": tables}
    except Exception as e:
        logger.error(f"Error fetching namespace tables: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch namespace tables")

# Access request endpoints
@router.get("/access-requests")
async def get_access_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get access requests"""
    try:
        requests = bi_service.get_access_requests(status)
        return requests
    except Exception as e:
        logger.error(f"Error fetching access requests: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch access requests")

@router.post("/access-requests")
async def create_access_request(request_data: Dict[str, Any]):
    """Create a new access request (no auth required)"""
    try:
        request = bi_service.create_access_request(request_data)
        return request
    except Exception as e:
        logger.error(f"Error creating access request: {e}")
        raise HTTPException(status_code=500, detail="Failed to create access request")

@router.put("/access-requests/{request_id}")
async def update_access_request(
    request_id: int,
    update_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Update an access request"""
    try:
        request = bi_service.update_access_request(request_id, update_data)
        return request
    except Exception as e:
        logger.error(f"Error updating access request: {e}")
        raise HTTPException(status_code=500, detail="Failed to update access request")
