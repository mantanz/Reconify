# Backend API Documentation

This document describes all available API endpoints in the backend.

---

## Panels

### Get All Panels
- **GET** `/panels`
- **Description:** Retrieve all panel configurations.

### Add a Panel
- **POST** `/panels/add`
- **Body:**
  - `name` (str): Name of the panel
  - `key_mapping` (dict): Key mapping for the panel
- **Description:** Add a new panel configuration.

### Modify a Panel
- **PUT** `/panels/modify`
- **Body:**
  - `name` (str): Name of the panel
  - `key_mapping` (dict, optional): Updated key mapping
  - `panel_headers` (list, optional): Updated panel headers
- **Description:** Modify an existing panel configuration.

### Delete a Panel
- **DELETE** `/panels/delete`
- **Body:**
  - `name` (str): Name of the panel to delete
- **Description:** Delete a panel configuration.

### Upload Panel File
- **POST** `/panels/upload_file`
- **Form Data:**
  - `file` (file): CSV or Excel file
- **Description:** Upload a file and extract headers.

### Save Panel (Create Table)
- **POST** `/panels/save`
- **Body:**
  - `name` (str): Name of the panel
  - `key_mapping` (dict): Key mapping
  - `panel_headers` (list, optional): Headers for the panel table
- **Description:** Save panel configuration and create a table in the database.

### Get Panel Headers
- **GET** `/panels/{panel_name}/headers`
- **Description:** Get headers for a specific panel from the database.

---

## HR Data

### Get HR Data Fields
- **GET** `/hr_data/fields`
- **Description:** Get column names from the `hr_data` table.

---

## SOT (Source of Truth)

### Upload SOT File
- **POST** `/sot/upload`
- **Form Data:**
  - `file` (file): CSV or Excel file
  - `sot_type` (str, default: "hr_data"): SOT type/table name
- **Description:** Upload a SOT file and insert data into the corresponding table.

### List SOT Uploads
- **GET** `/sot/uploads`
- **Description:** List all SOT file uploads and their metadata.

### Get SOT Fields
- **GET** `/sot/fields/{sot_type}`
- **Description:** Get column names for a specific SOT type/table.

---

## Reconciliation

### Upload Reconciliation File
- **POST** `/recon/upload`
- **Form Data:**
  - `panel_name` (str): Name of the panel
  - `file` (file): CSV or Excel file
- **Description:** Upload a reconciliation file and insert data into the panel table.

### Get Reconciliation History for a Panel
- **GET** `/recon/history/{panel_name}`
- **Description:** Get reconciliation upload history for a specific panel.

### Get All Reconciliation History
- **GET** `/recon/history`
- **Description:** Get all reconciliation upload history.

---

## Notes
- All file uploads support both CSV and Excel formats.
- Most endpoints return JSON responses with status and error messages if applicable.
- For more details on request/response formats, refer to the backend code or contact the developer. 