from fastapi import APIRouter
from app.core.audit.routes import router as audit_router

router = APIRouter()

# Include the existing audit router
router.include_router(audit_router) 