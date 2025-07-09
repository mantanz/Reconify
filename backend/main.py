from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Path
from pydantic import BaseModel
from typing import List, Dict, Optional
import json
import os
import csv
from fastapi.middleware.cors import CORSMiddleware
from db.mysql_utils import create_panel_table, get_panel_headers_from_db, insert_panel_data_rows, get_panel_headers_from_db as get_hr_data_headers_from_db, insert_sot_data_rows, fetch_all_rows
import uuid
from datetime import datetime
import logging
import math
import pandas as pd
import calendar

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
            headers = next(reader)
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
            rows = list(reader)
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
            rows = list(reader)
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
    headers = get_hr_data_headers_from_db(sot_type)
    if not headers:
        raise HTTPException(status_code=404, detail=f"{sot_type} table not found or has no columns")
    return {"fields": headers}

@app.post("/recon/process")
def reconcile_panel_with_sot(panel_name: str = Form(...), sot_type: str = Form(...)):
    # Load config and get key mapping
    db = load_db()
    panel = next((p for p in db["panels"] if p["name"] == panel_name), None)
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    key_mapping = panel["key_mapping"].get(sot_type, {})
    if not key_mapping:
        raise HTTPException(status_code=400, detail="No key mapping found for this SOT and panel")
    panel_key, sot_key = list(key_mapping.items())[0]
    panel_rows = fetch_all_rows(panel_name)
    sot_rows = fetch_all_rows(sot_type)
    sot_lookup = {str(row.get(sot_key, "")).strip().lower(): row for row in sot_rows}
    details = []
    summary = {
        "panel_name": panel_name,
        "sot_type": sot_type,
        "total_panel_users": len(panel_rows),
        "matched": 0,
        "found_active": 0,
        "found_inactive": 0,
        "not_found": 0
    }
    for prow in panel_rows:
        panel_val = str(prow.get(panel_key, "")).strip().lower()
        sot_row = sot_lookup.get(panel_val)
        user_status = "Not Found"
        employment_status = None
        if sot_row:
            employment_status = sot_row.get("Employment Status") or sot_row.get("employment_status")
            if employment_status:
                if employment_status.lower() in ["active", "resigned"]:
                    user_status = "Found Active"
                    summary["found_active"] += 1
                elif employment_status.lower() == "inactive":
                    user_status = "Found Inactive"
                    summary["found_inactive"] += 1
                else:
                    user_status = f"Found ({employment_status})"
            else:
                user_status = "Found (Unknown Status)"
            summary["matched"] += 1
        else:
            summary["not_found"] += 1
        details.append({
            "panel_user": prow,
            "sot_user": sot_row,
            "user_status": user_status,
            "employment_status": employment_status
        })
    # --- New: Store reconciliation summary ---
    now = datetime.utcnow()
    recon_id = f"RCN_{uuid.uuid4().hex[:8]}"
    recon_month = now.strftime("%b'%y")  # e.g., Jul'25
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
    # If any error occurred, set status and error (for now, always complete)
    recon_record = {
        "recon_id": recon_id,
        "panelname": panel_name,
        "sot_type": sot_type,
        "recon_month": recon_month,
        "status": status,
        "upload_date": upload_date,
        "uploaded_by": uploaded_by,
        "start_date": start_date,
        "performed_by": performed_by,
        "error": error,
        "details": {"summary": summary, "details": details}
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
    return {"recon_id": recon_id, "summary": summary, "details": details}

@app.get("/recon/summary")
def get_recon_summaries():
    if not os.path.exists(RECON_SUMMARY_PATH):
        return []
    with open(RECON_SUMMARY_PATH, "r") as f:
        data = json.load(f)
    # Exclude 'details' for summary view
    summaries = [
        {k: v for k, v in rec.items() if k != "details"} for rec in data
    ]
    return summaries

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