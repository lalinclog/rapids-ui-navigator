
from fastapi import APIRouter, Depends, HTTPException, status, Form
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
    """Forward login request to Keycloak and return the token response"""
    try:
        token_response = keycloak_service.get_token(
            username=form_data.username,
            password=form_data.password
        )
        
        if "error" in token_response:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=token_response.get("error_description", "Login failed"),
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return token_response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/auth/refresh")
async def refresh_token(refresh_token: str = Form(...)):
    """Refresh an access token using a refresh token"""
    try:
        token_response = keycloak_service.refresh_token(refresh_token)
        
        if "error" in token_response:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=token_response.get("error_description", "Token refresh failed"),
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return token_response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/auth/user")
async def get_user_info(current_user: dict = Depends(get_current_user)):
    return current_user

@router.post("/auth/logout")
async def logout(refresh_token: str = Form(None)):
    """Logout from Keycloak by invalidating the session/token"""
    if refresh_token:
        try:
            result = keycloak_service.logout(refresh_token)
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to logout from Keycloak"
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )
    
    return {"message": "Logged out successfully"}
