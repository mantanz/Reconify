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
        logging.warning(f"No token found in request. Cookies: {request.cookies}, Headers: {dict(request.headers)}")
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
            
            logging.warning(f"Invalid token payload: {payload}")
            return "demo"  # Fallback to demo if invalid token
        
        # Extract user information from payload
        user_name = payload.get("name")
        user_email = payload.get("sub")
        
        logging.info(f"Token payload: {payload}, User name: {user_name}, User email: {user_email}")
        
        # Return user name if available, otherwise email, otherwise demo
        if user_name:
            return user_name
        elif user_email:
            return user_email
        else:
            logging.warning(f"No user name or email found in token payload: {payload}")
            return "demo"
        
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
        
        logging.error(f"JWT error in get_current_user: {str(e)}")
        return "demo"  # Fallback to demo if JWT error 