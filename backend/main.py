from fastapi import FastAPI
import logging
from starlette.middleware.sessions import SessionMiddleware

# Configure logging for production
from app.config.logging import configure_logging

# Import middleware configuration
from app.core.middleware import configure_cors

# Import authentication
from app.auth.routes import router as auth_router, init_oauth

# Import API routers
from app.api.panels import router as panels_router
from app.api.sot import router as sot_router
from app.api.reconciliation import router as reconciliation_router
from app.api.debug import router as debug_router
from app.api.users import router as users_router

app = FastAPI()

# Add SessionMiddleware for OAuth
app.add_middleware(SessionMiddleware, secret_key="your-secret-key-here")

# Configure middleware
configure_cors(app)

# Include authentication router FIRST
app.include_router(auth_router, prefix="/auth", tags=["authentication"])

# Initialize OAuth AFTER router is included
init_oauth(app)

# Include API routers
app.include_router(panels_router)
app.include_router(sot_router)
app.include_router(reconciliation_router)
app.include_router(debug_router)
app.include_router(users_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 

