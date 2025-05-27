
import os
import requests
import asyncio
import aiohttp
import logging
import time
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KeycloakService:
    _instance = None
    _lock = asyncio.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(KeycloakService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.base_url = os.environ.get("KEYCLOAK_URL", "http://keycloak:8081")
            self.realm = os.environ.get("KEYCLOAK_REALM", "rapids-realm")
            self.client_id = os.environ.get("KEYCLOAK_CLIENT_ID", "rapids-api")
            self.client_secret = os.environ.get("KEYCLOAK_CLIENT_SECRET", "rapids-api-secret")
            self.admin_username = os.environ.get("KEYCLOAK_ADMIN", "admin")
            self.admin_password = os.environ.get("KEYCLOAK_ADMIN_PASSWORD", "admin")
            self.admin_token = None
            
            # Connection management pool settings
            self.session = None
            self.session_timeout = aiohttp.ClientTimeout(total=30)
            self.last_refresh_time = datetime.min
            self.refresh_cooldown = timedelta(seconds=2)  # Minimum time between refresh calls
            
            # Circuit breaker pattern
            self.circuit_open = False
            self.circuit_open_time = None
            self.circuit_timeout = timedelta(seconds=30)
            self.failure_threshold = 5
            self.failure_counter = 0
            
            # Rate limiting settings
            self.rate_limit_window = timedelta(minutes=1)
            self.rate_limit_max_calls = 30
            self.call_history = []
            
            logger.info(f"KeycloakService initialized with base URL: {self.base_url}")
            self.initialized = True

    async def _ensure_session(self):
        """Maintain a persistent connection pool"""
        if self.session is None or self.session.closed:
            connector = aiohttp.TCPConnector(
                limit=100,  # Max connections
                limit_per_host=20,  # Max connections per host
                enable_cleanup_closed=True,
                force_close=False,
                keepalive_timeout=60,  # Keep connections alive for 60 seconds
                ttl_dns_cache=300  # Cache DNS lookups for 5 minutes
            )
            self.session = aiohttp.ClientSession(
                connector=connector,
                timeout=self.session_timeout,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            logger.info("Created new aiohttp session with connection pooling")

    async def _check_circuit(self):
        """Check if circuit breaker should be opened/closed"""
        if self.circuit_open:
            if datetime.now() - self.circuit_open_time > self.circuit_timeout:
                logger.warning("Circuit breaker reset to closed state")
                self.circuit_open = False
                self.failure_counter = 0
            else:
                logger.warning("Circuit breaker is open, request rejected")
                raise Exception("Keycloak service unavailable (circuit breaker open)")

    async def _check_rate_limit(self):
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
                    logger.error(f"Circuit breaker opened after {self.failure_counter} failures")
                
                # Last attempt, propagate the error
                if attempt == max_retries - 1:
                    logger.error(f"Keycloak request failed after {max_retries} attempts: {str(e)}")
                    raise
                    
                # Calculate backoff time with jitter
                backoff = (backoff_factor ** attempt) + (0.1 * random.random())
                logger.warning(f"Request attempt {attempt + 1} failed, retrying in {backoff:.2f}s: {str(e)}")
                await asyncio.sleep(backoff)

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token with rate limiting and circuit breaking"""
        try:
            # Thread safety with lock to prevent concurrent refresh attempts
            async with self._lock:
                # Rate limiting for refresh operations
                now = datetime.now()
                if now - self.last_refresh_time < self.refresh_cooldown:
                    cooldown_remaining = (self.refresh_cooldown - (now - self.last_refresh_time)).total_seconds()
                    logger.info(f"Rate limiting refresh token attempt, waiting {cooldown_remaining:.2f}s")
                    await asyncio.sleep(cooldown_remaining)
                
                url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/token"
                data = {
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                }
                
                result = await self._request_with_retry(
                    self.session.post,
                    url,
                    data=data
                )
                
                self.last_refresh_time = datetime.now()
                return result
                
        except aiohttp.ClientResponseError as e:
            if e.status == 400:
                logger.error("Invalid refresh token (possibly expired or revoked)")
                return {"error": "invalid_grant", "error_description": "Invalid refresh token"}
            raise
        except Exception as e:
            logger.error(f"Refresh token failed: {str(e)}", exc_info=True)
            return {"error": "refresh_failed", "error_description": str(e)}
        
    async def validate_token(self, token: str) -> Dict[str, Any]:
        """Async token validation"""
        try:
            await self._ensure_session()
            url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/userinfo"
            headers = {"Authorization": f"Bearer {token}"}
            
            async with self.session.get(url, headers=headers) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(f"Token validation failed: {response.status} {error}")
                    return {"error": "token_validation_failed", "error_description": error}
                    
                return await response.json()
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}", exc_info=True)
            return {"error": str(e)}

    async def get_token(self, username: str, password: str) -> Dict[str, Any]:
        """Async version of get_token"""
        try:
            await self._ensure_session()
            url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/token"
            data = {
                "username": username,
                "password": password,
                "grant_type": "password",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "scope": "openid"
            }
            
            async with self.session.post(url, data=data) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(f"Token request failed: {response.status} {error}")
                    return {"error": "authentication_failed", "error_description": error}
                return await response.json()
        except Exception as e:
            logger.error(f"Failed to get token: {str(e)}", exc_info=True)
            return {"error": "token_error", "error_description": str(e)}

    async def logout(self, refresh_token: str) -> bool:
        """Async logout by invalidating the refresh token"""
        try:
            logger.info("Logging out user")
            await self._ensure_session()
            url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/logout"
            payload = {
                "refresh_token": refresh_token,
                "client_id": self.client_id,
            }
            
            # Add client_secret if available
            if self.client_secret:
                payload["client_secret"] = self.client_secret
                
            async with self.session.post(url, data=payload) as response:
                if response.status >= 200 and response.status < 300:
                    logger.info("Successfully logged out user")
                    return True
                else:
                    error = await response.text()
                    logger.error(f"Logout failed: {response.status} {error}")
                    return False
        except Exception as e:
            logger.error(f"Logout error: {str(e)}", exc_info=True)
            return False

    async def get_admin_token(self) -> Optional[str]:
        """Get admin access token from Keycloak (async)"""
        try:
            logger.info("Getting admin token from Keycloak")
            await self._ensure_session()
            url = f"{self.base_url}/realms/master/protocol/openid-connect/token"
            payload = {
                "username": self.admin_username,
                "password": self.admin_password,
                "grant_type": "password",
                "client_id": "admin-cli",
            }
            
            async with self.session.post(url, data=payload) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(f"Admin token request failed: {response.status} {error}")
                    return None
                    
                token_data = await response.json()
                self.admin_token = token_data["access_token"]
                logger.info("Successfully obtained admin token")
                return self.admin_token
        except Exception as e:
            logger.error(f"Failed to get admin token: {str(e)}", exc_info=True)
            return None

    async def get_public_key(self) -> Optional[str]:
        """Get the public key for token verification (async)"""
        try:
            logger.info("Getting Keycloak realm public key")
            await self._ensure_session()
            url = f"{self.base_url}/realms/{self.realm}"
            
            async with self.session.get(url) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(f"Failed to get realm info: {response.status} {error}")
                    return None
                    
                realm_info = await response.json()
                public_key = realm_info.get("public_key")
                logger.info("Successfully obtained realm public key")
                return public_key
        except Exception as e:
            logger.error(f"Failed to get public key: {str(e)}", exc_info=True)
            return None

    async def check_connection(self) -> bool:
        """Check if Keycloak is accessible (async)"""
        try:
            logger.info("Checking connection to Keycloak")
            await self._ensure_session()
            url = f"{self.base_url}/health"
            
            # Use a shorter timeout for health checks
            timeout = aiohttp.ClientTimeout(total=5)
            async with self.session.get(url, timeout=timeout) as response:
                if response.status != 200:
                    logger.warning(f"Keycloak health check failed: {response.status}")
                    return False
                    
                logger.info("Keycloak connection successful")
                return True
        except Exception as e:
            logger.error(f"Keycloak connection check failed: {str(e)}")
            return False

    async def create_user(self, username: str, email: str, password: str, first_name: str = "", last_name: str = "") -> bool:
        """Create a new user in Keycloak (async)"""
        if not self.admin_token:
            self.admin_token = await self.get_admin_token()
            
        if not self.admin_token:
            logger.error("Failed to get admin token, cannot create user")
            return False
            
        try:
            logger.info(f"Creating new user: {username}")
            await self._ensure_session()
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
            
            async with self.session.post(url, headers=headers, json=payload) as response:
                if response.status != 201:
                    error = await response.text()
                    logger.error(f"Failed to create user {username}: {response.status} {error}")
                    return False
                    
                logger.info(f"User {username} created successfully")
                return True
        except Exception as e:
            logger.error(f"Failed to create user {username}: {str(e)}", exc_info=True)
            return False

    # New methods for role and permission management
    async def get_user_roles(self, username: str) -> List[Dict[str, Any]]:
        """Get a user's roles (async)"""
        if not self.admin_token:
            self.admin_token = await self.get_admin_token()
            
        if not self.admin_token:
            logger.error("Failed to get admin token, cannot get user roles")
            return []
            
        try:
            # Get user ID first
            user_id = await self._get_user_id(username)
            if not user_id:
                return []
                
            await self._ensure_session()
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
            
            url = f"{self.base_url}/admin/realms/{self.realm}/users/{user_id}/role-mappings/realm"
            async with self.session.get(url, headers=headers) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(f"Failed to get roles for user {username}: {response.status} {error}")
                    return []
                    
                return await response.json()
        except Exception as e:
            logger.error(f"Failed to get roles for user {username}: {str(e)}", exc_info=True)
            return []

    async def assign_role_to_user(self, username: str, role_name: str) -> bool:
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
            
            url = f"{self.base_url}/admin/realms/{self.realm}/users/{user_id}/role-mappings/realm"
            async with self.session.post(url, headers=headers, json=[role]) as response:
                if response.status != 204:
                    error = await response.text()
                    logger.error(f"Failed to assign role {role_name} to user {username}: {response.status} {error}")
                    return False
                    
                logger.info(f"Assigned role {role_name} to user {username}")
                return True
        except Exception as e:
            logger.error(f"Failed to assign role {role_name} to user {username}: {str(e)}", exc_info=True)
            return False

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
            url = f"{self.base_url}/admin/realms/{self.realm}/roles"
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
                    logger.error(f"Failed to create role {role_name}: {response.status} {error}")
                    return False
                    
                logger.info(f"Role {role_name} created successfully")
                return True
        except Exception as e:
            logger.error(f"Failed to create role {role_name}: {str(e)}", exc_info=True)
            return False

    async def create_dataset_role(self, dataset_id: int, permission: str = "read") -> bool:
        """Create a dataset-specific role (async)"""
        role_name = f"dataset:{permission}:{dataset_id}"
        description = f"{permission.capitalize()} permission for dataset {dataset_id}"
        
        return await self.create_role(role_name, description)

    async def assign_dataset_permission(self, username: str, dataset_id: int, permission: str = "read") -> bool:
        """Assign dataset permission to a user (async)"""
        role_name = f"dataset:{permission}:{dataset_id}"
        
        # First check if the role exists, if not create it
        if not await self._role_exists(role_name):
            success = await self.create_dataset_role(dataset_id, permission)
            if not success:
                return False
        
        # Now assign the role to the user
        return await self.assign_role_to_user(username, role_name)

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
            
            url = f"{self.base_url}/admin/realms/{self.realm}/users?username={username}"
            async with self.session.get(url, headers=headers) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(f"Failed to get user {username}: {response.status} {error}")
                    return None
                    
                users = await response.json()
                if not users:
                    logger.error(f"User {username} not found")
                    return None
                    
                return users[0]["id"]
        except Exception as e:
            logger.error(f"Failed to get user ID for {username}: {str(e)}", exc_info=True)
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
            
            url = f"{self.base_url}/admin/realms/{self.realm}/roles/{role_name}"
            async with self.session.get(url, headers=headers) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(f"Failed to get role {role_name}: {response.status} {error}")
                    return None
                    
                return await response.json()
        except Exception as e:
            logger.error(f"Failed to get role {role_name}: {str(e)}", exc_info=True)
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

    async def get_user_info(self, user_id: str) -> Dict[str, Any]:
        """Get user info from Keycloak by user ID (async)"""
        if not self.admin_token:
            self.admin_token = await self.get_admin_token()
            
        if not self.admin_token:
            logger.error("Failed to get admin token, cannot fetch user info")
            return {}
            
        try:
            await self._ensure_session()
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
            
            url = f"{self.base_url}/admin/realms/{self.realm}/users/{user_id}"
            async with self.session.get(url, headers=headers) as response:
                if response.status != 200:
                    error = await response.text()
                    logger.error(f"Failed to get user info for ID {user_id}: {response.status} {error}")
                    return {}
                    
                user_info = await response.json()
                
                # Return a simplified user info structure
                return {
                    "preferred_username": user_info.get("username"),
                    "email": user_info.get("email"),
                    "firstName": user_info.get("firstName", ""),
                    "lastName": user_info.get("lastName", ""),
                    "id": user_info.get("id")
                }
        except Exception as e:
            logger.error(f"Failed to get user info for ID {user_id}: {str(e)}", exc_info=True)
            return {
                "preferred_username": "Unknown User",
                "email": "No email",
                "firstName": "",
                "lastName": "",
                "id": user_id
            }