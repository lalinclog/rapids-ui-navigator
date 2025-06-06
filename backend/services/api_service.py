from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from typing import Optional, List, Dict, Any
import jwt
from jose import JWTError
import os
import logging
from .keycloak_service import KeycloakService

# Set up logging
logger = logging.getLogger(__name__)

# Create an API router
router = APIRouter()

# Get environment variables
KEYCLOAK_PUBLIC_KEY = os.getenv("KEYCLOAK_PUBLIC_KEY", "")

# If no public key is provided, try to fetch it from a file
if not KEYCLOAK_PUBLIC_KEY and os.path.exists("/app/certs/public.key"):
    try:
        with open("/app/certs/public.key", "r") as key_file:
            KEYCLOAK_PUBLIC_KEY = key_file.read()
    except Exception as e:
        logger.error(f"Error reading public key file: {e}")

# Authentication dependency
async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        token = authorization.replace("Bearer ", "")
        # Here you would validate the JWT token
        # For now, we'll just decode it without verification as a placeholder
        # In a real app, you'd use the KEYCLOAK_PUBLIC_KEY to verify the signature

        # Basic decode without verification (just for demonstration)
        payload = jwt.decode(token, options={"verify_signature": False})
        
        logger.debug(f"Token payload: {payload}")
        return payload
    
    except JWTError as e:
        logger.error(f"JWT error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

# Add the Keycloak user and group endpoints to the router
def get_keycloak_service():
    return KeycloakService()

@router.get("/keycloak/users")
async def get_users(
    keycloak_service: KeycloakService = Depends(get_keycloak_service),
    current_user: dict = Depends(get_current_user)
):
    """Get all users from Keycloak"""
    try:
        logger.info("Fetching users from Keycloak")
        users = keycloak_service.get_all_users()
        logger.debug(f"Found {len(users)} users")
        return {"users": users}
    except Exception as e:
        logger.error(f"Failed to get users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/keycloak/groups")
async def get_groups(
    keycloak_service: KeycloakService = Depends(get_keycloak_service),
    current_user: dict = Depends(get_current_user)
):
    """Get all groups from Keycloak"""
    try:
        logger.info("Fetching groups from Keycloak")
        groups = keycloak_service.get_all_groups()
        logger.debug(f"Found {len(groups)} groups")
        return {"groups": groups}
    except Exception as e:
        logger.error(f"Failed to get groups: {e}")
        raise HTTPException(status_code=500, detail=str(e))
