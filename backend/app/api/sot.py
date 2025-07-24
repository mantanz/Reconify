from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import json
import os
import csv
import logging
import pandas as pd
import uuid

from app.utils.datetime import get_ist_timestamp
from app.utils.database import load_db
from app.config.paths import SOT_UPLOADS_PATH
from db.mysql_utils import insert_sot_data_rows, get_panel_headers_from_db

router = APIRouter(prefix="/sot", tags=["sot"])


@router.post("/upload")
def upload_sot(file: UploadFile = File(...), sot_type: str = Form("hr_data")):
    # Generate doc_id and metadata
    doc_id = str(uuid.uuid4())
    doc_name = file.filename
    uploaded_by = "demo"
    timestamp = get_ist_timestamp()
    status = "uploaded"
    filename = file.filename.lower()
    contents = file.file.read()
    
    try:
        # Read and parse file
        if filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".xlsb"):
            import io
            try:
                df = pd.read_excel(io.BytesIO(contents))
            except ImportError as e:
                if "pyxlsb" in str(e) and filename.endswith(".xlsb"):
                    raise HTTPException(
                        status_code=400, 
                        detail="Missing optional dependency 'pyxlsb' for .xlsb files. Please install it using: pip install pyxlsb"
                    )
                else:
                    raise e
            # Convert headers to lowercase
            df.columns = [col.strip().lower() for col in df.columns]
            # Clean NaN values - replace with None for database compatibility
            df = df.replace({pd.NA: None, pd.NaT: None})
            df = df.where(pd.notnull(df), None)
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
            reader = csv.DictReader(lines)
            # Convert headers to lowercase and clean data
            reader.fieldnames = [h.strip().lower() for h in reader.fieldnames]
            rows = [dict((k.strip().lower(), v.strip() if v is not None else "") for k, v in row.items()) for row in reader]
    except Exception as e:
        return {"error": f"Error processing file: {str(e)}", "doc_id": doc_id, "doc_name": doc_name, "uploaded_by": uploaded_by, "timestamp": timestamp, "status": "failed", "sot_type": sot_type}
    
    # Insert into the correct SOT table (auto-create if needed)
    db_status, db_error = insert_sot_data_rows(sot_type, rows)
    status = "uploaded" if db_status else "failed"
    error_message = None if db_status else db_error
    
    # Store metadata in JSON
    meta = {"doc_id": doc_id, "doc_name": doc_name, "uploaded_by": uploaded_by, "timestamp": timestamp, "status": status, "sot_type": sot_type}
    
    # Add error message if there was an error
    if error_message:
        meta["error"] = error_message
    
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
        meta["status"] = "failed"
        meta["error"] = f"Failed to write metadata: {e}"
        return {"error": f"Failed to write metadata: {e}", **meta}
    
    if not db_status:
        return {"error": db_error, **meta}
    return meta


@router.get("/uploads")
def list_sot_uploads():
    if not os.path.exists(SOT_UPLOADS_PATH):
        return []
    with open(SOT_UPLOADS_PATH, "r") as f:
        return json.load(f)


@router.get("/list")
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


@router.get("/fields/{sot_type}")
def get_sot_fields(sot_type: str):
    headers = get_panel_headers_from_db(sot_type)
    if not headers:
        # Return empty fields instead of 404 error for SOTs that don't exist yet
        return {"fields": []}
    return {"fields": headers} 