
# ... keep existing code (imports and initial setup)

import requests
from urllib.parse import urljoin

# ... keep existing code (other route definitions)

# Iceberg REST Catalog proxy endpoints
ICEBERG_REST_URL = "http://localhost:8181/v1"

@app.get("/api/iceberg/namespaces")
async def list_namespaces():
    """Proxy request to Iceberg REST catalog to list namespaces"""
    try:
        response = requests.get(f"{ICEBERG_REST_URL}/namespaces")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Iceberg REST catalog: {str(e)}")

@app.post("/api/iceberg/namespaces")
async def create_namespace(request: dict):
    """Proxy request to Iceberg REST catalog to create namespace"""
    try:
        response = requests.post(f"{ICEBERG_REST_URL}/namespaces", json=request)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Iceberg REST catalog: {str(e)}")

@app.get("/api/iceberg/namespaces/{namespace}")
async def get_namespace_details(namespace: str):
    """Proxy request to Iceberg REST catalog to get namespace details"""
    try:
        response = requests.get(f"{ICEBERG_REST_URL}/namespaces/{namespace}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Iceberg REST catalog: {str(e)}")

@app.put("/api/iceberg/namespaces/{namespace}")
async def update_namespace_properties(namespace: str, request: dict):
    """Proxy request to Iceberg REST catalog to update namespace properties"""
    try:
        response = requests.put(f"{ICEBERG_REST_URL}/namespaces/{namespace}", json=request)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Iceberg REST catalog: {str(e)}")

@app.delete("/api/iceberg/namespaces/{namespace}")
async def delete_namespace(namespace: str):
    """Proxy request to Iceberg REST catalog to delete namespace"""
    try:
        response = requests.delete(f"{ICEBERG_REST_URL}/namespaces/{namespace}")
        response.raise_for_status()
        return {"success": True}
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Iceberg REST catalog: {str(e)}")

@app.get("/api/iceberg/namespaces/{namespace}/tables")
async def list_tables(namespace: str):
    """Proxy request to Iceberg REST catalog to list tables in namespace"""
    try:
        response = requests.get(f"{ICEBERG_REST_URL}/namespaces/{namespace}/tables")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Iceberg REST catalog: {str(e)}")

@app.get("/api/iceberg/namespaces/{namespace}/tables/{table_name}")
async def get_table_details(namespace: str, table_name: str):
    """Proxy request to Iceberg REST catalog to get table details"""
    try:
        response = requests.get(f"{ICEBERG_REST_URL}/namespaces/{namespace}/tables/{table_name}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Iceberg REST catalog: {str(e)}")

@app.delete("/api/iceberg/namespaces/{namespace}/tables/{table_name}")
async def delete_table(namespace: str, table_name: str):
    """Proxy request to Iceberg REST catalog to delete table"""
    try:
        response = requests.delete(f"{ICEBERG_REST_URL}/namespaces/{namespace}/tables/{table_name}")
        response.raise_for_status()
        return {"success": True}
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Iceberg REST catalog: {str(e)}")

# ... keep existing code (rest of the file)
