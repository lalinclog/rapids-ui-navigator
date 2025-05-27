
import os
import sys
import logging
import asyncio
from services.keycloak_service import KeycloakService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(stream=sys.stdout)]
)
logger = logging.getLogger(__name__)

async def initialize_keycloak():
    """Initialize Keycloak with default roles and users"""
    logger.info("Initializing Keycloak...")
    
    keycloak = KeycloakService()
    
    # First ensure we can connect to Keycloak
    try:
        connected = await keycloak.check_connection()
        if not connected:
            logger.error("Cannot connect to Keycloak. Initialization failed.")
            return False
    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
        return False
    
    # Ensure session is created
    await keycloak._ensure_session()
    
    # Get admin token
    admin_token = await keycloak.get_admin_token()
    if not admin_token:
        logger.error("Failed to obtain admin token. Initialization failed.")
        return False
    
    # Create default roles if they don't exist
    default_roles = [
        {"name": "admin", "description": "Administrator with full access"},
        {"name": "engineer", "description": "Engineer role for development tasks"},
        {"name": "data_steward", "description": "Data steward for data governance"},
        {"name": "analyst", "description": "Analyst for data analysis"},
        {"name": "department_role", "description": "Department-specific access role"}
    ]
    
    for role in default_roles:
        try:
            await keycloak.create_role(role["name"], role["description"])
        except Exception as e:
            logger.warning(f"Could not create role {role['name']}: {str(e)}")
    
    # Create default users if they don't exist
    default_users = [
        {"username": "admin_user", "email": "admin@example.com", "password": "admin123", "roles": ["admin"]},
        {"username": "engineer_user", "email": "engineer@example.com", "password": "engineer123", "roles": ["engineer"]},
        {"username": "data_steward_user", "email": "data.steward@example.com", "password": "steward123", "roles": ["data_steward"]},
        {"username": "analyst_user", "email": "analyst@example.com", "password": "analyst123", "roles": ["analyst"]},
    ]
    
    for user in default_users:
        try:
            success = await keycloak.create_user(
                username=user["username"],
                email=user["email"],
                password=user["password"]
            )
            
            if success:
                # Assign roles
                for role in user["roles"]:
                    await keycloak.assign_role_to_user(user["username"], role)
        except Exception as e:
            logger.warning(f"Could not create user {user['username']}: {str(e)}")
    
    logger.info("Keycloak initialization completed")
    await keycloak.close()
    return True

def run_initialization():
    """Run initialization tasks"""
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(initialize_keycloak())
    except Exception as e:
        logger.error(f"Initialization error: {str(e)}")
        return False
    return True

if __name__ == "__main__":
    if not run_initialization():
        sys.exit(1)