from .auth_handler import verify_token

def get_current_user(request):
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
    
    payload = verify_token(token)
    if not payload:
        return "demo"  # Fallback to demo if invalid token
    
    # Return user name or email as fallback
    return payload.get("name") or payload.get("sub") or "demo"