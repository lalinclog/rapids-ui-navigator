
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ..services.iceberg_table_service import IcebergTableService
from ..services.keycloak_service import KeycloakService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/iceberg", tags=["iceberg-tables"])

class CreateTableRequest(BaseModel):
    namespace: str
    table_name: str
    bucket: str
    parquet_path: str
    base_path: Optional[str] = None

def get_current_user(token: str = Depends(KeycloakService().get_current_user)):
    return token

@router.get("/namespaces/{namespace}/tables")
async def list_tables(namespace: str, current_user=Depends(get_current_user)):
    """List all tables in a namespace"""
    try:
        service = IcebergTableService()
        result = service.list_tables_in_namespace(namespace)
        return result
    except Exception as e:
        logger.error(f"Error listing tables in namespace {namespace}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/namespaces/{namespace}/tables/{table_name}")
async def get_table_info(namespace: str, table_name: str, current_user=Depends(get_current_user)):
    """Get detailed information about a table"""
    try:
        service = IcebergTableService()
        result = service.get_table_details(namespace, table_name)
        return result
    except Exception as e:
        logger.error(f"Error getting table info for {namespace}.{table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/namespaces/{namespace}/tables/{table_name}/preview")
async def preview_table(
    namespace: str, 
    table_name: str, 
    limit: int = 100,
    current_user=Depends(get_current_user)
):
    """Preview table data"""
    try:
        service = IcebergTableService()
        result = service.preview_table(namespace, table_name, limit)
        return result
    except Exception as e:
        logger.error(f"Error previewing table {namespace}.{table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tables")
async def create_table(request: CreateTableRequest, current_user=Depends(get_current_user)):
    """Create an Iceberg table from Parquet files"""
    try:
        service = IcebergTableService()
        result = service.create_table_from_parquet(
            namespace=request.namespace,
            table_name=request.table_name,
            bucket=request.bucket,
            parquet_path=request.parquet_path,
            base_path=request.base_path
        )
        return result
    except Exception as e:
        logger.error(f"Error creating table: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/namespaces/{namespace}/tables/{table_name}")
async def delete_table(namespace: str, table_name: str, current_user=Depends(get_current_user)):
    """Delete an Iceberg table"""
    try:
        service = IcebergTableService()
        result = service.delete_table(namespace, table_name)
        return result
    except Exception as e:
        logger.error(f"Error deleting table {namespace}.{table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/namespaces/{namespace}/tables/{table_name}/statistics")
async def get_table_statistics(namespace: str, table_name: str, current_user=Depends(get_current_user)):
    """Get table statistics and metadata"""
    try:
        service = IcebergTableService()
        result = service.get_table_statistics(namespace, table_name)
        return result
    except Exception as e:
        logger.error(f"Error getting table statistics for {namespace}.{table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
