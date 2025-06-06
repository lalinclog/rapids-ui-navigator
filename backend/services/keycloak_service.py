
import os
import requests
import asyncio
# import aiohttp
import logging
# import time
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta

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

        logger.info(
            f"KeycloakService initialized with base URL: {self.keycloak_url}")
        self.initialized = True

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
                # Return a simplified user info structure
                return {
                    "preferred_username": response.get("username"),
                    "email": response.get("email"),
                    "firstName": response.get("firstName", ""),
                    "lastName": response.get("lastName", ""),
                    "id": response.get("id")
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

    # New methods for role and permission management

    def get_user_roles(self, username: str) -> List[Dict[str, Any]]:
        """Get a user's roles (async)"""
        if not self.admin_token:
            self.admin_token = self.get_admin_token()

        if not self.admin_token:
            logger.error("Failed to get admin token, cannot get user roles")
            return []

        try:
            # Get user ID first
            user_id = self._get_user_id(username)
            if not user_id:
                return []

            self._ensure_session()
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }

            url = f"{self.keycloak_url}/admin/realms/{self.realm}/users/{user_id}/role-mappings/realm"
            async with self.session.get(url, headers=headers) as response:
                if response.status != 200:
                    error = response.text()
                    logger.error(
                        f"Failed to get roles for user {username}: {response.status} {error}")
                    return []

                return response.json()
        except Exception as e:
            logger.error(
                f"Failed to get roles for user {username}: {str(e)}", exc_info=True)
            return []

    def assign_dataset_permission(self, username: str, dataset_id: int, permission: str = "read") -> bool:
        """Assign dataset permission to a user (async)"""
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

    def _get_admin_token(self) -> Optional[str]:
        """Get admin token from Keycloak for administrative operations"""
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
                return response.json().get("access_token")
            else:
                logger.error(
                    f"Admin token request failed: {response.status_code}")
                return None

        except Exception as e:
            logger.error(f"Failed to get admin token: {str(e)}", exc_info=True)
        return None

    def assign_role_to_user(self, username: str, role_name: str) -> bool:
        """Assign a role to a user (async)"""
        if not self.admin_token:
            self.admin_token = await self.get_admin_token()

        if not self.admin_token:
            logger.error("Failed to get admin token, cannot assign role")
            return False

        try:
            # Get user ID
            user_id = await self._get_user_id(username)
            if not user_id:
                return False

            # Get role
            role = await self._get_role(role_name)
            if not role:
                return False

            await self._ensure_session()
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }

            url = f"{self.keycloak_url}/admin/realms/{self.realm}/users/{user_id}/role-mappings/realm"
            async with self.session.post(url, headers=headers, json=[role]) as response:
                if response.status != 204:
                    error = await response.text()
                    logger.error(
                        f"Failed to assign role {role_name} to user {username}: {response.status} {error}")
                    return False

                logger.info(f"Assigned role {role_name} to user {username}")
                return True
        except Exception as e:
            logger.error(
                f"Failed to assign role {role_name} to user {username}: {str(e)}", exc_info=True)
            return False

    async def get_public_key(self) -> Optional[str]:
        """Get the public key for token verification (async)"""
        try:
            logger.info("Getting Keycloak realm public key")
            await self._ensure_session()
            url = f"{self.keycloak_url}/realms/{self.realm}"

            async with self.session.get(url) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(
                        f"Failed to get realm info: {response.status} {error}")
                    return None

                realm_info = await response.json()
                public_key = realm_info.get("public_key")
                logger.info("Successfully obtained realm public key")
                return public_key
        except Exception as e:
            logger.error(f"Failed to get public key: {str(e)}", exc_info=True)
            return None

    async def create_role(self, role_name: str, description: str = "") -> bool:
        """Create a new role in Keycloak (async)"""
        if not self.admin_token:
            self.admin_token = await self.get_admin_token()

        if not self.admin_token:
            logger.error("Failed to get admin token, cannot create role")
            return False

        try:
            logger.info(f"Creating new role: {role_name}")
            await self._ensure_session()
            url = f"{self.keycloak_url}/admin/realms/{self.realm}/roles"
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }

            payload = {
                "name": role_name,
                "description": description
            }

            async with self.session.post(url, headers=headers, json=payload) as response:
                if response.status != 201:
                    error = await response.text()
                    logger.error(
                        f"Failed to create role {role_name}: {response.status} {error}")
                    return False

                logger.info(f"Role {role_name} created successfully")
                return True
        except Exception as e:
            logger.error(
                f"Failed to create role {role_name}: {str(e)}", exc_info=True)
            return False

    async def create_dataset_role(self, dataset_id: int, permission: str = "read") -> bool:
        """Create a dataset-specific role (async)"""
        role_name = f"dataset:{permission}:{dataset_id}"
        description = f"{permission.capitalize()} permission for dataset {dataset_id}"

        return await self.create_role(role_name, description)

    # Helper methods

    async def _get_user_id(self, username: str) -> Optional[str]:
        """Get user ID from username (async)"""
        if not self.admin_token:
            self.admin_token = await self.get_admin_token()

        if not self.admin_token:
            return None

        try:
            await self._ensure_session()
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }

            url = f"{self.keycloak_url}/admin/realms/{self.realm}/users?username={username}"
            async with self.session.get(url, headers=headers) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(
                        f"Failed to get user {username}: {response.status} {error}")
                    return None

                users = await response.json()
                if not users:
                    logger.error(f"User {username} not found")
                    return None

                return users[0]["id"]
        except Exception as e:
            logger.error(
                f"Failed to get user ID for {username}: {str(e)}", exc_info=True)
            return None

    async def _get_role(self, role_name: str) -> Optional[Dict[str, Any]]:
        """Get role details (async)"""
        if not self.admin_token:
            self.admin_token = await self.get_admin_token()

        if not self.admin_token:
            return None

        try:
            await self._ensure_session()
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }

            url = f"{self.keycloak_url}/admin/realms/{self.realm}/roles/{role_name}"
            async with self.session.get(url, headers=headers) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(
                        f"Failed to get role {role_name}: {response.status} {error}")
                    return None

                return await response.json()
        except Exception as e:
            logger.error(
                f"Failed to get role {role_name}: {str(e)}", exc_info=True)
            return None

    async def _role_exists(self, role_name: str) -> bool:
        """Check if a role exists (async)"""
        return await self._get_role(role_name) is not None

    # Missing import
    import random

    async def close(self):
        """Cleanup resources"""
        if self.session and not self.session.closed:
            await self.session.close()

    async def _check_rate_limit(self):
        """Check if we're exceeding the rate limit"""
        now = datetime.now()
        # Remove calls outside the current window
        self.call_history = [
            t for t in self.call_history if now - t < self.rate_limit_window]

        # Check if we're at the limit
        if len(self.call_history) >= self.rate_limit_max_calls:
            logger.warning(
                f"Rate limit exceeded: {len(self.call_history)} calls in the last {self.rate_limit_window}")
            # Wait until we can make another call
            oldest_call = self.call_history[0]
            wait_time = (oldest_call + self.rate_limit_window) - now
            if wait_time.total_seconds() > 0:
                logger.info(
                    f"Rate limiting: waiting for {wait_time.total_seconds():.2f} seconds")
                await asyncio.sleep(wait_time.total_seconds())
                # After waiting, recheck (recursive but bounded)
                return await self._check_rate_limit()

        # Record this call
        self.call_history.append(now)

    async def _request_with_retry(self, method, url, **kwargs):
        """Make Robust HTTP request with retry logic"""
        await self._ensure_session()
        await self._check_circuit()
        await self._check_rate_limit()

        max_retries = 3
        backoff_factor = 1.5

        for attempt in range(max_retries):
            try:
                async with method(url, **kwargs) as response:
                    if response.status >= 500:
                        raise aiohttp.ClientResponseError(
                            request_info=response.request_info,
                            history=response.history,
                            status=response.status,
                            message=f"Server error: {response.reason}"
                        )

                    # Successful response, reset failure counter
                    self.failure_counter = 0
                    return await response.json()

            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                # Increment failure counter
                self.failure_counter += 1

                # Check if we need to open the circuit
                if self.failure_counter >= self.failure_threshold:
                    self.circuit_open = True
                    self.circuit_open_time = datetime.now()
                    logger.error(
                        f"Circuit breaker opened after {self.failure_counter} failures")

                # Last attempt, propagate the error
                if attempt == max_retries - 1:
                    logger.error(
                        f"Keycloak request failed after {max_retries} attempts: {str(e)}")
                    raise

                # Calculate backoff time with jitter
                backoff = (backoff_factor ** attempt) + (0.1 * random.random())
                logger.warning(
                    f"Request attempt {attempt + 1} failed, retrying in {backoff:.2f}s: {str(e)}")
                await asyncio.sleep(backoff)
