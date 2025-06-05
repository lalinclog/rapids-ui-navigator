
import requests
import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class KeycloakService:
    def __init__(self):
        self.keycloak_url = os.environ.get("KEYCLOAK_URL", "http://keycloak:8080")
        self.realm = os.environ.get("KEYCLOAK_REALM", "master")
        self.client_id = os.environ.get("KEYCLOAK_CLIENT_ID", "rapids-client")
        self.client_secret = os.environ.get("KEYCLOAK_CLIENT_SECRET", "")
        
        # For admin operations
        self.admin_username = os.environ.get("KEYCLOAK_ADMIN_USER", "admin")
        self.admin_password = os.environ.get("KEYCLOAK_ADMIN_PASSWORD", "admin")
        
        logger.info(f"KeycloakService initialized with URL: {self.keycloak_url}, Realm: {self.realm}")

    def check_connection(self) -> bool:
        """Check if Keycloak is accessible"""
        try:
            response = requests.get(f"{self.keycloak_url}/realms/{self.realm}", timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Keycloak connection failed: {e}")
            return False

    def get_token(self, username: str, password: str) -> Dict[str, Any]:
        """Get access token from Keycloak - synchronous method"""
        try:
            token_url = f"{self.keycloak_url}/realms/{self.realm}/protocol/openid-connect/token"
            
            data = {
                "grant_type": "password",
                "client_id": self.client_id,
                "username": username,
                "password": password
            }
            
            if self.client_secret:
                data["client_secret"] = self.client_secret

            response = requests.post(token_url, data=data, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                error_data = response.json() if response.content else {}
                return {
                    "error": error_data.get("error", "authentication_failed"),
                    "error_description": error_data.get("error_description", "Authentication failed")
                }
                
        except Exception as e:
            logger.error(f"Token request failed: {e}")
            return {
                "error": "service_unavailable",
                "error_description": "Authentication service unavailable"
            }

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token - synchronous method"""
        try:
            token_url = f"{self.keycloak_url}/realms/{self.realm}/protocol/openid-connect/token"
            
            data = {
                "grant_type": "refresh_token",
                "client_id": self.client_id,
                "refresh_token": refresh_token
            }
            
            if self.client_secret:
                data["client_secret"] = self.client_secret

            response = requests.post(token_url, data=data, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                error_data = response.json() if response.content else {}
                return {
                    "error": error_data.get("error", "token_refresh_failed"),
                    "error_description": error_data.get("error_description", "Token refresh failed")
                }
                
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return {
                "error": "service_unavailable",
                "error_description": "Token refresh service unavailable"
            }

    def validate_token(self, token: str) -> Dict[str, Any]:
        """Validate and decode JWT token - synchronous method"""
        try:
            userinfo_url = f"{self.keycloak_url}/realms/{self.realm}/protocol/openid-connect/userinfo"
            
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(userinfo_url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": "invalid_token"}
                
        except Exception as e:
            logger.error(f"Token validation failed: {e}")
            return {"error": "validation_failed"}

    def logout(self, refresh_token: str) -> bool:
        """Logout user by invalidating refresh token"""
        try:
            logout_url = f"{self.keycloak_url}/realms/{self.realm}/protocol/openid-connect/logout"
            
            data = {
                "client_id": self.client_id,
                "refresh_token": refresh_token
            }
            
            if self.client_secret:
                data["client_secret"] = self.client_secret

            response = requests.post(logout_url, data=data, timeout=10)
            return response.status_code in [200, 204]
            
        except Exception as e:
            logger.error(f"Logout failed: {e}")
            return False

    def create_user(self, username: str, email: str, password: str, first_name: str = "", last_name: str = "") -> bool:
        """Create a new user in Keycloak"""
        try:
            # First get admin token
            admin_token = self._get_admin_token()
            if not admin_token:
                return False

            users_url = f"{self.keycloak_url}/admin/realms/{self.realm}/users"
            
            user_data = {
                "username": username,
                "email": email,
                "firstName": first_name,
                "lastName": last_name,
                "enabled": True,
                "credentials": [{
                    "type": "password",
                    "value": password,
                    "temporary": False
                }]
            }
            
            headers = {
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(users_url, json=user_data, headers=headers, timeout=10)
            return response.status_code == 201
            
        except Exception as e:
            logger.error(f"User creation failed: {e}")
            return False

    def get_user_info(self, user_id: str) -> Dict[str, Any]:
        """Get user information from Keycloak - synchronous method"""
        try:
            admin_token = self._get_admin_token()
            if not admin_token:
                return {"error": "admin_token_failed"}

            user_url = f"{self.keycloak_url}/admin/realms/{self.realm}/users/{user_id}"
            
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.get(user_url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                return {"preferred_username": "Unknown User", "email": "No email"}
                
        except Exception as e:
            logger.error(f"Get user info failed: {e}")
            return {"preferred_username": "Unknown User", "email": "No email"}

    def assign_dataset_permission(self, user_id: str, dataset_id: int, permission: str) -> bool:
        """Assign dataset permission role to user"""
        try:
            admin_token = self._get_admin_token()
            if not admin_token:
                return False

            # In a real implementation, you would create and assign roles
            # For now, we'll just return True as a placeholder
            logger.info(f"Assigning permission {permission} for dataset {dataset_id} to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Role assignment failed: {e}")
            return False

    def _get_admin_token(self) -> Optional[str]:
        """Get admin token for administrative operations"""
        try:
            token_url = f"{self.keycloak_url}/realms/master/protocol/openid-connect/token"
            
            data = {
                "grant_type": "password",
                "client_id": "admin-cli",
                "username": self.admin_username,
                "password": self.admin_password
            }
            
            response = requests.post(token_url, data=data, timeout=10)
            
            if response.status_code == 200:
                return response.json().get("access_token")
            else:
                logger.error(f"Admin token request failed: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Admin token request failed: {e}")
            return None
