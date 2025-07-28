# Reconify Audit Trail System Documentation

## Overview

The Reconify Audit Trail System provides comprehensive logging and tracking of all user actions and system events across the application. This system ensures accountability, compliance, and provides detailed insights into application usage and data processing activities.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Audit Actions](#audit-actions)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration](#frontend-integration)
6. [Audit Events by Feature](#audit-events-by-feature)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

## System Architecture

### Components
- **Backend**: FastAPI application with MySQL database
- **Audit Module**: Dedicated audit utilities and routes
- **Frontend**: React application with audit trail viewer
- **Database**: MySQL table for storing audit entries

### Key Files
- `backend/audit/audit_utils.py` - Core audit functionality
- `backend/audit/routes.py` - Audit API endpoints
- `backend/main.py` - Main application with audit integration
- `backend/auth/routes.py` - Authentication routes with audit logging
- `frontend/src/components/audit/AuditTrail.js` - Frontend audit viewer
- `frontend/src/auth/AuthContext.js` - Frontend authentication with logout audit

## Audit Actions

### Complete List of Audit Actions

| Action | Description | Status | Details Captured |
|--------|-------------|--------|------------------|
| `SOT_UPLOAD` | Source of Truth file upload | ✅ | File info, records processed, user |
| `PANEL_UPLOAD` | Panel data upload | ✅ | File info, records processed, user |
| `USER_CATEGORIZATION` | User categorization process | ✅ | Panel info, categorization results |
| `RECONCILIATION` | HR reconciliation process | ✅ | Panel info, reconciliation results |
| `USER_RECATEGORIZATION` | User recategorization with file | ✅ | File info, recategorization results |
| `PANEL_CONFIG_SAVE` | Panel configuration saved | ✅ | Panel config details |
| `PANEL_CONFIG_MODIFY` | Panel configuration modified | ✅ | Old and new config details |
| `PANEL_CONFIG_DELETE` | Panel configuration deleted | ✅ | Deleted panel details |
| `NEW_PANEL_ADDED` | New panel added | ✅ | Panel creation details |
| `LOGIN` | User login via OAuth | ✅ | User info, auth method, IP, user agent |
| `LOGOUT` | User logout | ✅ | User info, logout timestamp, IP, user agent |
| `SESSION_EXPIRED` | User session expired | ✅ | Expiration reason, IP, user agent, endpoint |
| `FILE_STRUCTURE_VALIDATION` | File structure validation | ✅ | Validation results |
| `DATA_PROCESSING` | Data processing operation | ✅ | Processing details |
| `FILE_PROCESSING_ERROR` | File processing error | ✅ | Error details |
| `EMPTY_FILE_UPLOAD` | Empty file upload attempt | ✅ | Upload attempt details |
| `PARTIAL_DATA_PROCESSING` | Partial data processing | ✅ | Processing results |

## Database Schema

### Audit Trail Table Structure

```sql
CREATE TABLE audit_trail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    details TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at VARCHAR(50) DEFAULT CURRENT_TIMESTAMP
);
```

### Field Descriptions
- **id**: Unique identifier for each audit entry
- **timestamp**: IST timestamp in dd-mm-yyyy hh:mm:ss format
- **action**: Type of action performed (from AUDIT_ACTIONS)
- **user_name**: Username or email of the user performing the action
- **details**: JSON string containing action-specific details
- **status**: 'success' or 'failed'
- **ip_address**: IP address of the user (optional)
- **user_agent**: User agent string (optional)
- **created_at**: Database timestamp

## API Endpoints

### Audit Trail Endpoints

#### 1. Get Audit Trail
```
GET /audit/trail
```
**Query Parameters:**
- `action` - Filter by action type
- `user` - Filter by user name
- `status` - Filter by status (success/failed)
- `date_from` - Filter from date (YYYY-MM-DD)
- `date_to` - Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "audit_entries": [
    {
      "id": 1,
      "timestamp": "24-07-2025 19:16:51",
      "action": "LOGIN",
      "user_name": "user@company.com",
      "details": {...},
      "status": "success",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2025-07-24 19:16:51"
    }
  ]
}
```

#### 2. Get Audit Summary
```
GET /audit/summary
```
**Response:**
```json
{
  "total_entries": 150,
  "recent_activity_24h": 25,
  "actions_breakdown": [...],
  "users_breakdown": [...]
}
```

#### 3. Get Available Actions
```
GET /audit/actions
```
**Response:**
```json
{
  "available_actions": {
    "SOT_UPLOAD": "Source of Truth file upload",
    "PANEL_UPLOAD": "Panel data upload",
    "LOGIN": "User login",
    "LOGOUT": "User logout",
    ...
  },
  "total_actions": 16
}
```

### Authentication Endpoints with Audit Logging

#### 4. Google OAuth Login
```
GET /auth/login/google
```
**Audit Events:**
- **Success**: `LOGIN` action with user details
- **Failure**: `LOGIN` action with error details

#### 5. OAuth Callback
```
GET /auth/google/callback
```
**Audit Events:**
- **Success**: `LOGIN` action with user info, auth method, IP, user agent
- **Failure**: `LOGIN` action with specific error details

#### 6. Logout
```
POST /auth/logout
```
**Audit Events:**
- **Success**: `LOGOUT` action with user info, logout timestamp, IP, user agent
- **Failure**: `LOGOUT` action with error details

## Frontend Integration

### Audit Trail Component
The frontend includes a comprehensive audit trail viewer (`AuditTrail.js`) with:

- **Summary Cards**: Total entries, recent activity, action types
- **Advanced Filtering**: By action, user, status, date range
- **Detailed View**: Expandable details for each audit entry
- **Formatted Display**: User-friendly formatting of audit details
- **Real-time Updates**: Automatic refresh of audit data

### Authentication Integration
The frontend authentication system (`AuthContext.js`) includes:

- **Login Tracking**: Automatic audit logging via OAuth callback
- **Logout Tracking**: Calls backend logout endpoint for audit logging
- **Token Management**: Secure token handling with audit trail
- **Error Handling**: Graceful handling of authentication failures

### Features
- Responsive design with modern UI
- Export capabilities (can be extended)
- Search and filter functionality
- Pagination support
- Color-coded status indicators

## Audit Events by Feature

### 1. Authentication

#### Login (`LOGIN`)
**Triggered by:** OAuth authentication via `/auth/google/callback`

**Success Details:**
```json
{
  "user_email": "user@company.com",
  "user_name": "John Doe",
  "auth_method": "google_oauth",
  "login_timestamp": "24-07-2025 19:16:51",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

**Failure Details:**
```json
{
  "auth_method": "google_oauth",
  "error": "Failed to fetch user info from Google",
  "login_timestamp": "24-07-2025 19:16:51",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

#### Logout (`LOGOUT`)
**Triggered by:** `/auth/logout` endpoint

**Success Details:**
```json
{
  "user_email": "user@company.com",
  "logout_timestamp": "24-07-2025 19:16:51",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

**Failure Details:**
```json
{
  "error": "Logout error: Invalid token",
  "logout_timestamp": "24-07-2025 19:16:51",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

#### Session Expiration (`SESSION_EXPIRED`)
**Triggered by:** Invalid/expired JWT token detection

**Success Details:**
```json
{
  "reason": "Invalid or expired token",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "endpoint": "/auth/me",
  "method": "GET"
}
```

**JWT Error Details:**
```json
{
  "reason": "JWT error: Token has expired",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "endpoint": "/sot/upload",
  "method": "POST"
}
```

**Logout with Invalid Token Details:**
```json
{
  "user_email": "unknown",
  "reason": "Token validation failed during logout",
  "logout_timestamp": "24-07-2025 19:16:51",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

### 2. Panel Management

#### Panel Creation (`NEW_PANEL_ADDED`)
**Triggered by:** `/panels/add` and `/panels/save` endpoints

**Success Details:**
```json
{
  "panel_name": "test_panel",
  "key_mapping": {"hr_data": {"email": "email"}},
  "panel_headers": ["email", "name", "department"]
}
```

**Failure Details:**
```json
{
  "panel_name": "test_panel",
  "key_mapping": {"hr_data": {"email": "email"}},
  "error": "MySQL table creation failed: Connection error"
}
```

#### Panel Modification (`PANEL_CONFIG_MODIFY`)
**Triggered by:** `/panels/modify` endpoint

**Details:**
```json
{
  "panel_name": "test_panel",
  "old": {"name": "test_panel", "key_mapping": {...}},
  "new": {"name": "test_panel", "key_mapping": {...}}
}
```

#### Panel Deletion (`PANEL_CONFIG_DELETE`)
**Triggered by:** `/panels/delete` endpoint

**Details:**
```json
{
  "panel_name": "test_panel",
  "deleted_panel": {"name": "test_panel", "key_mapping": {...}}
}
```

### 3. File Uploads

#### SOT Upload (`SOT_UPLOAD`)
**Triggered by:** `/sot/upload` endpoint

**Success Details:**
```json
{
  "sot_type": "hr_data",
  "file_name": "hr_data.csv",
  "doc_id": "uuid-string",
  "records_processed": 1000,
  "upload_timestamp": "24-07-2025 19:16:51"
}
```

**Failure Details:**
```json
{
  "sot_type": "hr_data",
  "file_name": "hr_data.csv",
  "doc_id": "uuid-string",
  "error": "Database insertion failed",
  "upload_timestamp": "24-07-2025 19:16:51"
}
```

#### Panel Upload (`PANEL_UPLOAD`)
**Triggered by:** `/recon/upload` endpoint

**Success Details:**
```json
{
  "panel_name": "test_panel",
  "file_name": "panel_data.csv",
  "doc_id": "uuid-string",
  "total_records": 500,
  "upload_timestamp": "24-07-2025 19:16:51"
}
```

**Failure Details:**
```json
{
  "panel_name": "test_panel",
  "file_name": "panel_data.csv",
  "doc_id": "uuid-string",
  "error": "Database insertion failed",
  "upload_timestamp": "24-07-2025 19:16:51"
}
```

### 4. File Processing Errors

#### File Processing Error (`FILE_PROCESSING_ERROR`)
**Triggered by:** Various file upload endpoints

**Details:**
```json
{
  "panel_name": "test_panel",
  "file_name": "data.csv",
  "doc_id": "uuid-string",
  "error": "Unable to decode file. Please ensure it's a valid CSV or Excel file.",
  "upload_timestamp": "24-07-2025 19:16:51"
}
```

#### Empty File Upload (`EMPTY_FILE_UPLOAD`)
**Triggered by:** File upload endpoints when no data found

**Details:**
```json
{
  "panel_name": "test_panel",
  "file_name": "empty.csv",
  "doc_id": "uuid-string",
  "error": "No data found in uploaded file",
  "upload_timestamp": "24-07-2025 19:16:51"
}
```

#### Partial Data Processing (`PARTIAL_DATA_PROCESSING`)
**Triggered by:** When only subset of records processed

**Details:**
```json
{
  "panel_name": "test_panel",
  "file_name": "data.csv",
  "doc_id": "uuid-string",
  "error": "Only 450 out of 500 records were processed",
  "upload_timestamp": "24-07-2025 19:16:51"
}
```

### 5. File Structure Validation

#### File Structure Validation (`FILE_STRUCTURE_VALIDATION`)
**Triggered by:** SOT upload endpoint

**Success Details:**
```json
{
  "sot_type": "hr_data",
  "file_name": "hr_data.csv",
  "doc_id": "uuid-string",
  "uploaded_headers": ["email", "name", "department"],
  "validation_status": "passed",
  "upload_timestamp": "24-07-2025 19:16:51"
}
```

**Failure Details:**
```json
{
  "sot_type": "hr_data",
  "file_name": "hr_data.csv",
  "doc_id": "uuid-string",
  "uploaded_headers": ["email", "name"],
  "validation_error": "Missing required columns: department",
  "upload_timestamp": "24-07-2025 19:16:51"
}
```

### 6. User Categorization

#### User Categorization (`USER_CATEGORIZATION`)
**Triggered by:** `/categorize_users` endpoint

**Details:**
```json
{
  "panel_name": "test_panel",
  "total_users": 1000,
  "service_users": 200,
  "internal_users": 300,
  "thirdparty_users": 100,
  "not_found": 400,
  "successful_updates": 600,
  "errors": 0
}
```

### 7. Reconciliation

#### Reconciliation (`RECONCILIATION`)
**Triggered by:** `/recon/process` endpoint

**Success Details:**
```json
{
  "panel_name": "test_panel",
  "recon_id": "RCN_abc12345",
  "users_to_reconcile": 500,
  "matched": 450,
  "found_active": 300,
  "found_inactive": 100,
  "not_found": 50,
  "recon_month": "Jul'25",
  "status": "complete"
}
```

**Failure Details:**
```json
{
  "panel_name": "test_panel",
  "recon_id": "RCN_abc12345",
  "error": "No internal users or not found users to reconcile",
  "recon_month": "Jul'25",
  "status": "failed"
}
```

### 8. User Recategorization

#### User Recategorization (`USER_RECATEGORIZATION`)
**Triggered by:** `/recategorize_users` endpoint

**Success Details:**
```json
{
  "panel_name": "test_panel",
  "file_name": "recategorization.csv",
  "doc_id": "uuid-string",
  "total_panel_users": 1000,
  "matched": 800,
  "not_found": 150,
  "errors": 50,
  "successful_updates": 950,
  "match_column": "email",
  "type_column": "final_status",
  "panel_field": "email",
  "upload_timestamp": "24-07-2025 19:16:51"
}
```

**Failure Details:**
```json
{
  "panel_name": "test_panel",
  "file_name": "recategorization.csv",
  "doc_id": "uuid-string",
  "error": "Panel not found",
  "upload_timestamp": "24-07-2025 19:16:51"
}
```

## Error Handling

### Audit Logging Failures
- All audit logging calls are wrapped in try-catch blocks
- Audit failures don't affect main application functionality
- Failed audit attempts are logged to application logs
- Graceful degradation ensures application continues to work

### Error Categories
1. **Authentication Errors**: OAuth failures, token validation errors
2. **File Processing Errors**: Invalid file formats, encoding issues
3. **Database Errors**: Connection failures, constraint violations
4. **Validation Errors**: Missing required fields, invalid data
5. **Configuration Errors**: Missing panels, invalid mappings
6. **System Errors**: Unexpected exceptions, resource issues

## Best Practices

### 1. Audit Logging Guidelines
- **Always log both success and failure cases**
- **Include relevant context in details**
- **Use consistent timestamp format (IST)**
- **Capture user attribution for all actions**
- **Include unique identifiers (doc_id, recon_id)**
- **Log errors with specific error messages**
- **Capture IP addresses and user agents for security**

### 2. Performance Considerations
- **Asynchronous audit logging** (can be implemented)
- **Database indexing** on frequently queried fields
- **Regular cleanup** of old audit logs
- **Compression** for long-term storage

### 3. Security Considerations
- **No sensitive data** in audit logs (passwords, tokens)
- **IP address logging** for security monitoring
- **User agent logging** for debugging
- **Access control** for audit trail viewing
- **Secure authentication** audit logging

### 4. Maintenance
- **Regular backup** of audit trail data
- **Archive old logs** after retention period
- **Monitor audit log size** and performance
- **Review audit patterns** for anomalies

## Implementation Status

### ✅ Completed Features
- [x] Core audit system with MySQL backend
- [x] Comprehensive audit logging for all major features
- [x] Authentication audit logging (login/logout)
- [x] Frontend audit trail viewer
- [x] Advanced filtering and search
- [x] Error handling and graceful degradation
- [x] User attribution and timestamp tracking
- [x] Detailed audit information capture
- [x] Security monitoring (IP, user agent)

### 🔄 Future Enhancements
- [ ] Real-time audit notifications
- [ ] Audit log export functionality
- [ ] Advanced analytics and reporting
- [ ] Audit log retention policies
- [ ] Performance optimization
- [ ] Integration with external monitoring systems

## Testing

### Authentication Audit Testing
Use the provided test script to verify login and logout audit functionality:

```bash
python3 backend/test_auth_audit.py
```

This script will:
- Check for existing login/logout audit entries
- Test the logout endpoint
- Verify audit summary statistics
- Provide testing instructions

### Manual Testing
1. **Login Testing**: Complete OAuth authentication and check audit trail
2. **Logout Testing**: Click logout button and verify audit entry
3. **Error Testing**: Test with invalid tokens and check error logging

## Conclusion

The Reconify Audit Trail System provides comprehensive logging and monitoring capabilities for all application activities, including complete authentication tracking. It ensures accountability, compliance, and provides valuable insights into system usage and data processing activities. The system is designed to be robust, scalable, and user-friendly while maintaining high performance and security standards.

---

**Last Updated:** July 24, 2025  
**Version:** 1.0  
**Maintainer:** Reconify Development Team 