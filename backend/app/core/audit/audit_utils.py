import json
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine, text, MetaData, Table, Column, String, Text, Integer
from sqlalchemy.exc import SQLAlchemyError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use the same MySQL connection as the main application
MYSQL_URL = "mysql+pymysql://reconify:Paytmkaro%4012@localhost/reconify"
engine = create_engine(MYSQL_URL)
metadata = MetaData()

# Audit action types
AUDIT_ACTIONS = {
    "LOGIN": "User login",
    "LOGOUT": "User logout",
    "SESSION_EXPIRED": "User session expired",
    "SOT_UPLOAD": "SOT file upload",
    "PANEL_UPLOAD": "Panel data upload",
    "RECONCILIATION": "Reconciliation process",
    "USER_CATEGORIZATION": "User categorization",
    "PANEL_CONFIG_SAVED": "Panel configuration saved",
    "PANEL_CONFIG_MODIFIED": "Panel configuration modified",
    "PANEL_CONFIG_DELETED": "Panel configuration deleted",
    "NEW_PANEL_ADDED": "New panel added",
    "FILE_STRUCTURE_VALIDATION": "File structure validation",
    "DUPLICATE_FILE_UPLOAD": "Duplicate file upload attempt",
    "DATA_BACKUP": "Data backup operation",
    "SOT_CONFIG_CREATED": "SOT configuration created",
    "SOT_CONFIG_UPDATED": "SOT configuration updated",
    "SOT_CONFIG_DELETED": "SOT configuration deleted"
}

def get_ist_timestamp():
    """Get current timestamp in Indian Standard Time (IST) format: dd-mm-yyyy hh:mm:ss"""
    ist_offset = timedelta(hours=5, minutes=30)
    utc_now = datetime.now(timezone.utc)
    ist_time = utc_now.astimezone(timezone(ist_offset))
    return ist_time.strftime("%d-%m-%Y %H:%M:%S")

def create_audit_table():
    """Create audit_trail table if it doesn't exist"""
    try:
        # Use local metadata to avoid conflicts
        local_metadata = MetaData()
        
        # Define the audit_trail table
        audit_table = Table('audit_trail', local_metadata,
            Column('id', Integer, primary_key=True, autoincrement=True),
            Column('timestamp', String(50), nullable=False),
            Column('action', String(100), nullable=False),
            Column('user_name', String(100), nullable=False),
            Column('details', Text),  # JSON stored as text
            Column('status', String(20), nullable=False, default='success'),
            Column('ip_address', String(45)),
            Column('user_agent', Text),
            Column('created_at', String(50), default=get_ist_timestamp)
        )
        
        # Create the table
        audit_table.create(engine, checkfirst=True)
        
        logger.info("Audit trail table created successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to create audit trail table: {e}")
        return False

def log_audit_event(action, user, details, status="success", ip_address=None, user_agent=None):
    """
    Log audit events to MySQL database
    
    Args:
        action (str): The action performed (e.g., 'SOT_UPLOAD', 'RECONCILIATION')
        user (str): Username or email of the user performing the action
        details (dict): Additional details about the action
        status (str): 'success' or 'failed'
        ip_address (str): IP address of the user (optional)
        user_agent (str): User agent string (optional)
    """
    try:
        # Ensure audit table exists
        create_audit_table()
        
        # Get current timestamp
        current_timestamp = get_ist_timestamp()
        
        # Insert audit record
        with engine.begin() as conn:
            insert_query = text("""
                INSERT INTO audit_trail (timestamp, action, user_name, details, status, ip_address, user_agent, created_at)
                VALUES (:timestamp, :action, :user_name, :details, :status, :ip_address, :user_agent, :created_at)
            """)
            
            conn.execute(insert_query, {
                'timestamp': current_timestamp,
                'action': action,
                'user_name': user,
                'details': json.dumps(details, default=str),
                'status': status,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'created_at': current_timestamp
            })
        
        logger.info(f"Audit event logged: {action} by {user} - {status}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")
        return False

def get_audit_trail(filters=None, limit=100, offset=0):
    """
    Retrieve audit trail entries with optional filtering
    
    Args:
        filters (dict): Optional filters for action, user, status, date_range
        limit (int): Maximum number of records to return
        offset (int): Number of records to skip for pagination
    
    Returns:
        list: List of audit trail entries
    """
    try:
        # Build query with filters
        query = "SELECT * FROM audit_trail WHERE 1=1"
        params = {}
        
        if filters:
            if filters.get('action'):
                query += " AND action = :action"
                params['action'] = filters['action']
            
            if filters.get('user'):
                query += " AND user_name LIKE :user"
                params['user'] = f"%{filters['user']}%"
            
            if filters.get('status'):
                query += " AND status = :status"
                params['status'] = filters['status']
            
            if filters.get('date_from'):
                # Convert YYYY-MM-DD to dd-mm-yyyy format for database comparison
                from datetime import datetime
                try:
                    date_obj = datetime.strptime(filters['date_from'], '%Y-%m-%d')
                    date_from_str = date_obj.strftime('%d-%m-%Y')
                    query += " AND timestamp >= :date_from"
                    params['date_from'] = date_from_str
                except ValueError:
                    # If conversion fails, use as-is
                    query += " AND timestamp >= :date_from"
                    params['date_from'] = filters['date_from']
            
            if filters.get('date_to'):
                # Convert YYYY-MM-DD to dd-mm-yyyy format for database comparison
                from datetime import datetime
                try:
                    date_obj = datetime.strptime(filters['date_to'], '%Y-%m-%d')
                    date_to_str = date_obj.strftime('%d-%m-%Y')
                    query += " AND timestamp <= :date_to"
                    params['date_to'] = date_to_str + " 23:59:59"  # End of day
                except ValueError:
                    # If conversion fails, use as-is
                    query += " AND timestamp <= :date_to"
                    params['date_to'] = filters['date_to']
        
        # Add ordering and pagination
        query += " ORDER BY timestamp DESC LIMIT :limit OFFSET :offset"
        params['limit'] = limit
        params['offset'] = offset
        
        with engine.connect() as conn:
            result = conn.execute(text(query), params)
            rows = result.fetchall()
            
            # Convert to list of dictionaries
            audit_entries = []
            for row in rows:
                entry = {
                    'id': row[0],
                    'timestamp': row[1],
                    'action': row[2],
                    'user_name': row[3],
                    'details': json.loads(row[4]) if row[4] else {},
                    'status': row[5],
                    'ip_address': row[6],
                    'user_agent': row[7],
                    'created_at': row[8]
                }
                audit_entries.append(entry)
            
            return audit_entries
        
    except Exception as e:
        logger.error(f"Failed to retrieve audit trail: {e}")
        return []

def get_audit_summary():
    """
    Get summary statistics for audit trail
    
    Returns:
        dict: Summary statistics
    """
    try:
        with engine.connect() as conn:
            # Total entries
            result = conn.execute(text("SELECT COUNT(*) as total FROM audit_trail"))
            total = result.fetchone()[0]
            
            # Actions breakdown
            result = conn.execute(text("""
                SELECT action, COUNT(*) as count, 
                       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
                       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
                FROM audit_trail 
                GROUP BY action
                ORDER BY count DESC
            """))
            actions_breakdown = []
            for row in result:
                actions_breakdown.append({
                    'action': row[0],
                    'count': row[1],
                    'success_count': row[2],
                    'failed_count': row[3]
                })
            
            # Users breakdown
            result = conn.execute(text("""
                SELECT user_name, COUNT(*) as count
                FROM audit_trail 
                GROUP BY user_name
                ORDER BY count DESC
                LIMIT 10
            """))
            users_breakdown = []
            for row in result:
                users_breakdown.append({
                    'user_name': row[0],
                    'count': row[1]
                })
            
            # Recent activity (last 24 hours) - using string comparison
            # Get current IST timestamp and calculate 24 hours ago
            from datetime import datetime, timedelta
            now = datetime.now()
            yesterday = now - timedelta(hours=24)
            yesterday_str = yesterday.strftime("%d-%m-%Y %H:%M:%S")
            
            result = conn.execute(text("""
                SELECT COUNT(*) as recent_count
                FROM audit_trail 
                WHERE timestamp >= :yesterday
            """), {'yesterday': yesterday_str})
            recent_activity = result.fetchone()[0]
            
            return {
                "total_entries": total,
                "actions_breakdown": actions_breakdown,
                "users_breakdown": users_breakdown,
                "recent_activity_24h": recent_activity
            }
        
    except Exception as e:
        logger.error(f"Failed to get audit summary: {e}")
        return {}

def cleanup_old_audit_logs(days_to_keep=90):
    """
    Clean up old audit logs to prevent database bloat
    
    Args:
        days_to_keep (int): Number of days to keep audit logs
    """
    try:
        # Calculate the cutoff date using string format
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        cutoff_str = cutoff_date.strftime("%d-%m-%Y %H:%M:%S")
        
        with engine.begin() as conn:
            delete_query = text("""
                DELETE FROM audit_trail 
                WHERE timestamp < :cutoff_date
            """)
            
            result = conn.execute(delete_query, {'cutoff_date': cutoff_str})
            deleted_count = result.rowcount
        
        logger.info(f"Cleaned up {deleted_count} old audit log entries")
        return deleted_count
        
    except Exception as e:
        logger.error(f"Failed to cleanup old audit logs: {e}")
        return 0 