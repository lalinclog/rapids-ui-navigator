
import os
import requests
import logging
from typing import Dict, Optional, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KeycloakService:
    def __init__(self):
        self.base_url = os.environ.get("KEYCLOAK_URL", "http://keycloak:8080")
        self.admin_username = os.environ.get("KEYCLOAK_ADMIN", "admin")
        self.admin_password = os.environ.get("KEYCLOAK_ADMIN_PASSWORD", "admin")
        self.realm = os.environ.get("KEYCLOAK_REALM", "master")
        self.client_id = os.environ.get("KEYCLOAK_CLIENT_ID", "admin-cli")
        self.client_secret = os.environ.get("KEYCLOAK_CLIENT_SECRET", "")
        self.admin_token = None
        logger.info(f"KeycloakService initialized with base URL: {self.base_url}")

    def get_token(self, username: str, password: str) -> Dict[str, Any]:
        """Get user access token from Keycloak"""
        try:
            logger.info(f"Getting token for user: {username}")
            url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/token"
            payload = {
                "username": username,
                "password": password,
                "grant_type": "password",
                "client_id": self.client_id,
            }

            # Add client_secret if available
            if self.client_secret:
                payload["client_secret"] = self.client_secret
                
            response = requests.post(url, data=payload)
            
            if response.status_code != 200:
                logger.error(f"Token request failed: {response.status_code} {response.text}")
                return {"error": "authentication_failed", "error_description": response.text}
                
            token_data = response.json()
            logger.info(f"Successfully obtained token for user: {username}")
            return token_data
        except Exception as e:
            logger.error(f"Failed to get token: {str(e)}", exc_info=True)
            return {"error": "token_error", "error_description": str(e)}

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        try:
            logger.info("Refreshing token")
            url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/token"
            payload = {
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
                "client_id": self.client_id,
            }
            
            # Add client_secret if available
            if self.client_secret:
                payload["client_secret"] = self.client_secret
                
            response = requests.post(url, data=payload)
            
            if response.status_code != 200:
                logger.error(f"Token refresh failed: {response.status_code} {response.text}")
                return {"error": "refresh_failed", "error_description": response.text}
                
            token_data = response.json()
            logger.info("Successfully refreshed token")
            return token_data
        except Exception as e:
            logger.error(f"Failed to refresh token: {str(e)}", exc_info=True)
            return {"error": "refresh_error", "error_description": str(e)}

    def logout(self, refresh_token: str) -> bool:
        """Logout by invalidating the refresh token"""
        try:
            logger.info("Logging out user")
            url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/logout"
            payload = {
                "refresh_token": refresh_token,
                "client_id": self.client_id,
            }
            
            # Add client_secret if available
            if self.client_secret:
                payload["client_secret"] = self.client_secret
                
            response = requests.post(url, data=payload)
            
            if response.status_code >= 200 and response.status_code < 300:
                logger.info("Successfully logged out user")
                return True
            else:
                logger.error(f"Logout failed: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Logout error: {str(e)}", exc_info=True)
            return False

    def get_admin_token(self) -> Optional[str]:
        """Get admin access token from Keycloak"""
        try:
            logger.info("Getting admin token from Keycloak")
            url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/token"
            payload = {
                "username": self.admin_username,
                "password": self.admin_password,
                "grant_type": "password",
                "client_id": self.client_id,
            }
            response = requests.post(url, data=payload)
            response.raise_for_status()
            token_data = response.json()
            self.admin_token = token_data["access_token"]
            logger.info("Successfully obtained admin token")
            return self.admin_token
        except Exception as e:
            logger.error(f"Failed to get admin token: {str(e)}", exc_info=True)
            return None

    def validate_token(self, token: str) -> Dict[str, Any]:
        """Validate a user token with Keycloak"""
        try:
            logger.info("Validating user token with Keycloak")
            url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/userinfo"
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            user_info = response.json()
            logger.info(f"Token validated for user: {user_info.get('preferred_username')}")
            return user_info
        except Exception as e:
            logger.error(f"Token validation failed: {str(e)}", exc_info=True)
            return {"error": str(e)}

    def get_public_key(self) -> Optional[str]:
        """Get the public key for token verification"""
        try:
            logger.info("Getting Keycloak realm public key")
            url = f"{self.base_url}/realms/{self.realm}"
            response = requests.get(url)
            response.raise_for_status()
            realm_info = response.json()
            public_key = realm_info.get("public_key")
            logger.info("Successfully obtained realm public key")
            return public_key
        except Exception as e:
            logger.error(f"Failed to get public key: {str(e)}", exc_info=True)
            return None

    def check_connection(self) -> bool:
        """Check if Keycloak is accessible"""
        try:
            logger.info("Checking connection to Keycloak")
            url = f"{self.base_url}/health"
            response = requests.get(url)
            response.raise_for_status()
            logger.info("Keycloak connection successful")
            return True
        except Exception as e:
            logger.error(f"Keycloak connection check failed: {str(e)}", exc_info=True)
            return False

    def create_user(self, username: str, email: str, password: str, first_name: str = "", last_name: str = "") -> bool:
        """Create a new user in Keycloak"""
        if not self.admin_token:
            self.get_admin_token()
            
        if not self.admin_token:
            logger.error("Failed to get admin token, cannot create user")
            return False
            
        try:
            logger.info(f"Creating new user: {username}")
            url = f"{self.base_url}/admin/realms/{self.realm}/users"
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "username": username,
                "email": email,
                "enabled": True,
                "firstName": first_name,
                "lastName": last_name,
                "credentials": [{
                    "type": "password",
                    "value": password,
                    "temporary": False
                }]
            }
            
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            logger.info(f"User {username} created successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to create user {username}: {str(e)}", exc_info=True)
            return False
