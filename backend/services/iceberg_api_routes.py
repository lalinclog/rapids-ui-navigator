
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from .iceberg_service import IcebergService, IcebergServiceError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/iceberg", tags=["iceberg"])

# Initialize Iceberg service
iceberg_service = IcebergService()

@router.get("/namespaces")
async def list_namespaces() -> Dict[str, List[str]]:
    """List all namespaces in the Iceberg catalog"""
    try:
        namespaces = iceberg_service.list_namespaces()
        return {"namespaces": namespaces}
    except IcebergServiceError as e:
        logger.error(f"Error listing namespaces: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error listing namespaces: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/namespaces")
async def create_namespace(request: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new namespace"""
    try:
        namespace = request.get("namespace")
        properties = request.get("properties", {})
        
        if not namespace:
            raise HTTPException(status_code=400, detail="Namespace name is required")
        
        result = iceberg_service.create_namespace(namespace, properties)
        return result
    except IcebergServiceError as e:
        logger.error(f"Error creating namespace: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating namespace: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/namespaces/{namespace}")
async def get_namespace_details(namespace: str) -> Dict[str, Any]:
    """Get namespace properties and details"""
    try:
        result = iceberg_service.get_namespace_properties(namespace)
        return {
            "name": namespace,
            "properties": result["properties"]
        }
    except IcebergServiceError as e:
        logger.error(f"Error getting namespace details: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error getting namespace details: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/namespaces/{namespace}")
async def update_namespace_properties(namespace: str, request: Dict[str, Any]) -> Dict[str, Any]:
    """Update namespace properties"""
    try:
        properties = request.get("properties", {})
        result = iceberg_service.update_namespace_properties(namespace, properties)
        return {
            "name": namespace,
            "properties": result["properties"]
        }
    except IcebergServiceError as e:
        logger.error(f"Error updating namespace properties: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error updating namespace properties: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/namespaces/{namespace}")
async def delete_namespace(namespace: str) -> Dict[str, Any]:
    """Delete a namespace (must be empty)"""
    try:
        result = iceberg_service.delete_namespace(namespace)
        return result
    except IcebergServiceError as e:
        logger.error(f"Error deleting namespace: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error deleting namespace: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/namespaces/{namespace}/tables")
async def list_tables_in_namespace(namespace: str) -> Dict[str, List[str]]:
    """List all tables in a namespace"""
    try:
        result = iceberg_service.list_tables(namespace)
        return {"tables": result.get("tables", [])}
    except IcebergServiceError as e:
        logger.error(f"Error listing tables in namespace: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error listing tables: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/namespaces/{namespace}/tables/{table_name}")
async def get_table_details(namespace: str, table_name: str) -> Dict[str, Any]:
    """Get detailed table information"""
    try:
        result = iceberg_service.get_table_info(namespace, table_name)
        return {
            "name": table_name,
            "namespace": namespace,
            "location": result["location"],
            "schema": result["schema"],
            "current_snapshot_id": result.get("snapshot_id")
        }
    except IcebergServiceError as e:
        logger.error(f"Error getting table details: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error getting table details: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/namespaces/{namespace}/tables/{table_name}/statistics")
async def get_table_statistics(namespace: str, table_name: str) -> Dict[str, Any]:
    """Get table statistics and metadata"""
    try:
        # This would need to be implemented in iceberg_service.py
        # For now, return basic info from table details
        result = iceberg_service.get_table_info(namespace, table_name)
        return {
            "table_name": table_name,
            "namespace": namespace,
            "location": result["location"],
            "schema": result["schema"]
        }
    except IcebergServiceError as e:
        logger.error(f"Error getting table statistics: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error getting table statistics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/namespaces/{namespace}/tables/{table_name}/schema")
async def update_table_schema(namespace: str, table_name: str, request: Dict[str, Any]) -> Dict[str, Any]:
    """Update table schema"""
    try:
        updates = request.get("updates", [])
        # This would need to be implemented in iceberg_service.py
        # For now, return a placeholder response
        return {
            "table_identifier": f"{namespace}.{table_name}",
            "message": "Schema update not yet implemented"
        }
    except IcebergServiceError as e:
        logger.error(f"Error updating table schema: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error updating table schema: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/namespaces/{namespace}/tables/{table_name}/snapshots")
async def get_table_snapshots(namespace: str, table_name: str) -> Dict[str, List[Dict[str, Any]]]:
    """Get table snapshots"""
    try:
        # This would need to be implemented in iceberg_service.py
        # For now, return empty snapshots
        return {"snapshots": []}
    except IcebergServiceError as e:
        logger.error(f"Error getting table snapshots: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error getting table snapshots: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/namespaces/{namespace}/tables/{table_name}/snapshots")
async def create_table_snapshot(namespace: str, table_name: str, request: Dict[str, Any]) -> Dict[str, Any]:
    """Create a table snapshot"""
    try:
        summary = request.get("summary", {})
        # This would need to be implemented in iceberg_service.py
        # For now, return a placeholder response
        return {
            "snapshot_id": "placeholder_snapshot_id",
            "timestamp_ms": 0,
            "summary": summary
        }
    except IcebergServiceError as e:
        logger.error(f"Error creating table snapshot: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating table snapshot: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/namespaces/{namespace}/tables/{table_name}/rollback")
async def rollback_to_snapshot(namespace: str, table_name: str, request: Dict[str, Any]) -> Dict[str, Any]:
    """Rollback table to a specific snapshot"""
    try:
        snapshot_id = request.get("snapshot_id")
        if not snapshot_id:
            raise HTTPException(status_code=400, detail="Snapshot ID is required")
        
        # This would need to be implemented in iceberg_service.py
        # For now, return a placeholder response
        return {
            "table_identifier": f"{namespace}.{table_name}",
            "snapshot_id": snapshot_id,
            "message": "Rollback not yet implemented"
        }
    except IcebergServiceError as e:
        logger.error(f"Error rolling back table: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error rolling back table: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/namespaces/{namespace}/tables/{table_name}")
async def delete_table(namespace: str, table_name: str) -> Dict[str, Any]:
    """Delete a table"""
    try:
        # This would need to be implemented in iceberg_service.py
        # For now, return a placeholder response
        return {
            "table_identifier": f"{namespace}.{table_name}",
            "message": "Table deletion not yet implemented"
        }
    except IcebergServiceError as e:
        logger.error(f"Error deleting table: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error deleting table: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/datasets")
async def create_iceberg_dataset(request: Dict[str, Any]) -> Dict[str, Any]:
    """Create an Iceberg dataset from CSV/Parquet files"""
    try:
        name = request.get("name")
        namespace = request.get("namespace")
        table_name = request.get("table_name")
        bucket = request.get("bucket")
        csv_path = request.get("csv_path")
        base_path = request.get("base_path")
        
        if not all([name, namespace, table_name, bucket]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        if csv_path:
            result = iceberg_service.create_table_from_csv(
                namespace=namespace,
                table_name=table_name,
                bucket=bucket,
                csv_path=csv_path,
                base_path=base_path
            )
        else:
            # Assume parquet if no CSV path
            parquet_path = base_path or ""
            result = iceberg_service.create_table_from_parquet(
                namespace=namespace,
                table_name=table_name,
                bucket=bucket,
                parquet_path=parquet_path
            )
        
        return {
            "id": 0,  # Placeholder ID
            "name": name,
            "query_type": "iceberg_table",
            "iceberg_namespace": namespace,
            "iceberg_table": table_name,
            "base_path": base_path,
            **result
        }
    except IcebergServiceError as e:
        logger.error(f"Error creating Iceberg dataset: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating Iceberg dataset: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/preview")
async def preview_iceberg_table(request: Dict[str, Any]) -> Dict[str, Any]:
    """Preview data from an Iceberg table"""
    try:
        namespace = request.get("namespace")
        table_name = request.get("table_name")
        limit = request.get("limit", 100)
        
        if not all([namespace, table_name]):
            raise HTTPException(status_code=400, detail="Namespace and table name are required")
        
        result = iceberg_service.query_table(namespace, table_name, limit)
        return result
    except IcebergServiceError as e:
        logger.error(f"Error previewing table: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error previewing table: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
