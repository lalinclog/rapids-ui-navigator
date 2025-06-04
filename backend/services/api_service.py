from fastapi import APIRouter, Depends, HTTPException, status, Form, Body, Header, Security, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, APIKeyHeader
from .keycloak_service import KeycloakService
from typing import Dict, Any, List, Optional
import logging
from pydantic import BaseModel
import uuid
import datetime
from .postgres_service import PostgresService
from .bi_service import BIService
import time
from .iceberg_bi_extension import IcebergBIExtension
from .iceberg_service import IcebergService

from fastapi import BackgroundTasks
from fastapi.concurrency import run_in_threadpool

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
keycloak_service = KeycloakService()
postgres_service = PostgresService()
bi_service = BIService()  # Add BIService instance
iceberg_bi = IcebergBIExtension(bi_service)
iceberg_service = IcebergService()  # Add IcebergService instance

# Models for API key management
class APIKeyCreate(BaseModel):
    name: str
    expiration_days: Optional[int] = 30
    description: Optional[str] = None

class APIKeyResponse(BaseModel):
    id: str
    name: str
    key: str
    created_at: str
    expires_at: str
    description: Optional[str] = None

class AccessRequestCreate(BaseModel):
    dataset_id: int  # This maps to dashboard_id in the database
    permission: str = "read"
    reason: str
    
class AccessRequestResponse(BaseModel):
    id: int
    user_id: str
    dataset_id: int
    permission: str
    reason: str
    status: str
    created_at: str
    updated_at: Optional[str] = None

# Models for Iceberg namespace management
class NamespaceCreate(BaseModel):
    name: str
    properties: Optional[Dict[str, str]] = None

class NamespaceUpdate(BaseModel):
    properties: Dict[str, str]

# Role-based access control
ADMIN_ROLES = ["admin"]
ENGINEER_ROLES = ["engineer"]
DATA_STEWARD_ROLES = ["data_steward"]
ANALYST_ROLES = ["analyst"]

def create_tables():
    """Create necessary tables for API key management and access requests"""
    try:
        # Use BIService's _execute_query method instead of PostgresService's execute_query
        with postgres_service._get_connection() as conn:
            bi_service._execute_query(conn, """
            CREATE TABLE IF NOT EXISTS api_keys (
                id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                key_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                description TEXT
            );
            """)
            
            bi_service._execute_query(conn, """
            CREATE TABLE IF NOT EXISTS access_requests (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                dashboard_id INTEGER NOT NULL,
                permission VARCHAR(50) NOT NULL,
                reason TEXT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP
            );
            """)
        
        logger.info("API key and access request tables created or already exist")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")

# Create tables on startup
create_tables()

# Security dependencies
async def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    """Verify JWT token and extract user info"""
    user_info = await keycloak_service.validate_token(token)
    if "error" in user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_info

async def get_api_key_user(
    api_key: str = Security(api_key_header)
):
    """Verify API key and return the associated user"""
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is missing",
        )
    
    # Query for the API key
    query = """
    SELECT ak.user_id, ak.expires_at
    FROM api_keys ak
    WHERE ak.key_hash = %s
    """
    
    # In a real app, you should hash the API key before comparing
    # For demo purposes, we're comparing the raw key
    result = postgres_service.execute_query(query, (api_key,), fetch=True)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    
    user_id = result[0]["user_id"]
    expires_at = result[0]["expires_at"]
    
    # Check if the API key has expired
    if expires_at < datetime.datetime.now():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key has expired",
        )
    
    # For simplicity, we'll just return the user ID
    # In a real app, you would fetch the user details from Keycloak
    return {"sub": user_id, "api_key_user": True}

async def get_current_user_or_api_key(
    token: Optional[str] = Depends(oauth2_scheme),
    api_key: Optional[str] = Security(api_key_header)
):
    """Get the current user from either a JWT token or an API key"""
    if token:
        return await get_current_user(token)
    elif api_key:
        return await get_api_key_user(api_key)
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials are missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def has_role(user_info: dict, required_roles: List[str]) -> bool:
    """Check if user has any of the required roles"""
    # Extract roles from user info or JWT token
    user_roles = []
    
    # Check for realm_access.roles in JWT
    if "realm_access" in user_info and "roles" in user_info["realm_access"]:
        user_roles.extend(user_info["realm_access"]["roles"])
    
    # For API key users, we need to look up their roles from Keycloak
    if user_info.get("api_key_user", False):
        # Currently not implemented - would need to query Keycloak for user roles
        pass
    
    # Check if any required role is in the user's roles
    return any(role in user_roles for role in required_roles)

async def require_roles(user: dict = Depends(get_current_user_or_api_key), required_roles: List[str] = []):
    """Dependency to require specific roles for an endpoint"""
    if not await has_role(user, required_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {required_roles}",
        )
    return user

# Admin-only dependency
async def admin_only(user: dict = Depends(get_current_user_or_api_key)):
    """Require admin role for this endpoint"""
    if not await has_role(user, ADMIN_ROLES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required",
        )
    return user

# Engineering-only dependency
async def engineer_only(user: dict = Depends(get_current_user_or_api_key)):
    """Require engineer role for this endpoint"""
    if not await has_role(user, ENGINEER_ROLES + ADMIN_ROLES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Engineer privileges required",
        )
    return user

# Data steward dependency
async def data_steward_only(user: dict = Depends(get_current_user_or_api_key)):
    """Require data_steward role for this endpoint"""
    if not await has_role(user, DATA_STEWARD_ROLES + ADMIN_ROLES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Data steward privileges required",
        )
    return user

# Authentication endpoints
@router.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Forward login request to Keycloak and return the token response"""
    try:
        token_response = await keycloak_service.get_token(
            username=form_data.username,
            password=form_data.password
        )
        
        if "error" in token_response:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=token_response.get("error_description", "Login failed"),
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return token_response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

# Track refresh token usage
token_refresh_times = {}

@router.post("/auth/refresh")
async def refresh_token(refresh_token: str = Form(...)):
    """Refresh an access token using a refresh token"""
    try:
        # Rate limiting check
        current_time = time.time()
        if refresh_token in token_refresh_times:
            if current_time - token_refresh_times[refresh_token] < 5:  # 5 second cooldown
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many refresh attempts",
                )
        
        # Track token usage
        token_refresh_times[refresh_token] = current_time
        
        # Run in thread pool to avoid blocking
        token_response = await run_in_threadpool(
            keycloak_service.refresh_token, 
            refresh_token
        )
        
        if "error" in token_response:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=token_response.get("error_description", "Token refresh failed"),
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return token_response
        
    except HTTPException:
        raise  # Re-raise existing HTTP exceptions
        
    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/auth/user")
async def get_user_info(current_user: dict = Depends(get_current_user_or_api_key)):
    """Get information about the current user"""
    # For API key users, we need to enhance the user info
    if current_user.get("api_key_user", False):
        # In a real app, you would fetch more user details from Keycloak or database
        return {
            "sub": current_user["sub"],
            "api_key_auth": True,
            "auth_source": "api_key"
        }
    
    # For regular users, return the user info from Keycloak
    return current_user

@router.post("/auth/logout")
async def logout(refresh_token: str = Form(None)):
    """Logout from Keycloak by invalidating the session/token"""
    if refresh_token:
        try:
            result = keycloak_service.logout(refresh_token)
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to logout from Keycloak"
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )
    
    return {"message": "Logged out successfully"}

@router.post("/auth/users")
async def create_user(user_data: Dict[str, Any] = Body(...)):
    """Create a new user in Keycloak"""
    try:
        success = keycloak_service.create_user(
            username=user_data.get("username"),
            email=user_data.get("email"),
            password=user_data.get("password"),
            first_name=user_data.get("firstName", ""),
            last_name=user_data.get("lastName", "")
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
            
        return {"success": True, "message": "User created successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# API Key management
@router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(api_key_data: APIKeyCreate, current_user: dict = Depends(get_current_user)):
    """Create a new API key for the current user"""
    try:
        user_id = current_user["sub"]
        key_id = str(uuid.uuid4())
        api_key = str(uuid.uuid4()).replace("-", "") + str(uuid.uuid4()).replace("-", "")
        
        # Calculate expiration date
        created_at = datetime.datetime.now()
        expires_at = created_at + datetime.timedelta(days=api_key_data.expiration_days)
        
        # In a real app, you would hash the API key before storing
        with postgres_service._get_connection() as conn:
            query = """
            INSERT INTO api_keys (id, user_id, name, key_hash, created_at, expires_at, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            bi_service._execute_query(conn, query, (
                key_id, 
                user_id, 
                api_key_data.name, 
                api_key,  # This should be hashed in a real app
                created_at, 
                expires_at, 
                api_key_data.description
            ))
        
        return {
            "id": key_id,
            "name": api_key_data.name,
            "key": api_key,
            "created_at": created_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "description": api_key_data.description
        }
    except Exception as e:
        logger.error(f"Error creating API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating API key: {str(e)}"
        )

@router.get("/api-keys")
async def list_api_keys(current_user: dict = Depends(get_current_user)):
    """List all API keys for the current user"""
    try:
        user_id = current_user["sub"]
        
        with postgres_service._get_connection() as conn:
            query = """
            SELECT id, name, created_at, expires_at, description
            FROM api_keys
            WHERE user_id = %s
            ORDER BY created_at DESC
            """
            
            result = bi_service._execute_query(conn, query, (user_id,))
            
            return [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "created_at": row["created_at"].isoformat(),
                    "expires_at": row["expires_at"].isoformat(),
                    "description": row["description"]
                } 
                for row in result
            ]
    except Exception as e:
        logger.error(f"Error listing API keys: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing API keys: {str(e)}"
        )

@router.delete("/api-keys/{key_id}")
async def delete_api_key(key_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an API key"""
    try:
        user_id = current_user["sub"]
        
        with postgres_service._get_connection() as conn:
            query = """
            DELETE FROM api_keys
            WHERE id = %s AND user_id = %s
            """
            
            result = bi_service._execute_query(conn, query, (key_id, user_id))
            
            if not result or len(result) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="API key not found or you don't have permission to delete it"
                )
            
            return {"message": "API key deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting API key: {str(e)}"
        )

# Access requests - Fixed to use dashboard_id instead of dataset_id
@router.post("/access-requests", response_model=AccessRequestResponse)
async def create_access_request(
    access_request: AccessRequestCreate, 
    current_user: dict = Depends(get_current_user_or_api_key)
):
    """Create a new access request"""
    try:
        user_id = current_user["sub"]
        created_at = datetime.datetime.now()
        
        query = """
        INSERT INTO spark_rapids.public.access_requests (user_id, dashboard_id, permission, reason, status, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """
        
        result = postgres_service.execute_query(
            query, 
            (
                user_id,
                access_request.dataset_id,  # This maps to dashboard_id in DB
                access_request.permission,
                access_request.reason,
                "pending",
                created_at
            ),
            fetch=True
        )
        
        request_id = result[0]["id"]
        
        return {
            "id": request_id,
            "user_id": user_id,
            "dataset_id": access_request.dataset_id,
            "permission": access_request.permission,
            "reason": access_request.reason,
            "status": "pending",
            "created_at": created_at.isoformat()
        }
    except Exception as e:
        logger.error(f"Error creating access request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating access request: {str(e)}"
        )

@router.delete("/access-requests/{dashboard_id}")
async def cancel_request(
    dashboard_id: int, 
    current_user: dict = Depends(get_current_user_or_api_key)
):
    try:
        user_id = current_user["sub"]

        query = """
            DELETE FROM spark_rapids.public.access_requests
            WHERE user_id = %s AND dashboard_id = %s AND status = 'pending'
        """

        postgres_service.execute_query(query, (user_id, dashboard_id))

        return {"message": "Request cancelled"}
    
    except Exception as e:
        logger.error(f"Error cancelling access request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cancelling access request: {str(e)}"
        )

@router.get("/access-requests")
async def list_access_requests(
    request: Request,
    current_user: dict = Depends(get_current_user_or_api_key)
    ):
    """List access requests for the current user or all requests for admins"""
    try:
        user_id = current_user["sub"]
        is_admin = await has_role(current_user, ADMIN_ROLES)
        is_data_steward = await has_role(current_user, DATA_STEWARD_ROLES)
        is_engineer = await has_role(current_user, ENGINEER_ROLES)
        
        # Users who can review requests
        can_review = is_admin or is_data_steward or is_engineer
        
        base_query = """
        SELECT 
            ar.id, 
            ar.user_id, 
            ar.dashboard_id as dataset_id, 
            ar.permission, 
            ar.reason, 
            ar.status, 
            ar.created_at as requested_at, 
            ar.updated_at as reviewed_at,
            d.name as dashboard_name
        FROM spark_rapids.public.access_requests ar
        LEFT JOIN spark_rapids.public.dashboards d ON ar.dashboard_id = d.id
        """
        
        where_clauses = []
        params = []
        
        if not can_review:
            # Regular users can only see their own requests
            where_clauses.append("ar.user_id = %s")
            params.append(user_id)
        elif "my-requests" in request.query_params:
            # For reviewers viewing their own requests
            where_clauses.append("ar.user_id = %s")
            params.append(user_id)
        elif "pending-review" in request.query_params:
            # For reviewers viewing pending requests
            where_clauses.append("ar.status = 'pending'")
        
        # Build the final query
        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)
        
        base_query += " ORDER BY ar.created_at DESC"
        
        # Execute the query
        result = postgres_service.execute_query(base_query, tuple(params), fetch=True)
        
        # Transform results to match frontend expectations
        requests = []
        for row in result:
            # Get user info from Keycloak
            user_info = await keycloak_service.get_user_info(row["user_id"])
            
            request_data = {
                "id": row["id"],
                "dashboardId": row["dataset_id"],
                "dashboard": {
                    "name": row["dashboard_name"] if row["dashboard_name"] else "Unknown Dashboard"
                },
                "user": {
                    "username": user_info.get("preferred_username", "Unknown User"),
                    "email": user_info.get("email", "No email")
                },
                "reason": row["reason"],
                "status": row["status"],
                "requestedAt": row["requested_at"].isoformat(),
                "reviewedAt": row["reviewed_at"].isoformat() if row["reviewed_at"] else None,
                "reviewNotes": row.get("reviewNotes", "")
            }
            requests.append(request_data)
        
        return {"requests": requests}
        
    except Exception as e:
        logger.error(f"Error listing access requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing access requests: {str(e)}"
        )

@router.post("/access-requests/{request_id}/approve")
async def approve_access_request(request_id: int, current_user: dict = Depends(admin_only)):
    """Approve an access request (admin only)"""
    try:
        # First, get the access request details
        query = """
        SELECT user_id, dashboard_id, permission
        FROM access_requests
        WHERE id = %s
        """
        
        result = postgres_service.execute_query(query, (request_id,), fetch=True)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access request not found"
            )
        
        request_data = result[0]
        user_id = request_data["user_id"]
        dataset_id = request_data["dashboard_id"]
        permission = request_data["permission"]
        
        # Update the request status
        update_query = """
        UPDATE access_requests
        SET status = %s, updated_at = %s
        WHERE id = %s
        """
        
        postgres_service.execute_query(update_query, ("approved", datetime.datetime.now(), request_id))
        
        # Assign the dataset role to the user in Keycloak
        # In a real app, you would need to get the username from the user_id
        # For demo purposes, we'll just use the user_id as the username
        success = keycloak_service.assign_dataset_permission(user_id, dataset_id, permission)
        
        if not success:
            # Even if the Keycloak assignment fails, we'll consider the request approved
            # but log the error
            logger.error(f"Failed to assign Keycloak role for dataset:{permission}:{dataset_id} to user {user_id}")
            
        return {"message": "Access request approved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving access request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error approving access request: {str(e)}"
        )

@router.post("/access-requests/{request_id}/reject")
async def reject_access_request(request_id: int, current_user: dict = Depends(admin_only)):
    """Reject an access request (admin only)"""
    try:
        # Update the request status
        update_query = """
        UPDATE access_requests
        SET status = %s, updated_at = %s
        WHERE id = %s
        """
        
        result = postgres_service.execute_query(update_query, ("rejected", datetime.datetime.now(), request_id))
        
        if result.get("rowcount", 0) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access request not found"
            )
        
        return {"message": "Access request rejected successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting access request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rejecting access request: {str(e)}"
        )

# Admin endpoints
@router.get("/admin/users")
async def list_users(current_user: dict = Depends(admin_only)):
    """List all users (admin only)"""
    # In a real app, this would query Keycloak for all users
    # For demo purposes, we'll return a fixed list
    return [
        {"username": "admin_user", "email": "admin@example.com", "roles": ["admin"]},
        {"username": "engineer_user", "email": "engineer@example.com", "roles": ["engineer"]},
        {"username": "data_steward_user", "email": "data.steward@example.com", "roles": ["data_steward"]},
        {"username": "analyst_user", "email": "analyst@example.com", "roles": ["analyst"]},
        {"username": "marketing_user", "email": "marketing@example.com", "roles": ["department_role", "analyst"]},
        {"username": "sales_user", "email": "sales@example.com", "roles": ["department_role"]}
    ]

@router.get("/admin/roles")
async def list_roles(current_user: dict = Depends(admin_only)):
    """List all roles (admin only)"""
    # In a real app, this would query Keycloak for all roles
    # For demo purposes, we'll return a fixed list
    return [
        {"name": "admin", "description": "Administrator role with full access"},
        {"name": "engineer", "description": "Engineer role for development and system configuration"},
        {"name": "data_steward", "description": "Data steward role for data governance"},
        {"name": "analyst", "description": "Analyst role for data analysis"},
        {"name": "department_role", "description": "Department-specific access role"}
    ]

# Iceberg namespace CRUD endpoints
@router.get("/iceberg/namespaces")
async def list_iceberg_namespaces(current_user: dict = Depends(get_current_user_or_api_key)):
    """List all Iceberg namespaces"""
    try:
        namespaces = iceberg_service.list_namespaces()
        return {"namespaces": namespaces}
    except Exception as e:
        logger.error(f"Error listing namespaces: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing namespaces: {str(e)}"
        )

@router.post("/iceberg/namespaces")
async def create_iceberg_namespace(
    namespace_data: NamespaceCreate,
    current_user: dict = Depends(data_steward_only)
):
    """Create a new Iceberg namespace (data steward only)"""
    try:
        result = iceberg_service.create_namespace(
            namespace=namespace_data.name,
            properties=namespace_data.properties
        )
        return result
    except Exception as e:
        logger.error(f"Error creating namespace: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating namespace: {str(e)}"
        )

@router.delete("/iceberg/namespaces/{namespace}")
async def delete_iceberg_namespace(
    namespace: str,
    current_user: dict = Depends(data_steward_only)
):
    """Delete an Iceberg namespace (data steward only)"""
    try:
        result = iceberg_service.delete_namespace(namespace)
        return result
    except Exception as e:
        logger.error(f"Error deleting namespace: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting namespace: {str(e)}"
        )

@router.get("/iceberg/namespaces/{namespace}")
async def get_namespace_properties(
    namespace: str,
    current_user: dict = Depends(get_current_user_or_api_key)
):
    """Get namespace properties and information"""
    try:
        result = iceberg_service.get_namespace_properties(namespace)
        return result
    except Exception as e:
        logger.error(f"Error getting namespace properties: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting namespace properties: {str(e)}"
        )

@router.put("/iceberg/namespaces/{namespace}")
async def update_namespace_properties(
    namespace: str,
    namespace_data: NamespaceUpdate,
    current_user: dict = Depends(data_steward_only)
):
    """Update namespace properties (data steward only)"""
    try:
        result = iceberg_service.update_namespace_properties(
            namespace=namespace,
            properties=namespace_data.properties
        )
        return result
    except Exception as e:
        logger.error(f"Error updating namespace properties: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating namespace properties: {str(e)}"
        )

@router.get("/iceberg/namespaces/{namespace}/tables")
async def list_iceberg_tables(
    namespace: str, 
    current_user: dict = Depends(get_current_user_or_api_key)
):
    """List all tables in an Iceberg namespace"""
    try:
        tables = iceberg_service.list_tables(namespace)
        return {"tables": tables}
    except Exception as e:
        logger.error(f"Error listing tables: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing tables: {str(e)}"
        )

# Iceberg-specific endpoints
@router.post("/iceberg/datasets")
async def create_iceberg_dataset(
    dataset_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user_or_api_key)
):
    """Create a new Iceberg dataset"""
    try:
        user_id = current_user.get("sub", "1")
        
        dataset = iceberg_bi.create_iceberg_dataset(
            name=dataset_data["name"],
            description=dataset_data.get("description", ""),
            source_id=dataset_data["source_id"],
            namespace=dataset_data["namespace"],
            table_name=dataset_data["table_name"],
            bucket=dataset_data["bucket"],
            base_path=dataset_data.get("base_path"),
            csv_path=dataset_data.get("csv_path"),
            user_id=int(user_id) if str(user_id).isdigit() else 1
        )
        
        return dataset
        
    except Exception as e:
        logger.error(f"Error creating Iceberg dataset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating Iceberg dataset: {str(e)}"
        )

@router.post("/iceberg/preview")
async def preview_iceberg_table(
    preview_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user_or_api_key)
):
    """Preview an Iceberg table"""
    try:
        namespace = preview_data["namespace"]
        table_name = preview_data["table_name"]
        limit = preview_data.get("limit", 100)
        
        preview = iceberg_bi.preview_iceberg_dataset(
            namespace=namespace,
            table_name=table_name,
            limit=limit
        )
        
        return preview
        
    except Exception as e:
        logger.error(f"Error previewing Iceberg table: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error previewing Iceberg table: {str(e)}"
        )

# Version and health check
@router.get("/version")
async def get_version():
    """Get the API version and service info"""
    return {
        "version": "1.0.0",
        "name": "Rapids API",
        "keycloak_connected": keycloak_service.check_connection()
    }

@router.get("/health")
async def health_check():
    """Check if the API service is healthy"""
    return {"status": "ok", "timestamp": datetime.datetime.now().isoformat()}
