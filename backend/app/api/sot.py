import os
import json
import uuid
import logging
import csv
import pandas as pd
import paramiko
from dotenv import load_dotenv
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from ..utils.database import load_db, save_db
from ..utils.datetime import get_ist_timestamp
from ..config.paths import SOT_UPLOADS_PATH
from ..auth.user_upload import get_current_user
from ..utils.audit_logger import log_sot_upload
from db.mysql_utils import insert_sot_data_rows, get_sot_headers_from_db

# Load environment variables from .env file
load_dotenv()

router = APIRouter(prefix="/sot", tags=["source_of_truth"])


# Server configuration from environment variables
SERVER_HOST = os.getenv("SERVER_HOST")
SERVER_USERNAME = os.getenv("SERVER_USERNAME")
SERVER_PASSWORD = os.getenv("SERVER_PASSWORD")
SERVER_UPLOAD_PATH = os.getenv("SERVER_UPLOAD_PATH")

# Validate that all required environment variables are loaded
if not all([SERVER_HOST, SERVER_USERNAME, SERVER_PASSWORD, SERVER_UPLOAD_PATH]):
    missing_vars = []
    if not SERVER_HOST:
        missing_vars.append("SERVER_HOST")
    if not SERVER_USERNAME:
        missing_vars.append("SERVER_USERNAME")
    if not SERVER_PASSWORD:
        missing_vars.append("SERVER_PASSWORD")
    if not SERVER_UPLOAD_PATH:
        missing_vars.append("SERVER_UPLOAD_PATH")
    
    logging.error(f"Missing required environment variables: {', '.join(missing_vars)}")
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

logging.info("Server configuration loaded from environment variables successfully")

def create_sot_directories(sftp, sot_type: str):
    """Create the 3-stage directory structure for SOT"""
    base_path = f"{SERVER_UPLOAD_PATH}/{sot_type}"
    stages = ["uploaded", "processing", "processed"]
    
    for stage in stages:
        stage_path = f"{base_path}/{stage}"
        try:
            sftp.mkdir(stage_path)
            logging.info(f"Created directory: {stage_path}")
        except Exception:
            logging.info(f"Directory already exists: {stage_path}")
            pass

def move_file_between_stages(sftp, sot_type: str, filename: str, from_stage: str, to_stage: str):
    """Move file from one stage to another"""
    from_path = f"{SERVER_UPLOAD_PATH}/{sot_type}/{from_stage}/{filename}"
    to_path = f"{SERVER_UPLOAD_PATH}/{sot_type}/{to_stage}/{filename}"
    
    try:
        # Move file using SFTP rename
        sftp.rename(from_path, to_path)
        logging.info(f"Moved file from {from_stage} to {to_stage}: {filename}")
        return to_path
    except Exception as e:
        logging.error(f"Failed to move file from {from_stage} to {to_stage}: {e}")
        raise e

def upload_file_to_server_with_stages(file_content: bytes, filename: str, sot_type: str):
    """Upload file to server with 3-stage process"""
    try:
        logging.info(f"Starting 3-stage upload process for {filename} to {sot_type}")
        
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Connect to server
        ssh.connect(SERVER_HOST, username=SERVER_USERNAME, password=SERVER_PASSWORD, timeout=30)
        sftp = ssh.open_sftp()
        
        # Step 1: Create directory structure
        create_sot_directories(sftp, sot_type)
        
        # Step 2: Upload to "uploaded" stage
        uploaded_path = f"{SERVER_UPLOAD_PATH}/{sot_type}/uploaded/{filename}"
        logging.info(f"Uploading file to uploaded stage: {uploaded_path}")
        
        with sftp.file(uploaded_path, 'wb') as remote_file:
            remote_file.write(file_content)
        
        logging.info(f"File successfully uploaded to uploaded stage")
        
        # Step 3: Move to "processing" stage
        processing_path = move_file_between_stages(sftp, sot_type, filename, "uploaded", "processing")
        
        sftp.close()
        ssh.close()
        
        return processing_path
        
    except Exception as e:
        logging.error(f"Failed to upload file with stages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file to server: {str(e)}")

def process_file_and_move_to_processed(file_path: str, sot_type: str):
    """Process file and move to processed stage after successful DB insertion"""
    try:
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(SERVER_HOST, username=SERVER_USERNAME, password=SERVER_PASSWORD)
        sftp = ssh.open_sftp()
        
        # Read file from processing stage
        with sftp.file(file_path, 'rb') as remote_file:
            contents = remote_file.read()
        
        # Process the file content (existing logic)
        filename = os.path.basename(file_path)
        
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
        
        # Insert into database
        db_status, db_error = insert_sot_data_rows(sot_type, rows)
        
        if db_status:
            # Move file to processed stage
            processed_path = move_file_between_stages(sftp, sot_type, filename, "processing", "processed")
            logging.info(f"File successfully processed and moved to processed stage: {processed_path}")
        else:
            # If DB insertion failed, move back to uploaded stage for retry
            move_file_between_stages(sftp, sot_type, filename, "processing", "uploaded")
            logging.error(f"DB insertion failed, moved file back to uploaded stage: {db_error}")
            raise Exception(f"Database insertion failed: {db_error}")
        
        sftp.close()
        ssh.close()
        
        return rows, processed_path
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@router.post("/upload")
def upload_sot(
    request: Request,
    file: UploadFile = File(...), 
    sot_type: str = Form("hr_data")
):
    # Generate doc_id and metadata
    doc_id = str(uuid.uuid4())
    doc_name = file.filename
    uploaded_by = get_current_user(request)
    timestamp = get_ist_timestamp()
    status = "uploaded"
    filename = file.filename.lower()
    contents = file.file.read()
    
    remote_file_path = None
    error_message = None
    
    try:
        # Step 1: Try to upload file to server
        try:
            remote_file_path = upload_file_to_server_with_stages(contents, file.filename, sot_type)
            logging.info(f"File uploaded to remote server: {remote_file_path}")
        except Exception as upload_error:
            logging.error(f"Remote upload failed: {upload_error}")
            # Create fallback local directory and save file there
            local_upload_dir = f"uploads/{sot_type}"
            os.makedirs(local_upload_dir, exist_ok=True)
            local_file_path = f"{local_upload_dir}/{file.filename}"
            
            with open(local_file_path, 'wb') as f:
                f.write(contents)
            
            remote_file_path = f"LOCAL_FALLBACK:{local_file_path}"
            error_message = f"Remote upload failed, saved locally: {str(upload_error)}"
            logging.info(f"File saved locally as fallback: {local_file_path}")
        
        # Step 2: Process file (either from server or local fallback)
        processed_file_path = None
        if remote_file_path.startswith("LOCAL_FALLBACK:"):
            # Process local file (existing logic)
            local_path = remote_file_path.replace("LOCAL_FALLBACK:", "")
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
            
            # Insert into database for local fallback
            db_status, db_error = insert_sot_data_rows(sot_type, rows)
            status = "uploaded" if db_status else "failed"
            if not db_status:
                error_message = db_error
        else:
            # Process file from server with 3-stage process
            rows, processed_file_path = process_file_and_move_to_processed(remote_file_path, sot_type)
            status = "processed"
        
    except Exception as e:
        error_message = f"Error processing file: {str(e)}"
        status = "failed"
        logging.error(f"Upload processing failed: {error_message}")
    
    # Log audit event with proper status (success/failed)
    audit_status = "success" if status in ["uploaded", "processed"] else "failed"
    audit_details = {
        "file_size": len(contents),
        "records_processed": len(rows) if 'rows' in locals() else 0,
        "remote_file_path": remote_file_path,
        "processed_file_path": processed_file_path,
        "error": error_message
    }
    log_sot_upload(request, doc_name, sot_type, audit_status, audit_details)
    
    # Store metadata in JSON
    meta = {
        "doc_id": doc_id, 
        "doc_name": doc_name, 
        "uploaded_by": uploaded_by, 
        "timestamp": timestamp, 
        "status": status, 
        "sot_type": sot_type, 
        "remote_file_path": remote_file_path,
        "processed_file_path": processed_file_path
    }
    
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
        logging.error(f"Error saving metadata: {e}")
    
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
    headers = get_sot_headers_from_db(sot_type)
    if not headers:
        # Return empty fields instead of 404 error for SOTs that don't exist yet
        return {"fields": []}
    return {"fields": headers} 

@router.get("/test-connection")
def test_server_connection():
    """Test connectivity to the remote server"""
    try:
        logging.info(f"Testing connection to server {SERVER_HOST}")
        
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Test connection
        ssh.connect(SERVER_HOST, username=SERVER_USERNAME, password=SERVER_PASSWORD, timeout=30)
        logging.info("SSH connection test successful")
        
        # Test SFTP
        sftp = ssh.open_sftp()
        logging.info("SFTP connection test successful")
        
        # Test directory access
        try:
            sftp.listdir(SERVER_UPLOAD_PATH)
            logging.info(f"Directory access test successful for {SERVER_UPLOAD_PATH}")
            directory_accessible = True
        except Exception as dir_error:
            logging.warning(f"Directory access test failed: {dir_error}")
            directory_accessible = False
        
        # Close connections
        sftp.close()
        ssh.close()
        
        return {
            "status": "success",
            "message": "Server connection test successful",
            "server_host": SERVER_HOST,
            "server_username": SERVER_USERNAME,
            "upload_path": SERVER_UPLOAD_PATH,
            "directory_accessible": directory_accessible
        }
        
    except Exception as e:
        logging.error(f"Server connection test failed: {str(e)}")
        return {
            "status": "failed",
            "message": f"Server connection test failed: {str(e)}",
            "server_host": SERVER_HOST,
            "server_username": SERVER_USERNAME,
            "upload_path": SERVER_UPLOAD_PATH,
            "error": str(e)
        } 

@router.get("/stages/{sot_type}")
def list_files_by_stage(sot_type: str):
    """List files in different stages (uploaded, processing, processed) for a specific SOT type"""
    try:
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(SERVER_HOST, username=SERVER_USERNAME, password=SERVER_PASSWORD, timeout=30)
        sftp = ssh.open_sftp()
        
        stages = ["uploaded", "processing", "processed"]
        stage_files = {}
        
        for stage in stages:
            stage_path = f"{SERVER_UPLOAD_PATH}/{sot_type}/{stage}"
            try:
                files = sftp.listdir(stage_path)
                stage_files[stage] = files
            except Exception as e:
                logging.warning(f"Could not list files in {stage_path}: {e}")
                stage_files[stage] = []
        
        sftp.close()
        ssh.close()
        
        return {
            "sot_type": sot_type,
            "stages": stage_files,
            "total_files": sum(len(files) for files in stage_files.values())
        }
        
    except Exception as e:
        logging.error(f"Failed to list files by stage: {str(e)}")
        return {
            "error": f"Failed to list files by stage: {str(e)}",
            "sot_type": sot_type,
            "stages": {}
        } 