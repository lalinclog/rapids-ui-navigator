
import logging
from fastapi import HTTPException
from .keycloak_service import KeycloakService
from typing import Dict, Any

logger = logging.getLogger(__name__)

class APIService:
    def __init__(self):
        self.keycloak = KeycloakService()
        
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh token using KeycloakService"""
        try:
            # Call the synchronous refresh_token method
            result = self.keycloak.refresh_token(refresh_token)
            
            if "error" in result:
                logger.error(f"Token refresh failed: {result.get('error_description', result.get('error'))}")
                raise HTTPException(status_code=503, detail="Token refresh failed")
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token refresh failed: {str(e)}")
            raise HTTPException(status_code=503, detail="Token refresh service unavailable")
    
    def validate_token(self, token: str) -> Dict[str, Any]:
        """Validate token using KeycloakService"""
        try:
            # Call the synchronous validate_token method
            result = self.keycloak.validate_token(token)
            
            if "error" in result:
                logger.error(f"Token validation failed: {result.get('error')}")
                raise HTTPException(status_code=401, detail="Invalid token")
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token validation failed: {str(e)}")
            raise HTTPException(status_code=401, detail="Token validation failed")
