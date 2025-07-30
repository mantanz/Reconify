# Backup System Summary

## Overview
The backup system automatically creates backup tables and stores existing data before new uploads, ensuring data integrity and providing rollback capabilities.

## Key Features

### 1. Automatic Backup Creation
- **Backup Table Naming**: `{original_table_name}_backup`
- **Automatic Creation**: Backup tables are created automatically if they don't exist
- **Schema Preservation**: Backup tables maintain the same structure as original tables
- **Metadata Storage**: Each backup includes `doc_id` and `upload_timestamp` for tracking

### 2. Data Backup Process
- **Existing Data Backup**: All existing data is backed up before new upload
- **Metadata Tracking**: Previous upload's `doc_id` and `timestamp` are preserved
- **Column Format**: Data is stored in proper column format (not JSON)
- **First-time Upload Handling**: No backup for first-time uploads (table doesn't exist)

### 3. Table Cleanup Process
- **Data Clearing**: Existing data is completely removed from original table
- **Status Column Removal**: For panel uploads, `initial_status` and `final_status` columns are removed to ensure clean table structure
- **Fresh Start**: New uploads start with clean table structure

### 4. Backup History
- **Metadata Retrieval**: Previous upload metadata can be retrieved
- **Backup Data Access**: Historical backup data can be accessed
- **Limited History**: Configurable limit for backup history (default: 50 records)

## Implementation Details

### Panel Upload Process (`insert_panel_data_rows_with_backup`)
1. **Check Table Existence**: Determine if table exists
2. **Backup Existing Data**: If table exists, backup all data with metadata
3. **Clear Table Data**: Remove all existing data from original table
4. **Remove Status Columns**: Remove `initial_status` and `final_status` columns for clean structure
5. **Insert New Data**: Insert new data into clean table

### SOT Upload Process (`insert_sot_data_rows_with_backup`)
1. **Check Table Existence**: Determine if table exists
2. **Backup Existing Data**: If table exists, backup all data with metadata
3. **Clear Table Data**: Remove all existing data from original table
4. **Insert New Data**: Insert new data into clean table

## Database Functions

### Core Functions
- `create_backup_table(table_name)`: Creates backup table with same schema
- `backup_existing_data(table_name, doc_id, upload_timestamp)`: Backs up existing data
- `clear_table_data(table_name)`: Removes all data from original table
- `remove_column_if_exists(table_name, column_name)`: Removes specific columns
- `get_backup_history(table_name, limit=50)`: Retrieves backup history
- `get_previous_upload_metadata(table_name, current_doc_id, current_upload_timestamp)`: Gets previous upload metadata

### Backup Table Structure
```sql
CREATE TABLE {table_name}_backup (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_id VARCHAR(255),
    upload_timestamp VARCHAR(255),
    -- All original table columns
    column1 VARCHAR(255),
    column2 VARCHAR(255),
    ...
);
```

## Usage Examples

### Panel Upload with Backup
```python
success, error_msg, backup_count = insert_panel_data_rows_with_backup(
    panel_name="HR Panel",
    rows=panel_data,
    doc_id="doc_123",
    upload_timestamp="2025-01-24 10:30:00"
)
```

### SOT Upload with Backup
```python
success, error_msg, backup_count = insert_sot_data_rows_with_backup(
    sot_name="hr_data",
    rows=sot_data,
    doc_id="doc_456",
    upload_timestamp="2025-01-24 10:30:00"
)
```

### Retrieve Backup History
```python
backup_history = get_backup_history("hr_panel", limit=10)
```

## Benefits

### 1. Data Safety
- **No Data Loss**: Existing data is always backed up before replacement
- **Rollback Capability**: Previous data can be restored if needed
- **Metadata Tracking**: Complete audit trail of uploads

### 2. Clean Table Structure
- **Status Column Management**: Panel tables start fresh without status columns
- **Consistent Schema**: New uploads have clean, predictable structure
- **No Orphaned Data**: Old status data doesn't interfere with new uploads

### 3. Operational Efficiency
- **Automatic Process**: No manual intervention required
- **Error Handling**: Graceful handling of backup/restore failures
- **Performance**: Efficient backup and restore operations

## Error Handling

### Backup Failures
- **Non-blocking**: Upload continues even if backup fails
- **Logging**: All backup operations are logged
- **Warning Messages**: Users are informed of backup issues

### Column Removal Failures
- **Non-blocking**: Upload continues even if column removal fails
- **Logging**: All column operations are logged
- **Warning Messages**: Users are informed of column removal issues

## Audit Integration

### Backup Events
- **DATA_BACKUP**: Logged when backup operations occur
- **Backup Count**: Number of records backed up is tracked
- **Metadata**: Backup timestamp and document ID are recorded

### Upload Events
- **PANEL_UPLOAD**: Logged for successful panel uploads
- **SOT_UPLOAD**: Logged for successful SOT uploads
- **Backup Integration**: Backup information included in upload audit events 