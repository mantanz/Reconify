# Audit Trail System

A comprehensive audit trail system for tracking user activities and system events in the Reconify application.

## Features

### 🔍 **Activity Tracking**
- **SOT Uploads**: Track Source of Truth file uploads with success/failure status
- **Panel Uploads**: Monitor panel data uploads and processing
- **User Categorization**: Log user categorization processes
- **Reconciliation**: Track HR reconciliation operations
- **Configuration Changes**: Monitor panel configuration modifications

### 📊 **Audit Information Captured**
- **Timestamp**: Exact time of action (IST format)
- **User**: Who performed the action
- **Action Type**: What was done
- **Details**: Comprehensive details about the action
- **Status**: Success or failure
- **IP Address**: User's IP address (optional)
- **User Agent**: Browser/client information (optional)

### 🗄️ **Database Storage**
- **MySQL Table**: `audit_trail` with optimized indexes
- **JSON Details**: Flexible storage for action-specific information
- **Automatic Cleanup**: Configurable retention period (default: 90 days)

## API Endpoints

### Get Audit Trail
```
GET /audit/trail
```
**Query Parameters:**
- `action`: Filter by action type
- `user`: Filter by user name
- `status`: Filter by status (success/failed)
- `date_from`: Filter from date (YYYY-MM-DD)
- `date_to`: Filter to date (YYYY-MM-DD)
- `limit`: Maximum records to return (default: 100)
- `offset`: Records to skip for pagination

### Get Audit Summary
```
GET /audit/summary
```
Returns summary statistics including:
- Total entries
- Actions breakdown
- Users breakdown
- Recent activity (last 24 hours)

### Get Available Actions
```
GET /audit/actions
```
Returns list of all available audit action types.

### Get User Activity
```
GET /audit/user-activity/{user_name}
```
Returns audit trail for a specific user with statistics.

### Get Action Statistics
```
GET /audit/action-stats/{action}
```
Returns statistics for a specific action type.

### Cleanup Old Logs
```
DELETE /audit/cleanup?days_to_keep=90
```
Removes audit logs older than specified days.

## Frontend Integration

### Audit Trail Component
- **Location**: `frontend/src/components/audit/AuditTrail.js`
- **Features**:
  - Real-time audit trail display
  - Advanced filtering options
  - Summary statistics cards
  - Detailed action information
  - Responsive design

### API Functions
- **Location**: `frontend/src/utils/api.js`
- **Functions**:
  - `getAuditTrail(filters)`
  - `getAuditSummary()`
  - `getAvailableActions()`
  - `getUserActivity(userName, limit)`
  - `getActionStatistics(action)`
  - `cleanupAuditLogs(daysToKeep)`

## Usage Examples

### Backend Integration
```python
from audit import log_audit_event

# Log successful action
log_audit_event(
    action="SOT_UPLOAD",
    user="john.doe@company.com",
    details={
        "sot_type": "hr_data",
        "file_name": "employees.csv",
        "records_processed": 500
    },
    status="success"
)

# Log failed action
log_audit_event(
    action="PANEL_UPLOAD",
    user="jane.smith@company.com",
    details={
        "panel_name": "internal_users",
        "error": "Invalid file format"
    },
    status="failed"
)
```

### Frontend Usage
```javascript
import { getAuditTrail, getAuditSummary } from '../utils/api';

// Get audit trail with filters
const auditData = await getAuditTrail({
    action: 'SOT_UPLOAD',
    user: 'john.doe@company.com',
    status: 'success'
});

// Get summary statistics
const summary = await getAuditSummary();
```

## Database Schema

```sql
CREATE TABLE audit_trail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    details JSON,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_action (action),
    INDEX idx_user (user_name),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
```

## Action Types

| Action | Description |
|--------|-------------|
| `SOT_UPLOAD` | Source of Truth file upload |
| `PANEL_UPLOAD` | Panel data upload |
| `USER_CATEGORIZATION` | User categorization process |
| `RECONCILIATION` | HR reconciliation process |
| `USER_RECATEGORIZATION` | User recategorization with file |
| `PANEL_CONFIG_SAVE` | Panel configuration saved |
| `PANEL_CONFIG_MODIFY` | Panel configuration modified |
| `PANEL_CONFIG_DELETE` | Panel configuration deleted |
| `LOGIN` | User login |
| `LOGOUT` | User logout |
| `FILE_STRUCTURE_VALIDATION` | File structure validation |
| `DATA_PROCESSING` | Data processing operation |

## Benefits

### 🔒 **Security & Compliance**
- **User Accountability**: Track who did what and when
- **Audit Compliance**: Meet regulatory requirements
- **Security Monitoring**: Detect suspicious activities
- **Data Integrity**: Verify system operations

### 📈 **Operational Insights**
- **Usage Analytics**: Understand system usage patterns
- **Performance Monitoring**: Track operation success rates
- **Troubleshooting**: Quick problem identification
- **User Behavior**: Analyze user activity patterns

### 🛠️ **Maintenance & Support**
- **Debugging**: Easy problem tracking and resolution
- **System Health**: Monitor overall system health
- **Capacity Planning**: Understand system usage trends
- **Support**: Provide detailed information for support requests

## Configuration

### Retention Period
Default retention period is 90 days. To change:
```python
# In audit_utils.py
cleanup_old_audit_logs(days_to_keep=180)  # Keep for 6 months
```

### Logging Level
Configure logging level in `audit_utils.py`:
```python
logging.basicConfig(level=logging.INFO)  # or logging.DEBUG
```

## Future Enhancements

- **Real-time Notifications**: Alert on suspicious activities
- **Advanced Analytics**: Machine learning for anomaly detection
- **Export Functionality**: Export audit logs for external analysis
- **Role-based Access**: Different audit views for different user roles
- **Integration**: Connect with external SIEM systems 