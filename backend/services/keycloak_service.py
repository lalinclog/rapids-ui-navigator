
import os
import requests
import logging
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
import hashlib
import time
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class KeycloakService:
    def __init__(self):
        self.keycloak_url = os.environ.get(
            "KEYCLOAK_URL", "http://keycloak:8081")
        self.realm = os.environ.get("KEYCLOAK_REALM", "rapids-realm")
        self.client_id = os.environ.get("KEYCLOAK_CLIENT_ID", "rapids-api")
        self.client_secret = os.environ.get(
            "KEYCLOAK_CLIENT_SECRET", "rapids-api-secret")

        # For admin operations
        self.admin_username = os.environ.get("KEYCLOAK_ADMIN", "admin")
        self.admin_password = os.environ.get(
            "KEYCLOAK_ADMIN_PASSWORD", "admin")
        self.admin_token = None
        self.admin_token_expires = None

        # Rate limiting and circuit breaker
        self.rate_limit_window = timedelta(minutes=1)
        self.rate_limit_max_calls = 30
        self.call_history = []
        
        self.failure_counter = 0
        self.failure_threshold = 3
        self.circuit_open = False
        self.circuit_open_time = None
        self.circuit_reset_timeout = timedelta(seconds=30)

        logger.info(
            f"KeycloakService initialized with base URL: {self.keycloak_url}")

    # ... keep existing code (all existing methods remain the same)

    def check_connection(self) -> bool:
        """Check if Keycloak is accessible"""
        try:
            logger.info("Checking connection to Keycloak")
            response = requests.get(
                f"{self.keycloak_url}/realms/{self.realm}", timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Keycloak connection check failed: {str(e)}")
            return False

    def get_token(self, username: str, password: str) -> Dict[str, Any]:
        """Get access token from Keycloak - synchronous method"""
        try:
            token_url = f"{self.keycloak_url}/realms/{self.realm}/protocol/openid-connect/token"
            data = {
                "username": username,
                "password": password,
                "grant_type": "password",
                "client_id": self.client_id,
                "scope": "openid"
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
            logger.error(f"Failed to get token: {str(e)}", exc_info=True)
            return {
                "error": "service_unavailable",
                "error_description": "Authentication service unavailable"
            }

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token with rate limiting and circuit breaking"""
        try:
            self._check_rate_limit()
            self._check_circuit()
            
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
                # Reset failure counter on success
                self.failure_counter = 0
                self.circuit_open = False
                return response.json()
            else:
                error_data = response.json() if response.content else {}
                self._handle_failure()
                return {
                    "error": error_data.get("error", "token_refresh_failed"),
                    "error_description": error_data.get("error_description", "Token refresh failed")
                }

        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            self._handle_failure()
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
                "refresh_token": refresh_token,
                "client_id": self.client_id,
            }
            # Add client_secret if available
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

            response = requests.post(
                users_url, json=user_data, headers=headers, timeout=10)
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
                user_data = response.json()
                # Return a simplified user info structure
                return {
                    "preferred_username": user_data.get("username"),
                    "email": user_data.get("email"),
                    "firstName": user_data.get("firstName", ""),
                    "lastName": user_data.get("lastName", ""),
                    "id": user_data.get("id")
                }
            else:
                return {
                    "preferred_username": "Unknown User",
                    "email": "No email",
                    "firstName": "",
                    "lastName": "",
                    "id": user_id
                }

        except Exception as e:
            logger.error(
                f"Failed to get user info for ID {user_id}: {str(e)}", exc_info=True)
            return {"preferred_username": "Unknown User", "email": "No email"}

    def get_all_users(self) -> List[Dict[str, Any]]:
        """Get all users from Keycloak"""
        admin_token = self._get_admin_token()
        if not admin_token:
            logger.error("Failed to get admin token, cannot get users")
            return []

        try:
            headers = {
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            }

            url = f"{self.keycloak_url}/admin/realms/{self.realm}/users"
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"Failed to get users: {response.status_code} {response.text}")
                return []

            users = response.json()
            return [{
                "id": user.get("id"),
                "username": user.get("username"),
                "email": user.get("email", ""),
                "firstName": user.get("firstName", ""),
                "lastName": user.get("lastName", ""),
                "enabled": user.get("enabled", False)
            } for user in users]
            
        except Exception as e:
            logger.error(f"Failed to get users: {str(e)}", exc_info=True)
            return []

    def get_all_groups(self) -> List[Dict[str, Any]]:
        """Get all groups from Keycloak"""
        admin_token = self._get_admin_token()
        if not admin_token:
            logger.error("Failed to get admin token, cannot get groups")
            return []

        try:
            headers = {
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            }

            url = f"{self.keycloak_url}/admin/realms/{self.realm}/groups"
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"Failed to get groups: {response.status_code} {response.text}")
                return []

            groups = response.json()
            return [{
                "id": group.get("id"),
                "name": group.get("name"),
                "path": group.get("path", ""),
                "subGroups": group.get("subGroups", [])
            } for group in groups]
            
        except Exception as e:
            logger.error(f"Failed to get groups: {str(e)}", exc_info=True)
            return []

    def get_user_roles(self, username: str) -> List[Dict[str, Any]]:
        """Get a user's roles"""
        admin_token = self._get_admin_token()
        if not admin_token:
            logger.error("Failed to get admin token, cannot get user roles")
            return []

        try:
            # Get user ID first
            user_id = self._get_user_id(username)
            if not user_id:
                return []

            headers = {
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            }

            url = f"{self.keycloak_url}/admin/realms/{self.realm}/users/{user_id}/role-mappings/realm"
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"Failed to get roles for user {username}: {response.status_code} {response.text}")
                return []

            return response.json()
        except Exception as e:
            logger.error(f"Failed to get roles for user {username}: {str(e)}", exc_info=True)
            return []

    def assign_dataset_permission(self, username: str, dataset_id: int, permission: str = "read") -> bool:
        """Assign dataset permission to a user"""
        role_name = f"dataset:{permission}:{dataset_id}"
        try:
            # First check if the role exists, if not create it
            if not self._role_exists(role_name):
                success = self.create_dataset_role(dataset_id, permission)
                if not success:
                    return False

            # Now assign the role to the user
            return self.assign_role_to_user(username, role_name)
        except Exception as e:
            logger.error(f"Role assignment failed: {e}")
            return False

    def assign_role_to_user(self, username: str, role_name: str) -> bool:
        """Assign a role to a user"""
        admin_token = self._get_admin_token()
        if not admin_token:
            logger.error("Failed to get admin token, cannot assign role")
            return False

        try:
            # Get user ID
            user_id = self._get_user_id(username)
            if not user_id:
                return False

            # Get role
            role = self._get_role(role_name)
            if not role:
                return False

            headers = {
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            }

            url = f"{self.keycloak_url}/admin/realms/{self.realm}/users/{user_id}/role-mappings/realm"
            response = requests.post(url, headers=headers, json=[role], timeout=10)
            
            if response.status_code != 204:
                logger.error(f"Failed to assign role {role_name} to user {username}: {response.status_code} {response.text}")
                return False

            logger.info(f"Assigned role {role_name} to user {username}")
            return True
        except Exception as e:
            logger.error(f"Failed to assign role {role_name} to user {username}: {str(e)}", exc_info=True)
            return False

    def get_public_key(self) -> Optional[str]:
        """Get the public key for token verification"""
        try:
            logger.info("Getting Keycloak realm public key")
            url = f"{self.keycloak_url}/realms/{self.realm}"

            response = requests.get(url, timeout=10)
            if response.status_code != 200:
                logger.error(f"Failed to get realm info: {response.status_code} {response.text}")
                return None

            realm_info = response.json()
            public_key = realm_info.get("public_key")
            logger.info("Successfully obtained realm public key")
            return public_key
        except Exception as e:
            logger.error(f"Failed to get public key: {str(e)}", exc_info=True)
            return None

    def create_role(self, role_name: str, description: str = "") -> bool:
        """Create a new role in Keycloak"""
        admin_token = self._get_admin_token()
        if not admin_token:
            logger.error("Failed to get admin token, cannot create role")
            return False

        try:
            logger.info(f"Creating new role: {role_name}")
            url = f"{self.keycloak_url}/admin/realms/{self.realm}/roles"
            headers = {
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            }

            payload = {
                "name": role_name,
                "description": description
            }

            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code != 201:
                logger.error(f"Failed to create role {role_name}: {response.status_code} {response.text}")
                return False

            logger.info(f"Role {role_name} created successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to create role {role_name}: {str(e)}", exc_info=True)
            return False

    def create_dataset_role(self, dataset_id: int, permission: str = "read") -> bool:
        """Create a dataset-specific role"""
        role_name = f"dataset:{permission}:{dataset_id}"
        description = f"{permission.capitalize()} permission for dataset {dataset_id}"
        return self.create_role(role_name, description)

    def _get_admin_token(self) -> Optional[str]:
        """Get admin token from Keycloak for administrative operations"""
        # Check if we have a valid cached token
        if (self.admin_token and self.admin_token_expires and 
            datetime.now() < self.admin_token_expires):
            return self.admin_token

        try:
            logger.info("Getting admin token from Keycloak")
            token_url = f"{self.keycloak_url}/realms/master/protocol/openid-connect/token"

            data = {
                "grant_type": "password",
                "client_id": "admin-cli",
                "username": self.admin_username,
                "password": self.admin_password
            }

            response = requests.post(token_url, data=data, timeout=10)

            if response.status_code == 200:
                token_data = response.json()
                self.admin_token = token_data.get("access_token")
                # Cache token for 5 minutes (expires_in is usually much longer)
                self.admin_token_expires = datetime.now() + timedelta(minutes=5)
                return self.admin_token
            else:
                logger.error(f"Admin token request failed: {response.status_code}")
                return None

        except Exception as e:
            logger.error(f"Failed to get admin token: {str(e)}", exc_info=True)
        return None

    def _get_user_id(self, username: str) -> Optional[str]:
        """Get user ID from username"""
        admin_token = self._get_admin_token()
        if not admin_token:
            return None

        try:
            headers = {
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            }

            url = f"{self.keycloak_url}/admin/realms/{self.realm}/users?username={username}"
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"Failed to get user {username}: {response.status_code} {response.text}")
                return None

            users = response.json()
            if not users:
                logger.error(f"User {username} not found")
                return None

            return users[0]["id"]
        except Exception as e:
            logger.error(f"Failed to get user ID for {username}: {str(e)}", exc_info=True)
            return None

    def _get_role(self, role_name: str) -> Optional[Dict[str, Any]]:
        """Get role details"""
        admin_token = self._get_admin_token()
        if not admin_token:
            return None

        try:
            headers = {
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            }

            url = f"{self.keycloak_url}/admin/realms/{self.realm}/roles/{role_name}"
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"Failed to get role {role_name}: {response.status_code} {response.text}")
                return None

            return response.json()
        except Exception as e:
            logger.error(f"Failed to get role {role_name}: {str(e)}", exc_info=True)
            return None

    def _role_exists(self, role_name: str) -> bool:
        """Check if a role exists"""
        return self._get_role(role_name) is not None

    def _check_rate_limit(self):
        """Check if we're exceeding the rate limit"""
        now = datetime.now()
        # Remove calls outside the current window
        self.call_history = [t for t in self.call_history if now - t < self.rate_limit_window]

        # Check if we're at the limit
        if len(self.call_history) >= self.rate_limit_max_calls:
            logger.warning(f"Rate limit exceeded: {len(self.call_history)} calls in the last {self.rate_limit_window}")
            # Wait until we can make another call
            oldest_call = self.call_history[0]
            wait_time = (oldest_call + self.rate_limit_window) - now
            if wait_time.total_seconds() > 0:
                logger.info(f"Rate limiting: waiting for {wait_time.total_seconds():.2f} seconds")
                time.sleep(wait_time.total_seconds())

        # Record this call
        self.call_history.append(now)

    def _check_circuit(self):
        """Check if the circuit breaker is open"""
        if self.circuit_open:
            now = datetime.now()
            if self.circuit_open_time and now - self.circuit_open_time > self.circuit_reset_timeout:
                # Reset circuit breaker after timeout
                logger.info("Circuit breaker reset after timeout")
                self.circuit_open = False
                self.failure_counter = 0
                self.circuit_open_time = None
            else:
                # Circuit is open, raise exception
                logger.warning("Circuit breaker open, not attempting request")
                raise Exception("Authentication service unavailable (circuit breaker open)")

    def _handle_failure(self):
        """Handle request failure for circuit breaker"""
        self.failure_counter += 1
        if self.failure_counter >= self.failure_threshold:
            self.circuit_open = True
            self.circuit_open_time = datetime.now()
            logger.error(f"Circuit breaker opened after {self.failure_counter} failures")
