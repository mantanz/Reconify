# Audit System Quick Reference Guide

## For Developers

### How to Add Audit Logging to a New Endpoint

#### 1. Import the audit function
```python
from audit import log_audit_event
```

#### 2. Get current user
```python
user = get_current_user(request)
```

#### 3. Log success case
```python
try:
    # Your endpoint logic here
    result = perform_action()
    
    # Log success
    log_audit_event(
        action="YOUR_ACTION_NAME",
        user=user,
        details={
            "key1": "value1",
            "key2": "value2"
        },
        status="success"
    )
    
    return result
except Exception as e:
    # Log failure
    log_audit_event(
        action="YOUR_ACTION_NAME",
        user=user,
        details={
            "error": str(e)
        },
        status="failed"
    )
    raise
```

### Available Audit Actions

| Action | Use Case | Example |
|--------|----------|---------|
| `SOT_UPLOAD` | Source of Truth file uploads | HR data, service users data |
| `PANEL_UPLOAD` | Panel data file uploads | Panel CSV/Excel uploads |
| `USER_CATEGORIZATION` | Automatic user categorization | Categorize users by SOT |
| `RECONCILIATION` | HR reconciliation process | Reconcile panel with HR data |
| `USER_RECATEGORIZATION` | Manual user recategorization | Upload recategorization file |
| `NEW_PANEL_ADDED` | Panel creation | Add new panel configuration |
| `PANEL_CONFIG_MODIFY` | Panel configuration changes | Modify panel settings |
| `PANEL_CONFIG_DELETE` | Panel deletion | Delete panel configuration |
| `FILE_PROCESSING_ERROR` | File processing failures | Invalid file format, encoding issues |
| `EMPTY_FILE_UPLOAD` | Empty file uploads | Files with no data |
| `PARTIAL_DATA_PROCESSING` | Partial processing | Only some records processed |
| `FILE_STRUCTURE_VALIDATION` | File structure validation | Header mismatch, missing columns |

### Common Audit Patterns

#### File Upload Pattern
```python
# Generate unique ID and timestamp
doc_id = str(uuid.uuid4())
timestamp = get_ist_timestamp()
doc_name = file.filename

try:
    # Process file
    result = process_file(file)
    
    # Log success
    log_audit_event(
        action="FILE_UPLOAD_ACTION",
        user=user,
        details={
            "file_name": doc_name,
            "doc_id": doc_id,
            "records_processed": len(result),
            "upload_timestamp": timestamp
        },
        status="success"
    )
    
except Exception as e:
    # Log failure
    log_audit_event(
        action="FILE_UPLOAD_ACTION",
        user=user,
        details={
            "file_name": doc_name,
            "doc_id": doc_id,
            "error": str(e),
            "upload_timestamp": timestamp
        },
        status="failed"
    )
    raise
```

#### Configuration Change Pattern
```python
try:
    # Get old configuration
    old_config = get_current_config()
    
    # Apply changes
    new_config = apply_changes(old_config, changes)
    
    # Log success
    log_audit_event(
        action="CONFIG_CHANGE_ACTION",
        user=user,
        details={
            "old": old_config,
            "new": new_config,
            "changes": changes
        },
        status="success"
    )
    
except Exception as e:
    # Log failure
    log_audit_event(
        action="CONFIG_CHANGE_ACTION",
        user=user,
        details={
            "error": str(e),
            "attempted_changes": changes
        },
        status="failed"
    )
    raise
```

### Best Practices

#### 1. Always Include Essential Information
```python
details = {
    "user_id": user_id,           # Who was affected
    "action_type": "create",      # What type of action
    "resource": "panel",          # What resource
    "resource_id": panel_id,      # Resource identifier
    "timestamp": timestamp        # When it happened
}
```

#### 2. Use Descriptive Error Messages
```python
details = {
    "error": "Database connection failed: Connection timeout after 30 seconds",
    "error_code": "DB_CONN_TIMEOUT",
    "attempted_operation": "panel_creation"
}
```

#### 3. Include Context for Debugging
```python
details = {
    "panel_name": panel_name,
    "file_name": file.filename,
    "file_size": len(file.read()),
    "file_type": file.content_type,
    "upload_method": "web_interface"
}
```

#### 4. Handle Audit Failures Gracefully
```python
try:
    log_audit_event(action="MY_ACTION", user=user, details=details, status="success")
except Exception as audit_error:
    # Don't let audit failure break main functionality
    logging.error(f"Failed to log audit event: {audit_error}")
    # Continue with normal flow
```

### Testing Audit Logging

#### 1. Check Audit Trail
```bash
curl http://localhost:8000/audit/trail
```

#### 2. Filter by Action
```bash
curl "http://localhost:8000/audit/trail?action=NEW_PANEL_ADDED"
```

#### 3. Filter by User
```bash
curl "http://localhost:8000/audit/trail?user=demo"
```

#### 4. Filter by Status
```bash
curl "http://localhost:8000/audit/trail?status=failed"
```

### Common Issues and Solutions

#### Issue: Audit entry not created
**Solution:** Check if audit logging is wrapped in try-catch and doesn't break main flow

#### Issue: Missing user information
**Solution:** Ensure `get_current_user(request)` is called before audit logging

#### Issue: Inconsistent timestamp format
**Solution:** Use `get_ist_timestamp()` function for consistent IST format

#### Issue: Audit details too verbose
**Solution:** Only include essential information, avoid sensitive data

### Frontend Integration

#### View Audit Trail
```javascript
// Fetch audit trail
const response = await fetch('/audit/trail');
const data = await response.json();
const auditEntries = data.audit_entries;

// Filter audit entries
const filteredEntries = auditEntries.filter(entry => 
    entry.action === 'NEW_PANEL_ADDED' && 
    entry.status === 'success'
);
```

#### Display Audit Details
```javascript
// Format audit details for display
const formatAuditDetails = (details) => {
    if (typeof details === 'string') return details;
    
    return Object.entries(details).map(([key, value]) => 
        `${key}: ${JSON.stringify(value)}`
    ).join('\n');
};
```

### Performance Tips

1. **Don't log sensitive data** - Passwords, tokens, etc.
2. **Keep details concise** - Only essential information
3. **Use appropriate action names** - Be specific and consistent
4. **Handle audit failures gracefully** - Don't break main functionality
5. **Use unique identifiers** - doc_id, recon_id, etc. for tracking

### Monitoring and Maintenance

#### Check Audit Log Size
```sql
SELECT COUNT(*) as total_entries FROM audit_trail;
SELECT COUNT(*) as recent_entries FROM audit_trail 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR);
```

#### Clean Up Old Logs
```python
from audit import cleanup_old_audit_logs
cleanup_old_audit_logs(days_to_keep=90)
```

#### Monitor Audit Performance
```python
# Check for audit logging errors in application logs
grep "Failed to log audit event" reconify.log
```

---

**Remember:** Audit logging is for accountability and debugging. Keep it simple, consistent, and non-intrusive to the main application flow. 