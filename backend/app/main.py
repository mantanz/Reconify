from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import logging

from app.config.settings import ALLOWED_ORIGINS, SESSION_SECRET_KEY, LOG_LEVEL, LOG_FILE
from app.core.auth.routes import router as auth_router, init_oauth
from app.core.audit.routes import router as audit_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    app = FastAPI(
        title="Reconify API",
        description="Reconciliation and Audit System API",
        version="1.0.0"
    )
    
    # Add SessionMiddleware for OAuth
    app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET_KEY)
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Initialize OAuth
    init_oauth(app)
    
    # Include routers
    app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
    app.include_router(audit_router, prefix="/audit", tags=["Audit"])
    
    # Import and include other routers
    from app.api.v1 import panels, sot, reconciliation, users, audit
    
    app.include_router(panels.router, tags=["Panels"])
    app.include_router(sot.router, tags=["SOT"])
    app.include_router(reconciliation.router, tags=["Reconciliation"])
    app.include_router(users.router, tags=["Users"])
    app.include_router(audit.router, tags=["Audit"])
    
    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    from app.config.settings import HOST, PORT
    
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=True
    ) 