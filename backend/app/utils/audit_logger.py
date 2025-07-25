import logging
from typing import Dict, Any, Optional
from fastapi import Request
from ..audit_trails.audit_utils import log_audit_event, AUDIT_ACTIONS
from ..auth.user_upload import get_current_user

logger = logging.getLogger(__name__)

def get_client_info(request: Request) -> Dict[str, str]:
    """Extract client information from request"""
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    return {
        "ip_address": client_host,
        "user_agent": user_agent
    }

def log_api_action(
    request: Request,
    action: str,
    details: Dict[str, Any],
    status: str = "success",
    user_override: Optional[str] = None
) -> bool:
    """
    Common function to log API actions to audit trail
    
    Args:
        request: FastAPI request object
        action: Action type from AUDIT_ACTIONS
        details: Additional details about the action
        status: 'success' or 'failed'
        user_override: Optional user override (if not using request user)
    
    Returns:
        bool: True if logged successfully, False otherwise
    """
    try:
        # Get user from request or use override
        user = user_override or get_current_user(request)
        
        # Get client information
        client_info = get_client_info(request)
        
        # Log the audit event
        success = log_audit_event(
            action=action,
            user=user,
            details=details,
            status=status,
            ip_address=client_info["ip_address"],
            user_agent=client_info["user_agent"]
        )
        
        if success:
            logger.info(f"Audit logged: {action} by {user} - {status}")
        else:
            logger.error(f"Failed to log audit: {action} by {user}")
            
        return success
        
    except Exception as e:
        logger.error(f"Error in audit logging: {e}")
        return False

def log_sot_upload(request: Request, file_name: str, sot_type: str, status: str, details: Dict[str, Any] = None):
    """Log SOT upload action"""
    audit_details = {
        "file_name": file_name,
        "sot_type": sot_type,
        "file_size": details.get("file_size") if details else None,
        "records_processed": details.get("records_processed") if details else None,
        "error": details.get("error") if details and status == "failed" else None
    }
    
    return log_api_action(
        request=request,
        action="SOT_UPLOAD",
        details=audit_details,
        status=status
    )

def log_panel_upload(request: Request, panel_name: str, file_name: str, status: str, details: Dict[str, Any] = None):
    """Log panel upload action"""
    audit_details = {
        "panel_name": panel_name,
        "file_name": file_name,
        "file_size": details.get("file_size") if details else None,
        "records_processed": details.get("records_processed") if details else None,
        "error": details.get("error") if details and status == "failed" else None
    }
    
    return log_api_action(
        request=request,
        action="PANEL_UPLOAD",
        details=audit_details,
        status=status
    )

def log_reconciliation(request: Request, panel_name: str, status: str, details: Dict[str, Any] = None):
    """Log reconciliation action"""
    audit_details = {
        "panel_name": panel_name,
        "total_users": details.get("total_users") if details else None,
        "users_to_reconcile": details.get("users_to_reconcile") if details else None,
        "reconciliation_results": details.get("reconciliation_results") if details else None,
        "error": details.get("error") if details and status == "failed" else None
    }
    
    return log_api_action(
        request=request,
        action="RECONCILIATION",
        details=audit_details,
        status=status
    )

def log_user_recategorization(request: Request, panel_name: str, file_name: str, status: str, details: Dict[str, Any] = None):
    """Log user recategorization action"""
    audit_details = {
        "panel_name": panel_name,
        "file_name": file_name,
        "records_processed": details.get("records_processed") if details else None,
        "recategorization_results": details.get("recategorization_results") if details else None,
        "error": details.get("error") if details and status == "failed" else None
    }
    
    return log_api_action(
        request=request,
        action="USER_RECATEGORIZATION",
        details=audit_details,
        status=status
    )

def log_panel_config_save(request: Request, panel_name: str, config_details: Dict[str, Any], status: str):
    """Log panel configuration save action"""
    audit_details = {
        "panel_name": panel_name,
        "key_mapping": config_details.get("key_mapping") if config_details else None,
        "function_name": config_details.get("function_name") if config_details else None,
        "error": config_details.get("error") if status == "failed" else None
    }
    
    return log_api_action(
        request=request,
        action="PANEL_CONFIG_SAVE",
        details=audit_details,
        status=status
    )

def log_panel_config_modify(request: Request, panel_name: str, old_config: Dict[str, Any], new_config: Dict[str, Any], status: str):
    """Log panel configuration modification action"""
    audit_details = {
        "panel_name": panel_name,
        "old_config": old_config,
        "new_config": new_config,
        "changes": {
            "key_mapping_changed": old_config.get("key_mapping") != new_config.get("key_mapping"),
            "function_changed": old_config.get("function_name") != new_config.get("function_name")
        },
        "error": new_config.get("error") if status == "failed" else None
    }
    
    return log_api_action(
        request=request,
        action="PANEL_CONFIG_MODIFY",
        details=audit_details,
        status=status
    )

def log_panel_config_delete(request: Request, panel_name: str, status: str):
    """Log panel configuration deletion action"""
    audit_details = {
        "panel_name": panel_name,
        "error": None if status == "success" else "Failed to delete panel configuration"
    }
    
    return log_api_action(
        request=request,
        action="PANEL_CONFIG_DELETE",
        details=audit_details,
        status=status
    )

def log_user_login(request: Request, user_email: str, status: str):
    """Log user login action"""
    audit_details = {
        "user_email": user_email,
        "login_method": "Google SSO",
        "error": None if status == "success" else "Login failed"
    }
    
    return log_api_action(
        request=request,
        action="LOGIN",
        details=audit_details,
        status=status,
        user_override=user_email
    )

def log_user_logout(request: Request, user_email: str):
    """Log user logout action"""
    audit_details = {
        "user_email": user_email,
        "logout_method": "Session termination"
    }
    
    return log_api_action(
        request=request,
        action="LOGOUT",
        details=audit_details,
        status="success",
        user_override=user_email
    )

def log_file_validation_error(request: Request, file_name: str, error_type: str, error_details: str):
    """Log file validation errors"""
    audit_details = {
        "file_name": file_name,
        "error_type": error_type,
        "error_details": error_details,
        "validation_failed": True
    }
    
    return log_api_action(
        request=request,
        action="FILE_STRUCTURE_VALIDATION",
        details=audit_details,
        status="failed"
    )

def log_data_processing(request: Request, operation: str, records_processed: int, status: str, details: Dict[str, Any] = None):
    """Log data processing operations"""
    audit_details = {
        "operation": operation,
        "records_processed": records_processed,
        "processing_details": details,
        "error": details.get("error") if details and status == "failed" else None
    }
    
    return log_api_action(
        request=request,
        action="DATA_PROCESSING",
        details=audit_details,
        status=status
    ) 