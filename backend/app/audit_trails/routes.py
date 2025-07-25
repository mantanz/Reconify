from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional, List, Dict
import logging
from .audit_utils import (
    get_audit_trail, 
    get_audit_summary, 
    cleanup_old_audit_logs,
    AUDIT_ACTIONS
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/trail")
def get_audit_trail_endpoint(
    action: Optional[str] = Query(None, description="Filter by action type"),
    user: Optional[str] = Query(None, description="Filter by user name"),
    status: Optional[str] = Query(None, description="Filter by status (success/failed)"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    limit: int = Query(100, description="Maximum number of records to return"),
    offset: int = Query(0, description="Number of records to skip")
):
    """
    Get audit trail entries with optional filtering
    """
    try:
        filters = {}
        if action:
            filters['action'] = action
        if user:
            filters['user'] = user
        if status:
            filters['status'] = status
        if date_from:
            filters['date_from'] = date_from
        if date_to:
            filters['date_to'] = date_to
        
        audit_entries = get_audit_trail(filters, limit, offset)
        
        return {
            "audit_entries": audit_entries,
            "filters_applied": filters,
            "total_returned": len(audit_entries),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error retrieving audit trail: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve audit trail: {str(e)}")

@router.get("/summary")
def get_audit_summary_endpoint():
    """
    Get audit trail summary statistics
    """
    try:
        summary = get_audit_summary()
        return summary
        
    except Exception as e:
        logger.error(f"Error retrieving audit summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve audit summary: {str(e)}")

@router.get("/actions")
def get_available_actions():
    """
    Get list of available audit actions
    """
    return {
        "available_actions": AUDIT_ACTIONS,
        "total_actions": len(AUDIT_ACTIONS)
    }

@router.delete("/cleanup")
def cleanup_audit_logs(
    days_to_keep: int = Query(90, description="Number of days to keep audit logs")
):
    """
    Clean up old audit logs
    """
    try:
        deleted_count = cleanup_old_audit_logs(days_to_keep)
        return {
            "message": f"Successfully cleaned up {deleted_count} old audit log entries",
            "deleted_count": deleted_count,
            "days_kept": days_to_keep
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up audit logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cleanup audit logs: {str(e)}")

@router.get("/user-activity/{user_name}")
def get_user_activity(
    user_name: str,
    limit: int = Query(50, description="Maximum number of records to return")
):
    """
    Get audit trail for a specific user
    """
    try:
        filters = {"user": user_name}
        user_entries = get_audit_trail(filters, limit, 0)
        
        # Calculate user statistics
        total_actions = len(user_entries)
        success_count = len([entry for entry in user_entries if entry.get('status') == 'success'])
        failed_count = total_actions - success_count
        
        # Get action breakdown for this user
        action_breakdown = {}
        for entry in user_entries:
            action = entry.get('action')
            if action not in action_breakdown:
                action_breakdown[action] = 0
            action_breakdown[action] += 1
        
        return {
            "user_name": user_name,
            "total_actions": total_actions,
            "success_count": success_count,
            "failed_count": failed_count,
            "success_rate": (success_count / total_actions * 100) if total_actions > 0 else 0,
            "action_breakdown": action_breakdown,
            "recent_activity": user_entries[:10]  # Last 10 activities
        }
        
    except Exception as e:
        logger.error(f"Error retrieving user activity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user activity: {str(e)}")

@router.get("/action-stats/{action}")
def get_action_statistics(action: str):
    """
    Get statistics for a specific action
    """
    try:
        filters = {"action": action}
        action_entries = get_audit_trail(filters, 1000, 0)  # Get more entries for stats
        
        if not action_entries:
            return {
                "action": action,
                "message": f"No audit entries found for action: {action}",
                "total_entries": 0
            }
        
        # Calculate statistics
        total_entries = len(action_entries)
        success_count = len([entry for entry in action_entries if entry.get('status') == 'success'])
        failed_count = total_entries - success_count
        
        # Get user breakdown for this action
        user_breakdown = {}
        for entry in action_entries:
            user = entry.get('user_name')
            if user not in user_breakdown:
                user_breakdown[user] = 0
            user_breakdown[user] += 1
        
        # Get recent entries
        recent_entries = action_entries[:10]
        
        return {
            "action": action,
            "action_description": AUDIT_ACTIONS.get(action, "Unknown action"),
            "total_entries": total_entries,
            "success_count": success_count,
            "failed_count": failed_count,
            "success_rate": (success_count / total_entries * 100) if total_entries > 0 else 0,
            "user_breakdown": user_breakdown,
            "recent_entries": recent_entries
        }
        
    except Exception as e:
        logger.error(f"Error retrieving action statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve action statistics: {str(e)}") 