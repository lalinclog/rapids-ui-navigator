
# ... keep existing code (imports and initial setup)

import requests
from urllib.parse import urljoin

# ... keep existing code (other route definitions)

# Iceberg REST Catalog proxy endpoints
ICEBERG_REST_URL = "http://iceberg-rest:8181"

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
    """Proxy request to Iceberg REST catalog to create namespace and store in PostgreSQL"""
    try:
        # Create namespace in Iceberg REST catalog
        response = requests.post(f"{ICEBERG_REST_URL}/namespaces", json=request)
        response.raise_for_status()
        iceberg_response = response.json()
        
        # Also store in PostgreSQL for BI dashboard integration
        from backend.services.postgres_service import PostgresService
        postgres_service = PostgresService()
        
        # Insert into iceberg_namespaces table
        postgres_service.execute_query("""
            INSERT INTO spark_rapids.public.iceberg_namespaces (name, properties, created_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (name) DO UPDATE SET
                properties = EXCLUDED.properties,
                updated_at = NOW()
        """, (
            request.get('name'),
            json.dumps(iceberg_response.get('properties', {}))
        ))
        
        return iceberg_response
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
        iceberg_response = response.json()
        
        # Also update in PostgreSQL
        from backend.services.postgres_service import PostgresService
        postgres_service = PostgresService()
        
        postgres_service.execute_query("""
            UPDATE spark_rapids.public.iceberg_namespaces 
            SET properties = %s, updated_at = NOW()
            WHERE name = %s
        """, (
            json.dumps(iceberg_response.get('properties', {})),
            namespace
        ))
        
        return iceberg_response
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Iceberg REST catalog: {str(e)}")

@app.delete("/api/iceberg/namespaces/{namespace}")
async def delete_namespace(namespace: str):
    """Proxy request to Iceberg REST catalog to delete namespace"""
    try:
        response = requests.delete(f"{ICEBERG_REST_URL}/namespaces/{namespace}")
        response.raise_for_status()
        
        # Also delete from PostgreSQL
        from backend.services.postgres_service import PostgresService
        postgres_service = PostgresService()
        
        postgres_service.execute_query("""
            DELETE FROM spark_rapids.public.iceberg_namespaces WHERE name = %s
        """, (namespace,))
        
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
        iceberg_response = response.json()
        
        # Also store/update table info in PostgreSQL
        from backend.services.postgres_service import PostgresService
        postgres_service = PostgresService()
        
        postgres_service.execute_query("""
            INSERT INTO spark_rapids.public.iceberg_tables (name, namespace, location, schema_info, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            ON CONFLICT (name, namespace) DO UPDATE SET
                location = EXCLUDED.location,
                schema_info = EXCLUDED.schema_info,
                updated_at = NOW()
        """, (
            table_name,
            namespace,
            iceberg_response.get('metadata', {}).get('location', ''),
            json.dumps(iceberg_response.get('metadata', {}).get('schema', {}))
        ))
        
        return iceberg_response
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Iceberg REST catalog: {str(e)}")

@app.delete("/api/iceberg/namespaces/{namespace}/tables/{table_name}")
async def delete_table(namespace: str, table_name: str):
    """Proxy request to Iceberg REST catalog to delete table"""
    try:
        response = requests.delete(f"{ICEBERG_REST_URL}/namespaces/{namespace}/tables/{table_name}")
        response.raise_for_status()
        
        # Also delete from PostgreSQL
        from backend.services.postgres_service import PostgresService
        postgres_service = PostgresService()
        
        postgres_service.execute_query("""
            DELETE FROM spark_rapids.public.iceberg_tables WHERE name = %s AND namespace = %s
        """, (table_name, namespace))
        
        return {"success": True}
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Iceberg REST catalog: {str(e)}")

# ... keep existing code (rest of the file)
