from fastapi import Request
from app.core.auth.auth_handler import verify_token
from app.core.audit.audit_utils import log_audit_event
from jose import JWTError
import logging

def get_current_user(request: Request):
    """Get current user from JWT token"""
    # Check for token in cookies first
    token = request.cookies.get("access_token")
    
    # If no cookie, check for Authorization header (for cross-port requests)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        return "demo"  # Fallback to demo if no token
    
    try:
        payload = verify_token(token)
        if not payload:
            # Token is invalid/expired - log session expiration
            try:
                log_audit_event(
                    action="SESSION_EXPIRED",
                    user="unknown",
                    details={
                        "reason": "Invalid or expired token",
                        "ip_address": request.client.host if request.client else None,
                        "user_agent": request.headers.get("user-agent"),
                        "endpoint": str(request.url.path),
                        "method": request.method
                    },
                    status="success",
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent")
                )
            except Exception as audit_error:
                logging.error(f"Failed to log session expiration audit event: {audit_error}")
            
            return "demo"  # Fallback to demo if invalid token
        
        # Return user name or email as fallback
        return payload.get("name") or payload.get("sub") or "demo"
        
    except JWTError as e:
        # JWT token is expired or malformed - log session expiration
        try:
            log_audit_event(
                action="SESSION_EXPIRED",
                user="unknown",
                details={
                    "reason": f"JWT error: {str(e)}",
                    "ip_address": request.client.host if request.client else None,
                    "user_agent": request.headers.get("user-agent"),
                    "endpoint": str(request.url.path),
                    "method": request.method
                },
                status="success",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
        except Exception as audit_error:
            logging.error(f"Failed to log session expiration audit event: {audit_error}")
        
        return "demo"  # Fallback to demo if JWT error 