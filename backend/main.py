from fastapi import FastAPI
import logging
# Configure logging for production
from app.config.logging import configure_logging
# Import middleware configuration
from app.core.middleware import configure_cors
# Import API routers
from app.api.panels import router as panels_router
from app.api.sot import router as sot_router
from app.api.reconciliation import router as reconciliation_router
from app.api.debug import router as debug_router
from app.api.users import router as users_router

app = FastAPI()

# Configure middleware
configure_cors(app)

# Include API routers
app.include_router(panels_router)
app.include_router(sot_router)
app.include_router(reconciliation_router)
app.include_router(debug_router)
app.include_router(users_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 

