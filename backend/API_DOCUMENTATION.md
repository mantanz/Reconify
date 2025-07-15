# Reconify Backend API Documentation

This document provides comprehensive documentation for all available API endpoints in the Reconify backend system.

## Table of Contents
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Data Models](#data-models)
- [Panel Management APIs](#panel-management-apis)
- [SOT (Source of Truth) APIs](#sot-source-of-truth-apis)
- [Reconciliation APIs](#reconciliation-apis)
- [User Categorization APIs](#user-categorization-apis)
- [Debug APIs](#debug-apis)
- [Error Handling](#error-handling)

## Authentication
Currently, the API does not require authentication. All endpoints are publicly accessible.

## Base URL
```
http://localhost:8000
```

## Data Models

### PanelConfig
```json
{
  "name": "string",
  "key_mapping": {
    "sot_name": {
      "panel_field": "sot_field"
    }
  }
}
```

### PanelUpdate
```json
{
  "name": "string",
  "key_mapping": {
    "sot_name": {
      "panel_field": "sot_field"
    }
  },
  "panel_headers": ["string"]
}
```

### PanelCreate
```json
{
  "name": "string",
  "key_mapping": {
    "sot_name": {
      "panel_field": "sot_field"
    }
  },
  "panel_headers": ["string"]
}
```

### PanelName
```json
{
  "name": "string"
}
```

---

## Panel Management APIs

### 1. Get All Panels
**Endpoint:** `GET /panels`

**Description:** Retrieve all configured panel configurations.

**Response:**
```json
[
  {
    "name": "string",
    "key_mapping": {
      "sot_name": {
        "panel_field": "sot_field"
      }
    }
  }
]
```

**Example Response:**
```json
[
  {
    "name": "HR Panel",
    "key_mapping": {
      "hr_data": {
        "email": "employee_email"
      }
    }
  }
]
```

---

### 2. Add a Panel
**Endpoint:** `POST /panels/add`

**Description:** Add a new panel configuration.

**Request Body:**
```json
{
  "name": "string",
  "key_mapping": {
    "sot_name": {
      "panel_field": "sot_field"
    }
  }
}
```

**Response:**
```json
{
  "message": "Panel added"
}
```

**Error Responses:**
- `400 Bad Request`: Panel already exists

---

### 3. Modify a Panel
**Endpoint:** `PUT /panels/modify`

**Description:** Modify an existing panel configuration.

**Request Body:**
```json
{
  "name": "string",
  "key_mapping": {
    "sot_name": {
      "panel_field": "sot_field"
    }
  },
  "panel_headers": ["string"]
}
```

**Response:**
```json
{
  "message": "Panel updated"
}
```

**Error Responses:**
- `404 Not Found`: Panel not found

---

### 4. Delete a Panel
**Endpoint:** `DELETE /panels/delete`

**Description:** Delete a panel configuration.

**Request Body:**
```json
{
  "name": "string"
}
```

**Response:**
```json
{
  "message": "Panel deleted"
}
```

---

### 5. Upload Panel File
**Endpoint:** `POST /panels/upload_file`

**Description:** Upload a CSV or Excel file and extract headers for panel configuration.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:** `file` (CSV or Excel file)

**Response:**
```json
{
  "headers": ["string"]
}
```

**Example Response:**
```json
{
  "headers": ["name", "email", "department", "role"]
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file format or processing error

---

### 6. Save Panel (Create Table)
**Endpoint:** `POST /panels/save`

**Description:** Save panel configuration and create corresponding database table.

**Request Body:**
```json
{
  "name": "string",
  "key_mapping": {
    "sot_name": {
      "panel_field": "sot_field"
    }
  },
  "panel_headers": ["string"]
}
```

**Response:**
```json
{
  "message": "Panel configuration saved and table created"
}
```

**Error Responses:**
- `400 Bad Request`: Panel already exists
- `500 Internal Server Error`: MySQL table creation failed

---

### 7. Get Panel Headers
**Endpoint:** `GET /panels/{panel_name}/headers`

**Description:** Get headers for a specific panel from the database.

**Path Parameters:**
- `panel_name` (string): Name of the panel

**Response:**
```json
{
  "headers": ["string"]
}
```

**Error Responses:**
- `404 Not Found`: No headers found for this panel

---

### 8. Get Panel Upload History
**Endpoint:** `GET /panels/upload_history`

**Description:** Get reconciliation upload history for all panels.

**Response:**
```json
[
  {
    "panelname": "string",
    "docid": "string",
    "docname": "string",
    "timestamp": "string",
    "total_records": 0,
    "uploadedby": "string",
    "status": "string"
  }
]
```

---

---

## SOT (Source of Truth) APIs

### 1. Upload SOT File
**Endpoint:** `POST /sot/upload`

**Description:** Upload a SOT file and insert data into the corresponding table.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (CSV or Excel file)
  - `sot_type` (string, default: "hr_data"): SOT type/table name

**Response:**
```json
{
  "doc_id": "string",
  "doc_name": "string",
  "uploaded_by": "string",
  "timestamp": "string",
  "status": "string",
  "sot_type": "string"
}
```

**Example Response:**
```json
{
  "doc_id": "550e8400-e29b-41d4-a716-446655440000",
  "doc_name": "hr_data.csv",
  "uploaded_by": "demo",
  "timestamp": "2024-01-15T10:30:00",
  "status": "success",
  "sot_type": "hr_data"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file format or processing error

---

### 2. List SOT Uploads
**Endpoint:** `GET /sot/uploads`

**Description:** List all SOT file uploads and their metadata.

**Response:**
```json
[
  {
    "doc_id": "string",
    "doc_name": "string",
    "uploaded_by": "string",
    "timestamp": "string",
    "status": "string",
    "sot_type": "string"
  }
]
```

---

### 3. List SOTs from Config
**Endpoint:** `GET /sot/list`

**Description:** Get list of SOTs configured in panel mappings.

**Response:**
```json
{
  "sots": ["string"]
}
```

**Example Response:**
```json
{
  "sots": ["hr_data", "service_users", "internal_users"]
}
```

---

### 4. Get SOT Fields
**Endpoint:** `GET /sot/fields/{sot_type}`

**Description:** Get column names for a specific SOT type/table.

**Path Parameters:**
- `sot_type` (string): SOT type/table name

**Response:**
```json
{
  "fields": ["string"]
}
```

**Error Responses:**
- `404 Not Found`: SOT table not found or has no columns

---

---

## Reconciliation APIs

### 1. Upload Reconciliation File
**Endpoint:** `POST /recon/upload`

**Description:** Upload a reconciliation file and insert data into the panel table.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `panel_name` (string): Name of the panel
  - `file` (CSV or Excel file)

**Response:**
```json
{
  "panelname": "string",
  "docid": "string",
  "docname": "string",
  "timestamp": "string",
  "total_records": 0,
  "uploadedby": "string",
  "status": "string"
}
```

**Example Response:**
```json
{
  "panelname": "HR Panel",
  "docid": "550e8400-e29b-41d4-a716-446655440000",
  "docname": "reconciliation_data.csv",
  "timestamp": "2024-01-15T10:30:00",
  "total_records": 150,
  "uploadedby": "demo",
  "status": "uploaded"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file format or processing error

---

### 2. Process Reconciliation
**Endpoint:** `POST /recon/process`

**Description:** Perform reconciliation between a panel and SOT data.

**Request:**
- **Content-Type:** `application/x-www-form-urlencoded`
- **Body:**
  - `panel_name` (string): Name of the panel
  - `sot_type` (string): SOT type to reconcile against

**Response:**
```json
{
  "recon_id": "string",
  "summary": {
    "panel_name": "string",
    "sot_type": "string",
    "total_panel_users": 0,
    "matched": 0,
    "found_active": 0,
    "found_inactive": 0,
    "not_found": 0
  },
  "details": [
    {
      "panel_user": "string",
      "status": "string",
      "sot_data": {}
    }
  ]
}
```

**Error Responses:**
- `404 Not Found`: Panel not found
- `400 Bad Request`: No key mapping found for this SOT and panel

---

### 3. Get Reconciliation Summaries
**Endpoint:** `GET /recon/summary`

**Description:** Get all reconciliation summaries.

**Response:**
```json
[
  {
    "recon_id": "string",
    "panelname": "string",
    "sot_type": "string",
    "recon_month": "string",
    "status": "string",
    "upload_date": "string",
    "uploaded_by": "string",
    "start_date": "string",
    "performed_by": "string",
    "error": "string"
  }
]
```

---

### 4. Get Reconciliation Summary Detail
**Endpoint:** `GET /recon/summary/{recon_id}`

**Description:** Get detailed reconciliation summary by ID.

**Path Parameters:**
- `recon_id` (string): Reconciliation ID

**Response:**
```json
{
  "recon_id": "string",
  "panelname": "string",
  "sot_type": "string",
  "recon_month": "string",
  "status": "string",
  "upload_date": "string",
  "uploaded_by": "string",
  "start_date": "string",
  "performed_by": "string",
  "error": "string",
  "details": {
    "summary": {},
    "details": []
  }
}
```

**Error Responses:**
- `404 Not Found`: Reconciliation summary not found

---

---

## User Categorization APIs

### 1. Categorize Users
**Endpoint:** `POST /categorize_users`

**Description:** Dynamically categorize users in a panel based on configured SOT mappings. Only supports three SOTs: service_users, internal_users, and thirdparty_users.

**Request:**
- **Content-Type:** `application/x-www-form-urlencoded`
- **Body:**
  - `panel_name` (string): Name of the panel

**Response:**
```json
{
  "message": "User categorization complete",
  "summary": {
    "service_users": 0,
    "internal_users": 0,
    "thirdparty_users": 0,
    "not_found": 0,
    "total": 0,
    "errors": 0
  },
  "panel_name": "string",
  "total_processed": 0,
  "successful_updates": 0
}
```

**Example Response:**
```json
{
  "message": "User categorization complete",
  "summary": {
    "service_users": 45,
    "internal_users": 23,
    "thirdparty_users": 12,
    "not_found": 5,
    "total": 85,
    "errors": 0
  },
  "panel_name": "HR Panel",
  "total_processed": 85,
  "successful_updates": 80
}
```

**Error Responses:**
- `404 Not Found`: Panel not found
- `400 Bad Request`: No key mappings configured or no valid SOTs
- `500 Internal Server Error`: Database update failed

---

---

## Debug APIs

### 1. Debug SOT Table
**Endpoint:** `GET /debug/sot/{sot_name}`

**Description:** Debug endpoint to inspect SOT table data and structure.

**Path Parameters:**
- `sot_name` (string): Name of the SOT table

**Response:**
```json
{
  "sot_name": "string",
  "row_count": 0,
  "columns": ["string"],
  "sample_data": [
    {
      "column1": "value1",
      "column2": "value2"
    }
  ]
}
```

**Error Responses:**
- `500 Internal Server Error`: Error accessing SOT table

---

---

## Error Handling

### Standard Error Response Format
```json
{
  "detail": "Error message description"
}
```

### Common HTTP Status Codes
- `200 OK`: Request successful
- `400 Bad Request`: Invalid request data or parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Error Examples

**Panel Not Found:**
```json
{
  "detail": "Panel not found"
}
```

**Invalid File Format:**
```json
{
  "detail": "Unable to decode file. Please ensure it's a valid CSV or Excel file."
}
```

**Database Error:**
```json
{
  "detail": "MySQL table creation failed: Table already exists"
}
```

---

## File Upload Support

### Supported File Formats
- **CSV files** (.csv)
- **Excel files** (.xlsx, .xls)

### File Processing
- Files are automatically processed to extract headers
- Headers are converted to lowercase
- Multiple encoding formats are supported (UTF-8, Latin-1, CP1252, ISO-8859-1)
- Large files are handled efficiently

### File Size Limits
- No explicit file size limits are set
- Performance may vary based on file size and server resources

---

## Database Schema

### Panel Tables
- Tables are created dynamically based on panel configuration
- Table names are sanitized (lowercase, underscores)
- All columns are VARCHAR(2000) to accommodate various data types
- Additional columns like `initial_status` are added as needed

### SOT Tables
- Tables are created automatically when SOT data is uploaded
- Schema matches the uploaded file structure
- All columns are VARCHAR(2000)

---

## Notes

1. **CORS Support**: The API includes CORS middleware to support frontend applications
2. **Logging**: All operations are logged for debugging and monitoring
3. **UUID Generation**: Unique IDs are generated for documents and reconciliations
4. **Bulk Operations**: Database operations are optimized for bulk inserts and updates
5. **Error Recovery**: The system includes comprehensive error handling and recovery mechanisms

For additional support or questions, please refer to the backend code or contact the development team. 