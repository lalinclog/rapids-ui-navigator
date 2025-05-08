
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from .keycloak_service import KeycloakService

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
keycloak_service = KeycloakService()

# Dependency for protected routes
async def get_current_user(token: str = Depends(oauth2_scheme)):
    user_info = keycloak_service.validate_token(token)
    if "error" in user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_info

@router.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # This will be implemented to forward to Keycloak
    pass

@router.get("/auth/user")
async def get_user_info(current_user: dict = Depends(get_current_user)):
    return current_user

@router.post("/auth/logout")
async def logout():
    # This would invalidate the token in Keycloak if needed
    return {"message": "Logged out successfully"}
