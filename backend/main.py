from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Path
from pydantic import BaseModel
from typing import List, Dict, Optional
import json
import os
import csv
from fastapi.middleware.cors import CORSMiddleware
from db.mysql_utils import create_panel_table, get_panel_headers_from_db, insert_panel_data_rows, insert_sot_data_rows, fetch_all_rows
import uuid
from datetime import datetime
import logging
import pandas as pd

# Configure logging for production
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('reconify.log'),
        logging.StreamHandler()
    ]
)

app = FastAPI()
DB_PATH = "config_db.json"
HR_DATA_SAMPLE_PATH = os.path.join("db", "HR_data_sample.csv")
SOT_UPLOADS_PATH = "sot_uploads.json"
RECON_HISTORY_PATH = "panel_history.json"
RECON_SUMMARY_PATH = "reconciliation_summary.json"

# Models
class PanelConfig(BaseModel):
    name: str
    key_mapping: Dict[str, dict]
    

class PanelName(BaseModel):
    name: str

class PanelUpdate(BaseModel):
    name: str
    key_mapping: Optional[dict] = None
    panel_headers: Optional[list] = None

class PanelCreate(BaseModel):
    name: str
    key_mapping: dict
    panel_headers: Optional[list] = None

# Helper functions
def load_db():
    if not os.path.exists(DB_PATH):
        with open(DB_PATH, "w") as f:
            json.dump({"panels": []}, f)
    with open(DB_PATH, "r") as f:
        return json.load(f)

def save_db(data):
    with open(DB_PATH, "w") as f:
        json.dump(data, f, indent=2)


# API Endpoints

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/panels", response_model=List[PanelConfig])
def get_panels():
    db = load_db()
    return db["panels"]

@app.post("/panels/add")
def add_panel(panel: PanelConfig):
    db = load_db()
    if any(p["name"] == panel.name for p in db["panels"]):
        raise HTTPException(status_code=400, detail="Panel already exists")
    db["panels"].append(panel.dict())
    save_db(db)
    return {"message": "Panel added"}

@app.put("/panels/modify")
def modify_panel(update: PanelUpdate):
    db = load_db()
    for panel in db["panels"]:
        if panel["name"] == update.name:
            if update.key_mapping is not None:
                panel["key_mapping"] = update.key_mapping
            if update.panel_headers is not None:
                panel["panel_headers"] = update.panel_headers
            save_db(db)
            return {"message": "Panel updated"}
    raise HTTPException(status_code=404, detail="Panel not found")

@app.delete("/panels/delete")
def delete_panel(panel: PanelName):
    db = load_db()
    db["panels"] = [p for p in db["panels"] if p["name"] != panel.name]
    save_db(db)
    return {"message": "Panel deleted"}

@app.post("/panels/upload_file")
def upload_panel_file(file: UploadFile = File(...)):
    # Read the uploaded file and return headers
    filename = file.filename.lower()
    contents = file.file.read()
    headers = []
    
    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            import io
            df = pd.read_excel(io.BytesIO(contents))
            # Convert headers to lowercase
            df.columns = [col.strip().lower() for col in df.columns]
            headers = list(df.columns)
        else:
            # Try different encodings for CSV files
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            lines = None
            
            for encoding in encodings:
                try:
                    lines = contents.decode(encoding).splitlines()
                    break
                except UnicodeDecodeError:
                    continue
            
            if lines is None:
                raise HTTPException(status_code=400, detail="Unable to decode file. Please ensure it's a valid CSV or Excel file.")
            
            import csv
            reader = csv.reader(lines)
            # Convert headers to lowercase
            headers = [h.strip().lower() for h in next(reader)]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    
    return {"headers": headers}

# @app.get("/hr_data/fields")
# def get_hr_data_fields():
#     # Fetch column names from the hr_data table in MySQL
#     headers = get_hr_data_headers_from_db("hr_data")
#     if not headers:
#         raise HTTPException(status_code=404, detail="hr_data table not found or has no columns")
#     return {"fields": headers}

@app.post("/panels/save")
def save_panel(panel: PanelCreate):
    db = load_db()
    if any(p["name"] == panel.name for p in db["panels"]):
        raise HTTPException(status_code=400, detail="Panel already exists")
    db["panels"].append({
        "name": panel.name,
        "key_mapping": panel.key_mapping
    })
    save_db(db)
    # Create table in MySQL
    success, error = create_panel_table(panel.name, panel.panel_headers or [])
    if not success:
        raise HTTPException(status_code=500, detail=f"MySQL table creation failed: {error}")
    return {"message": "Panel configuration saved and table created"}

@app.get("/panels/{panel_name}/headers")
def get_panel_headers(panel_name: str):
    headers = get_panel_headers_from_db(panel_name)
    if not headers:
        raise HTTPException(status_code=404, detail="No headers found for this panel in the database")
    return {"headers": headers}

@app.post("/sot/upload")
def upload_sot(file: UploadFile = File(...), sot_type: str = Form("hr_data")):
    # Generate doc_id and metadata
    doc_id = str(uuid.uuid4())
    doc_name = file.filename
    uploaded_by = "demo"
    timestamp = datetime.utcnow().isoformat()
    status = "uploaded"
    filename = file.filename.lower()
    contents = file.file.read()
    
    try:
        # Read and parse file
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            import io
            df = pd.read_excel(io.BytesIO(contents))
            # Convert headers to lowercase
            df.columns = [col.strip().lower() for col in df.columns]
            rows = df.to_dict(orient="records")
        else:
            # Try different encodings for CSV files
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            lines = None
            for encoding in encodings:
                try:
                    lines = contents.decode(encoding).splitlines()
                    break
                except UnicodeDecodeError:
                    continue
            if lines is None:
                raise HTTPException(status_code=400, detail="Unable to decode file. Please ensure it's a valid CSV or Excel file.")
            import csv
            reader = csv.DictReader(lines)
            # Convert headers to lowercase and clean data
            reader.fieldnames = [h.strip().lower() for h in reader.fieldnames]
            rows = [dict((k.strip().lower(), v.strip() if v is not None else "") for k, v in row.items()) for row in reader]
    except Exception as e:
        return {"error": f"Error processing file: {str(e)}", "doc_id": doc_id, "doc_name": doc_name, "uploaded_by": uploaded_by, "timestamp": timestamp, "status": "error", "sot_type": sot_type}
    
    # Insert into the correct SOT table (auto-create if needed)
    db_status, db_error = insert_sot_data_rows(sot_type, rows)
    status = "success" if db_status else f"error: {db_error}"
    # Store metadata in JSON
    meta = {"doc_id": doc_id, "doc_name": doc_name, "uploaded_by": uploaded_by, "timestamp": timestamp, "status": status, "sot_type": sot_type}
    try:
        if not os.path.exists(SOT_UPLOADS_PATH):
            with open(SOT_UPLOADS_PATH, "w") as f:
                json.dump([], f)
        with open(SOT_UPLOADS_PATH, "r+") as f:
            data = json.load(f)
            data.append(meta)
            f.seek(0)
            json.dump(data, f, indent=2)
    except Exception as e:
        logging.error(f"Failed to write SOT metadata: {e}")
        return {"error": f"Failed to write metadata: {e}", **meta}
    if not db_status:
        return {"error": db_error, **meta}
    return meta

@app.get("/sot/uploads")
def list_sot_uploads():
    if not os.path.exists(SOT_UPLOADS_PATH):
        return []
    with open(SOT_UPLOADS_PATH, "r") as f:
        return json.load(f)

@app.get("/sot/list")
def list_sots_from_config():
    db = load_db()
    sots = set()
    for panel in db.get("panels", []):
        key_mapping = panel.get("key_mapping", {})
        sots.update(key_mapping.keys())
    
    # If no SOTs found in config, provide default SOT types
    if not sots:
        default_sots = [
            "hr_data",
            "service_users", 
            "internal_users",
            "thirdparty_users"
        ]
        sots.update(default_sots)
    
    return {"sots": sorted(list(sots))}

@app.post("/recon/upload")
def upload_recon(panel_name: str = File(...), file: UploadFile = File(...)):
    doc_id = str(uuid.uuid4())
    doc_name = file.filename
    uploaded_by = "demo"
    timestamp = datetime.utcnow().isoformat()
    filename = file.filename.lower()
    contents = file.file.read()
    
    try:
        # Read and parse file
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            import io
            df = pd.read_excel(io.BytesIO(contents))
            rows = df.to_dict(orient="records")
            total_records = len(df)
        else:
            # Try different encodings for CSV files
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            lines = None
            
            for encoding in encodings:
                try:
                    lines = contents.decode(encoding).splitlines()
                    break
                except UnicodeDecodeError:
                    continue
            
            if lines is None:
                raise HTTPException(status_code=400, detail="Unable to decode file. Please ensure it's a valid CSV or Excel file.")
            
            import csv
            reader = csv.DictReader(lines)
            rows = [dict((k.strip().lower(), v.strip() if v is not None else "") for k, v in row.items()) for row in reader]
            total_records = max(len(lines) - 1, 0)  # Exclude header
    except Exception as e:
        return {"error": f"Error processing file: {str(e)}", "panelname": panel_name, "docid": doc_id, "docname": doc_name, "timestamp": timestamp, "total_records": 0, "uploadedby": uploaded_by, "status": "error"}
    
    status = "uploaded"
    # Insert into panel table
    db_status, db_error = insert_panel_data_rows(panel_name, rows)
    if not db_status:
        status = f"error: {db_error}"
        return {"error": db_error, "panelname": panel_name, "docid": doc_id, "docname": doc_name, "timestamp": timestamp, "total_records": total_records, "uploadedby": uploaded_by, "status": status}
    meta = {
        "panelname": panel_name,
        "docid": doc_id,
        "docname": doc_name,
        "timestamp": timestamp,
        "total_records": total_records,
        "uploadedby": uploaded_by,
        "status": status
    }
    try:
        if not os.path.exists(RECON_HISTORY_PATH):
            with open(RECON_HISTORY_PATH, "w") as f:
                json.dump([], f)
        with open(RECON_HISTORY_PATH, "r+") as f:
            data = json.load(f)
            data.append(meta)
            f.seek(0)
            json.dump(data, f, indent=2)
    except Exception as e:
        return {"error": f"Failed to write panel history: {e}", **meta}
    return meta

@app.get("/panels/upload_history")
def get_panel_upload_history():
    if not os.path.exists(RECON_HISTORY_PATH):
        return []
    with open(RECON_HISTORY_PATH, "r") as f:
        return json.load(f)

@app.get("/sot/fields/{sot_type}")
def get_sot_fields(sot_type: str):
    headers = get_panel_headers_from_db(sot_type)
    if not headers:
        # Return empty fields instead of 404 error for SOTs that don't exist yet
        return {"fields": []}
    return {"fields": headers}

@app.get("/panels/{panel_name}/details")
def get_panel_details(panel_name: str):
    """
    Fetch panel data rows for a specific panel.
    Returns only the panel rows data.
    """
    try:
        # Load panel configuration to verify panel exists
        db = load_db()
        panel = next((p for p in db["panels"] if p["name"] == panel_name), None)
        if not panel:
            raise HTTPException(status_code=404, detail="Panel not found")
        
        # Get panel headers from database
        headers = get_panel_headers_from_db(panel_name)
        if not headers:
            raise HTTPException(status_code=404, detail="Panel table not found in database")
        
        # Fetch all panel data
        try:
            panel_rows = fetch_all_rows(panel_name)
            if not panel_rows:
                panel_rows = []
        except Exception as e:
            logging.error(f"Error fetching panel data: {e}")
            raise HTTPException(status_code=500, detail=f"Error fetching panel data: {str(e)}")
        
        logging.info(f"Fetched {len(panel_rows)} rows for panel '{panel_name}'")
        
        return {
            "panel_name": panel_name,
            "rows": panel_rows
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching panel details for '{panel_name}': {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/debug/sot/{sot_name}")
def debug_sot_table(sot_name: str):
    """
    Debug endpoint to inspect SOT table data and structure.
    """
    try:
        from db.mysql_utils import fetch_all_rows
        rows = fetch_all_rows(sot_name)
        
        if not rows:
            return {
                "sot_name": sot_name,
                "row_count": 0,
                "columns": [],
                "sample_data": []
            }
        
        # Get column names from first row
        columns = list(rows[0].keys()) if rows else []
        
        # Get sample data (first 5 rows)
        sample_data = rows[:5]
        
        return {
            "sot_name": sot_name,
            "row_count": len(rows),
            "columns": columns,
            "sample_data": sample_data
        }
    except Exception as e:
        logging.error(f"Error debugging SOT table {sot_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error accessing SOT table: {str(e)}")

@app.post("/recon/process")
def reconcile_panel_with_sot(panel_name: str = Form(...)):
    """
    Reconcile internal users and not found users from panel with HR data.
    Processes records where initial_status indicates internal users or not found users.
    Updates initial_status column with HR status (active/inactive/not found).
    """
    try:
        # Load config and get key mapping for HR data
        db = load_db()
        panel = next((p for p in db["panels"] if p["name"] == panel_name), None)
        if not panel:
            raise HTTPException(status_code=404, detail="Panel not found")
        
        key_mapping = panel["key_mapping"].get("hr_data", {})
        if not key_mapping:
            raise HTTPException(status_code=400, detail="No HR data key mapping found for this panel")
        
        panel_key, hr_key = list(key_mapping.items())[0]
        
        # Fetch panel data
        panel_rows = fetch_all_rows(panel_name)
        if not panel_rows:
            raise HTTPException(status_code=404, detail="No panel data found")
        
        # Categorize users based on initial_status
        users_to_reconcile = []  # Internal users + not found users
        other_users = []
        service_users_count = 0
        thirdparty_users_count = 0
        not_found_count = 0
        internal_users_count = 0
        
        for row in panel_rows:
            initial_status_raw = row.get("initial_status", "")
            initial_status = initial_status_raw.strip().lower() if initial_status_raw is not None else ""
            
            # Check if this user should be reconciled (internal users or not found users)
            if initial_status in ["employee", "internal", "internal_user", "internal users"]:
                users_to_reconcile.append(row)
                internal_users_count += 1
            elif initial_status in ["not found", "not_found"]:
                users_to_reconcile.append(row)
                not_found_count += 1
            else:
                other_users.append(row)
                # Count by category for summary
                if initial_status in ["service", "service_user", "service users"]:
                    service_users_count += 1
                elif initial_status in ["thirdparty", "thirdparty_user", "thirdparty users"]:
                    thirdparty_users_count += 1
        
        logging.info(f"Found {len(users_to_reconcile)} users to reconcile ({internal_users_count} internal + {not_found_count} not found) and {len(other_users)} other users out of {len(panel_rows)} total panel users")
        
        if not users_to_reconcile:
            return {
                "recon_id": None,
                "summary": {
                    "panel_name": panel_name,
                    "total_panel_users": len(panel_rows),
                    "internal_users": 0,
                    "not_found_users": 0,
                    "users_to_reconcile": 0,
                    "other_users": len(other_users),
                    "service_users": service_users_count,
                    "thirdparty_users": thirdparty_users_count,
                    "matched": 0,
                    "found_active": 0,
                    "found_inactive": 0,
                    "not_found": 0
                },
                "details": [],
                "message": "No internal users or not found users to reconcile"
            }
        
        # Fetch HR data
        hr_rows = fetch_all_rows("hr_data")
        if not hr_rows:
            raise HTTPException(status_code=404, detail="HR data not found")
        
        # Create HR lookup
        hr_lookup = {}
        for row in hr_rows:
            hr_value = row.get(hr_key, "")
            if hr_value is not None:
                hr_lookup[str(hr_value).strip().lower()] = row
        
        details = []
        summary = {
            "panel_name": panel_name,
            "total_panel_users": len(panel_rows),
            "internal_users": internal_users_count,
            "not_found_users": not_found_count,
            "users_to_reconcile": len(users_to_reconcile),
            "other_users": len(other_users),
            "service_users": service_users_count,
            "thirdparty_users": thirdparty_users_count,
            "matched": 0,
            "found_active": 0,
            "found_inactive": 0,
            "not_found": 0
        }
        
        updates = []
        
        # Process each user to reconcile (internal users + not found users)
        for user_row in users_to_reconcile:
            panel_val_raw = user_row.get(panel_key, "")
            panel_val = str(panel_val_raw).strip().lower() if panel_val_raw is not None else ""
            hr_row = hr_lookup.get(panel_val)
            
            user_status = "not found"
            employment_status = None
            
            if hr_row:
                # Found in HR data
                employment_status = hr_row.get("Employment Status") or hr_row.get("employment_status")
                
                if employment_status:
                    if employment_status.lower() in ["active", "resigned"]:
                        user_status = "active"
                        summary["found_active"] += 1
                    elif employment_status.lower() == "inactive":
                        user_status = "inactive"
                        summary["found_inactive"] += 1
                    else:
                        user_status = f"found ({employment_status.lower()})"
                else:
                    user_status = "found (unknown status)"
                
                summary["matched"] += 1
            else:
                summary["not_found"] += 1
            
            # Prepare update record
            updates.append({
                panel_key: panel_val,
                "initial_status": user_status
            })
            
            details.append({
                "panel_user": user_row,
                "hr_user": hr_row,
                "user_status": user_status,
                "employment_status": employment_status
            })
        
        # Update panel table with new statuses
        from db.mysql_utils import update_initial_status_bulk
        success, error_msg = update_initial_status_bulk(panel_name, updates, match_field=panel_key)
        
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to update panel data: {error_msg}")
        
        # Create reconciliation record
        now = datetime.utcnow()
        recon_id = f"RCN_{uuid.uuid4().hex[:8]}"
        recon_month = now.strftime("%b'%y")
        start_date = now.strftime("%Y-%m-%d")
        performed_by = "demo"
        
        # Find upload info from panel history
        upload_date = None
        uploaded_by = None
        if os.path.exists(RECON_HISTORY_PATH):
            with open(RECON_HISTORY_PATH, "r") as f:
                panel_history = json.load(f)
            for entry in reversed(panel_history):
                if entry.get("panelname") == panel_name:
                    upload_date = entry.get("timestamp", None)
                    uploaded_by = entry.get("uploadedby", None)
                    break
        
        status = "complete"
        error = None
        
        recon_record = {
            "recon_id": recon_id,
            "panelname": panel_name,
            "sot_type": "hr_data",
            "recon_month": recon_month,
            "status": status,
            "upload_date": upload_date,
            "uploaded_by": uploaded_by,
            "start_date": start_date,
            "performed_by": performed_by,
            "error": error,
            "summary": summary
        }
        
        # Store in reconciliation_summary.json
        try:
            if not os.path.exists(RECON_SUMMARY_PATH):
                with open(RECON_SUMMARY_PATH, "w") as f:
                    json.dump([], f)
            with open(RECON_SUMMARY_PATH, "r+") as f:
                data = json.load(f)
                data.append(recon_record)
                f.seek(0)
                json.dump(data, f, indent=2)
        except Exception as e:
            logging.error(f"Failed to write reconciliation summary: {e}")
        
        logging.info(f"HR reconciliation completed for panel '{panel_name}'. Summary: {summary}")
        
        return {
            "recon_id": recon_id,
            "summary": summary,
            "details": [],
            "message": f"Reconciled {len(users_to_reconcile)} users ({internal_users_count} internal + {not_found_count} not found) with HR data"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected error in HR reconciliation: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/recon/summary")
def get_recon_summaries():
    if not os.path.exists(RECON_SUMMARY_PATH):
        return []
    with open(RECON_SUMMARY_PATH, "r") as f:
        data = json.load(f)
    return data

@app.get("/recon/summary/{recon_id}")
def get_recon_summary_detail(recon_id: str = Path(...)):
    if not os.path.exists(RECON_SUMMARY_PATH):
        raise HTTPException(status_code=404, detail="No reconciliation summaries found")
    with open(RECON_SUMMARY_PATH, "r") as f:
        data = json.load(f)
    for rec in data:
        if rec.get("recon_id") == recon_id:
            return rec
    raise HTTPException(status_code=404, detail="Reconciliation summary not found")

@app.post("/categorize_users")
def categorize_users(panel_name: str = Form(...)):
    """
    Dynamically categorize users in a panel based on configured SOT mappings.
    This function is production-ready and handles any number of SOTs with any field mappings.
    
    NOTE: User categorization is restricted to only three SOTs:
    - service_users (highest priority)
    - internal_users (medium priority) 
    - thirdparty_users (lowest priority)
    
    Other SOTs in the key_mapping will be ignored for categorization purposes.
    """
    try:
        db = load_db()
        panel = next((p for p in db["panels"] if p["name"] == panel_name), None)
        if not panel:
            raise HTTPException(status_code=404, detail="Panel not found")
        
        key_mapping = panel.get("key_mapping", {})
        if not key_mapping:
            raise HTTPException(
                status_code=400, 
                detail=f"No key mappings configured for panel '{panel_name}'. Please configure key mappings first."
            )
        
        # Get all configured SOTs dynamically
        configured_sots = list(key_mapping.keys())
        if not configured_sots:
            raise HTTPException(
                status_code=400, 
                detail=f"No SOTs configured for panel '{panel_name}'. Please configure at least one SOT mapping."
            )
        
        # Restrict to only the three allowed SOTs for user categorization
        allowed_sots = ["service_users", "internal_users", "thirdparty_users"]
        configured_sots = [sot for sot in configured_sots if sot in allowed_sots]
        
        if not configured_sots:
            raise HTTPException(
                status_code=400, 
                detail=f"No valid SOTs configured for user categorization. Only 'service_users', 'internal_users', and 'thirdparty_users' are allowed. Available mappings: {list(key_mapping.keys())}"
            )
        
        # Production logging (replace print with proper logging)
        logging.info(f"Starting user categorization for panel: {panel_name}")
        logging.info(f"Configured SOTs for categorization: {configured_sots}")
        logging.debug(f"Key mapping configuration: {key_mapping}")
        
        # Fetch data for all configured SOTs
        sot_data = {}
        for sot in configured_sots:
            try:
                sot_data[sot] = fetch_all_rows(sot)
                logging.info(f"Fetched {len(sot_data[sot])} rows from SOT: {sot}")
            except Exception as e:
                logging.error(f"Failed to fetch data from SOT '{sot}': {e}")
                sot_data[sot] = []
        
        # Fetch panel data
        try:
            panel_rows = fetch_all_rows(panel_name)
            logging.info(f"Fetched {len(panel_rows)} rows from panel: {panel_name}")
        except Exception as e:
            logging.error(f"Failed to fetch panel data: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch panel data: {str(e)}")
        
        # Initialize summary dynamically
        summary = {sot: 0 for sot in configured_sots}
        summary["not_found"] = 0
        summary["total"] = len(panel_rows)
        summary["errors"] = 0
        updates = []

        # Helper function to extract panel_field and sot_field from mapping
        def extract_mapping_fields(mapping):
            """Extract panel_field and sot_field from mapping, supporting both old and new formats."""
            if not mapping:
                return None, None
            
            # Handle new format: {'panel_field': 'panel_field_value', 'sot_field': 'sot_field_value'}
            if 'panel_field' in mapping and 'sot_field' in mapping:
                return mapping['panel_field'], mapping['sot_field']
            
            # Handle old format: {'panel_field': 'sot_field'}
            if len(mapping) == 1:
                panel_field, sot_field = list(mapping.items())[0]
                return panel_field, sot_field
            
            return None, None

        # Determine the match_field (key field) for the panel
        # Prioritize service_users mapping, then fall back to other SOTs
        match_field = None
        
        # Define the priority order for match_field determination
        priority_sots = ["service_users", "internal_users", "thirdparty_users"]
        
        # Try to get match_field from SOTs in priority order
        for sot in priority_sots:
            if sot in configured_sots:
                mapping = key_mapping.get(sot, {})
                panel_field, _ = extract_mapping_fields(mapping)
                if panel_field:
                    match_field = panel_field
                    logging.info(f"Using '{match_field}' as primary key field (from {sot})")
                    break
        
        if not match_field:
            raise HTTPException(
                status_code=400, 
                detail=f"No valid panel field mapping found in key_mapping for panel '{panel_name}'. Please configure the key mapping first. Available mappings: {key_mapping}"
            )

        # Build lookups for each SOT using the configured SOT field
        lookups = {}
        for sot in configured_sots:
            mapping = key_mapping.get(sot, {})
            panel_field, sot_field = extract_mapping_fields(mapping)
            logging.info(f"SOT {sot}: panel_field='{panel_field}', sot_field='{sot_field}'")
            
            if sot_field:
                # Create lookup with proper error handling
                try:
                    lookups[sot] = {
                        str(row.get(sot_field, "")).strip().lower(): row 
                        for row in sot_data[sot] 
                        if row.get(sot_field) is not None
                    }
                    logging.info(f"Built lookup for {sot} with {len(lookups[sot])} entries using field '{sot_field}'")
                    logging.debug(f"Sample lookup keys for {sot}: {list(lookups[sot].keys())[:5]}")  # Show first 5 keys
                except Exception as e:
                    logging.error(f"Error building lookup for {sot}: {e}")
                    lookups[sot] = {}
            else:
                logging.warning(f"No SOT field configured for {sot}")
                lookups[sot] = {}

        # Process each panel row
        for row_idx, row in enumerate(panel_rows):
            try:
                status = "not found"
                found = False
                
                # Check SOTs in priority order: service_users -> internal_users -> thirdparty_users
                priority_sots = ["service_users", "internal_users", "thirdparty_users"]
                
                for sot in priority_sots:
                    if sot not in configured_sots:
                        continue
                        
                    mapping = key_mapping.get(sot, {})
                    panel_field, sot_field = extract_mapping_fields(mapping)
                    
                    if not panel_field or not sot_field:
                        continue
                    
                    # Get panel value
                    panel_value = row.get(panel_field, "")
                    if not panel_value:
                        continue
                    
                    panel_value = str(panel_value).strip().lower()
                    original_panel_value = panel_value  # Keep original for logging
                    
                    # Apply domain matching for internal_users and thirdparty_users
                    # Check if this SOT uses domain matching (either by flag or by field name)
                    use_domain_matching = mapping.get("use_domain_matching", False)
                    is_domain_sot = sot in ["internal_users", "thirdparty_users"] and sot_field == "domain"
                    
                    if (use_domain_matching or is_domain_sot) and "@" in panel_value:
                        panel_value = panel_value.split("@")[-1].strip().lower()
                        logging.debug(f"Row {row_idx}: Extracted domain '{panel_value}' from '{original_panel_value}' for {sot}")
                    
                    # Look for match in SOT
                    if panel_value in lookups[sot]:
                        sot_row = lookups[sot][panel_value]
                        
                        # Try to get user type from various possible field names
                        user_type_fields = ["user_type", "usertype", "type", "status", "category"]
                        user_type = None
                        for field in user_type_fields:
                            user_type = sot_row.get(field)
                            if user_type:
                                break
                        
                        status = user_type if user_type else "found"
                        summary[sot] += 1
                        found = True
                        logging.debug(f"Row {row_idx}: Found in {sot} with status '{status}' (looked for '{panel_value}')")
                        break  # Stop checking other SOTs once a match is found
                    else:
                        logging.debug(f"Row {row_idx}: Not found in {sot} (looked for '{panel_value}')")
                
                if not found:
                    summary["not_found"] += 1
                    logging.debug(f"Row {row_idx}: Not found in any SOT")
                
                # Add to updates
                match_value = row.get(match_field, "")
                if match_value is not None:
                    updates.append({
                        match_field: str(match_value).strip().lower(), 
                        "initial_status": status
                    })
                else:
                    logging.warning(f"Row {row_idx}: match_field '{match_field}' is None")
                    summary["errors"] += 1
                    
            except Exception as e:
                logging.error(f"Error processing row {row_idx}: {e}")
                summary["errors"] += 1
                continue

        # Update database
        try:
            from db.mysql_utils import add_column_if_not_exists, update_initial_status_bulk
            add_column_if_not_exists(panel_name, "initial_status", "VARCHAR(255)")
            
            success, error_msg = update_initial_status_bulk(panel_name, updates, match_field=match_field)
            if not success:
                raise HTTPException(status_code=500, detail=f"Database update failed: {error_msg}")
            
            if error_msg:
                logging.warning(f"Database update completed with warnings: {error_msg}")
            
            logging.info(f"Successfully updated {len(updates)} rows in panel '{panel_name}'")
        except Exception as e:
            logging.error(f"Failed to update database: {e}")
            raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
        
        logging.info(f"User categorization completed for panel '{panel_name}'. Summary: {summary}")
        return {
            "message": "User categorization complete", 
            "summary": summary,
            "panel_name": panel_name,
            "total_processed": len(panel_rows),
            "successful_updates": len(updates)
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logging.error(f"Unexpected error in categorize_users: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 

@app.post("/recategorize_users")
def recategorize_users(panel_name: str = Form(...), file: UploadFile = File(...)):
    """
    Recategorize users in a panel based on an uploaded file.
    Matches panel users with the uploaded file and updates final_status column.
    If no match found, uses initial_status value.
    """
    try:
        # Load panel configuration
        db = load_db()
        panel = next((p for p in db["panels"] if p["name"] == panel_name), None)
        if not panel:
            raise HTTPException(status_code=404, detail="Panel not found")
        
        # Process uploaded file
        filename = file.filename.lower()
        contents = file.file.read()
        
        try:
            # Read and parse file
            if filename.endswith(".xlsx") or filename.endswith(".xls"):
                import io
                df = pd.read_excel(io.BytesIO(contents))
                # Convert headers to lowercase
                df.columns = [col.strip().lower() for col in df.columns]
                recategorization_data = df.to_dict(orient="records")
            else:
                # Try different encodings for CSV files
                encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
                lines = None
                for encoding in encodings:
                    try:
                        lines = contents.decode(encoding).splitlines()
                        break
                    except UnicodeDecodeError:
                        continue
                if lines is None:
                    raise HTTPException(status_code=400, detail="Unable to decode file. Please ensure it's a valid CSV or Excel file.")
                
                import csv
                reader = csv.DictReader(lines)
                # Convert headers to lowercase and clean data
                reader.fieldnames = [h.strip().lower() for h in reader.fieldnames]
                recategorization_data = [dict((k.strip().lower(), v.strip() if v is not None else "") for k, v in row.items()) for row in reader]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
        
        if not recategorization_data:
            raise HTTPException(status_code=400, detail="No data found in uploaded file")
        
        # Get panel data
        panel_rows = fetch_all_rows(panel_name)
        if not panel_rows:
            raise HTTPException(status_code=404, detail="No panel data found")
        
        # Determine match field from panel configuration
        # Use the first available mapping field as the match field
        key_mapping = panel.get("key_mapping", {})
        if not key_mapping:
            raise HTTPException(status_code=400, detail="No key mappings configured for this panel")
        
        # Get the first mapping to determine the match field
        first_mapping = next(iter(key_mapping.values()))
        if not first_mapping:
            raise HTTPException(status_code=400, detail="Invalid key mapping configuration")
        
        # Extract panel field from mapping
        panel_field = list(first_mapping.keys())[0]
        
        # Determine type column from uploaded file
        # Look for common type column names
        type_column = None
        type_column_candidates = ["type", "user_type", "status", "category", "final_status", "classification"]
        
        for candidate in type_column_candidates:
            if candidate in recategorization_data[0]:
                type_column = candidate
                break
        
        if not type_column:
            raise HTTPException(status_code=400, detail="No type column found in uploaded file. Expected one of: type, user_type, status, category, final_status, classification")
        
        # Determine match column from uploaded file
        # Look for common match column names
        match_column = None
        match_column_candidates = ["email", "user_email", "domain", "id", "user_id", "employee_id"]
        
        for candidate in match_column_candidates:
            if candidate in recategorization_data[0]:
                match_column = candidate
                break
        
        if not match_column:
            raise HTTPException(status_code=400, detail="No match column found in uploaded file. Expected one of: email, user_email, domain, id, user_id, employee_id")
        
        logging.info(f"Recategorization: panel_field='{panel_field}', match_column='{match_column}', type_column='{type_column}'")
        
        # Create lookup from uploaded file
        recategorization_lookup = {}
        for row in recategorization_data:
            match_value = row.get(match_column, "")
            type_value = row.get(type_column, "")
            if match_value and type_value:
                recategorization_lookup[str(match_value).strip().lower()] = str(type_value).strip()
        
        logging.info(f"Created recategorization lookup with {len(recategorization_lookup)} entries")
        
        # Process each panel user
        updates = []
        summary = {
            "total_panel_users": len(panel_rows),
            "matched": 0,
            "not_found": 0,
            "errors": 0
        }
        
        for row_idx, panel_row in enumerate(panel_rows):
            try:
                panel_value = panel_row.get(panel_field, "")
                if not panel_value:
                    logging.warning(f"Row {row_idx}: Missing panel field '{panel_field}'")
                    summary["errors"] += 1
                    continue
                
                panel_value = str(panel_value).strip().lower()
                initial_status = panel_row.get("initial_status", "")
                
                # Look for match in recategorization data
                if panel_value in recategorization_lookup:
                    final_status = recategorization_lookup[panel_value]
                    summary["matched"] += 1
                    logging.debug(f"Row {row_idx}: Matched '{panel_value}' -> '{final_status}'")
                else:
                    # No match found, use initial_status
                    final_status = initial_status if initial_status else "not_found"
                    summary["not_found"] += 1
                    logging.debug(f"Row {row_idx}: No match for '{panel_value}', using initial_status '{final_status}'")
                
                # Prepare update
                updates.append({
                    panel_field: str(panel_row.get(panel_field, "")).strip().lower(),
                    "final_status": final_status
                })
                
            except Exception as e:
                logging.error(f"Error processing row {row_idx}: {e}")
                summary["errors"] += 1
                continue
        
        # Add final_status column if it doesn't exist
        from db.mysql_utils import add_column_if_not_exists, update_final_status_bulk
        add_column_if_not_exists(panel_name, "final_status", "VARCHAR(255)")
        
        # Update database
        success, error_msg = update_final_status_bulk(panel_name, updates, match_field=panel_field)
        if not success:
            raise HTTPException(status_code=500, detail=f"Database update failed: {error_msg}")
        
        logging.info(f"User recategorization completed for panel '{panel_name}'. Summary: {summary}")
        
        return {
            "message": "User recategorization complete",
            "summary": summary,
            "panel_name": panel_name,
            "total_processed": len(panel_rows),
            "successful_updates": len(updates),
            "match_column": match_column,
            "type_column": type_column,
            "panel_field": panel_field
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected error in recategorize_users: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 

