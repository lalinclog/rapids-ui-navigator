import logging
from fastapi import FastAPI
from .keycloak_service import KeycloakService
from .async_postgres_service import AsyncPostgresService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_lifecycle_events(app: FastAPI):
    """Setup application startup and shutdown events"""
    
    @app.on_event("startup")
    async def startup_event():
        """Initialize services on application startup"""
        logger.info("Starting application services...")
        
        # Initialize Keycloak service
        keycloak_service = KeycloakService()
        await keycloak_service._ensure_session()
        
        # Check Keycloak connection
        keycloak_alive = await keycloak_service.check_connection()
        logger.info(f"Keycloak connection check: {'OK' if keycloak_alive else 'FAILED'}")
        
        # Initialize database pool
        postgres_service = AsyncPostgresService()
        await postgres_service.create_pool()
        
        logger.info("Application services started successfully")

    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup resources on application shutdown"""
        logger.info("Shutting down application services...")
        
        # Close Keycloak session
        keycloak_service = KeycloakService()
        await keycloak_service.close()
        
        # Close database pool
        postgres_service = AsyncPostgresService()
        await postgres_service.close()
        
        logger.info("Application services shut down successfully")