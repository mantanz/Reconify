import os
from dotenv import load_dotenv

load_dotenv()

# Google OAuth2 Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

# CORS Configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

# File paths
SOT_UPLOADS_PATH = "data/sot_uploads.json"
SOT_CONFIG_PATH = "data/sot_config.json"
PANEL_CONFIG_PATH = "data/panel_config.json"
RECON_HISTORY_PATH = "data/panel_history.json"
CONFIG_DB_PATH = "data/config_db.json"
HR_DATA_SAMPLE_PATH = os.path.join("data", "samples", "HR_data_sample.csv")
RECON_SUMMARY_PATH = "data/reconciliation_summary.json"

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = "logs/reconify.log"

# Session Configuration
SESSION_SECRET_KEY = "your-secret-key-here"

# File Server Configuration (Local, SSH/SFTP and S3)
FILE_SERVER_CONFIG = {
    "type": os.getenv("FILE_SERVER_TYPE", "local").lower(),  # "local", "ssh" or "s3"
    "local": {
        "base_path": os.getenv("FILE_SERVER_BASE_PATH", "/tmp/reconify_uploads")
    },
    "ssh": {
        "host": os.getenv("FILE_SERVER_HOST"),
        "port": int(os.getenv("FILE_SERVER_PORT", "22")),
        "username": os.getenv("FILE_SERVER_USERNAME"),
        "password": os.getenv("FILE_SERVER_PASSWORD"),
        "ssh_key": os.getenv("FILE_SERVER_SSH_KEY"),
        "base_path": os.getenv("FILE_SERVER_BASE_PATH", "/data/uploads"),
        "timeout": int(os.getenv("FILE_SERVER_TIMEOUT", "30"))
    },
    "s3": {
        "access_key": os.getenv("AWS_ACCESS_KEY_ID"),
        "secret_key": os.getenv("AWS_SECRET_ACCESS_KEY"),
        "region": os.getenv("AWS_REGION", "us-east-1"),
        "bucket": os.getenv("S3_BUCKET_NAME")
    }
}

# Cloud Storage Configuration (for future use)
CLOUD_STORAGE_CONFIG = {
    "aws_s3": {
        "access_key": os.getenv("AWS_ACCESS_KEY_ID"),
        "secret_key": os.getenv("AWS_SECRET_ACCESS_KEY"),
        "region": os.getenv("AWS_REGION", "us-east-1"),
        "bucket": os.getenv("S3_BUCKET_NAME")
    },
    "google_cloud": {
        "project_id": os.getenv("GOOGLE_CLOUD_PROJECT_ID"),
        "credentials_file": os.getenv("GOOGLE_CLOUD_CREDENTIALS_FILE"),
        "bucket": os.getenv("GOOGLE_CLOUD_BUCKET")
    }
} 