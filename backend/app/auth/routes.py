from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2AuthorizationCodeBearer
from starlette.responses import JSONResponse
from authlib.integrations.starlette_client import OAuth
from .config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_DISCOVERY_URL
from .auth_handler import create_access_token, verify_token
from .models import User, Token
import os
import urllib.parse
import httpx

router = APIRouter()

# OAuth setup - will be initialized later
oauth = None

def init_oauth(app):
    """Initialize OAuth with the FastAPI app"""
    global oauth
    oauth = OAuth()
    
    # Register the Google OAuth client
    oauth.register(
        name='google',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url=GOOGLE_DISCOVERY_URL,
        client_kwargs={
            'scope': 'openid email profile'
        }
    )
    print(f"OAuth initialized with client_id: {GOOGLE_CLIENT_ID}")

@router.get('/test')
async def test_endpoint():
    """Simple test endpoint"""
    return {"message": "Auth routes are working", "client_id": GOOGLE_CLIENT_ID}

@router.get('/login/google')
async def login_via_google(request: Request):
    """Real Google OAuth redirect"""
    if not oauth:
        raise HTTPException(status_code=500, detail="OAuth not initialized")
    
    try:
        redirect_uri = str(request.url_for('auth_google_callback'))
        return await oauth.google.authorize_redirect(request, redirect_uri)
    except Exception as e:
        print(f"OAuth login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OAuth error: {str(e)}")

@router.get('/auth/google/callback')
async def auth_google_callback(request: Request):
    if not oauth:
        raise HTTPException(status_code=500, detail="OAuth not initialized")
        
    try:
        # Exchange authorization code for tokens
        token = await oauth.google.authorize_access_token(request)
        print(f"Received token response: {list(token.keys())}")
        
        # Try to get user info from ID token first, fallback to userinfo endpoint
        user_info = None
        try:
            user_info = await oauth.google.parse_id_token(request, token)
            print(f"Successfully parsed ID token: {user_info.get('email')}")
        except Exception as id_token_error:
            print(f"ID token parsing failed, trying userinfo endpoint: {str(id_token_error)}")
            # Fallback to userinfo endpoint
            try:
                user_info = await oauth.google.userinfo()
                print(f"Successfully got userinfo: {user_info.get('email')}")
            except Exception as userinfo_error:
                print(f"Userinfo endpoint failed: {str(userinfo_error)}")
                # Manual fallback using httpx
                async with httpx.AsyncClient() as client:
                    headers = {"Authorization": f"Bearer {token['access_token']}"}
                    response = await client.get("https://www.googleapis.com/oauth2/v2/userinfo", headers=headers)
                    if response.status_code == 200:
                        user_info = response.json()
                        print(f"Successfully got userinfo via manual request: {user_info.get('email')}")
                    else:
                        raise HTTPException(status_code=400, detail="Failed to fetch user info from Google.")
        
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to fetch user info from Google.")
        
        # Create JWT token with real user data
        access_token = create_access_token({
            "sub": user_info.get("email") or user_info.get("sub"), 
            "name": user_info.get("name"), 
            "picture": user_info.get("picture")
        })
        
        # Redirect to frontend with token in URL for cross-port development
        response = RedirectResponse(url=f"http://localhost:3000?token={access_token}")
        
        # Also set cookie for same-port requests
        response.set_cookie(
            key="access_token", 
            value=access_token, 
            httponly=True, 
            samesite="none",
            secure=False,
            path="/"
        )
        return response
    except Exception as e:
        print(f"OAuth callback error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Callback error: {str(e)}")

@router.get('/me', response_model=User)
async def get_me(request: Request):
    # Check for token in cookies first
    token = request.cookies.get("access_token")
    
    # If no cookie, check for Authorization header (for cross-port requests)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return User(email=payload["sub"], name=payload.get("name"), picture=payload.get("picture")) 