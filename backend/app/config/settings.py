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

# File Paths
DB_PATH = "data/config_db.json"
HR_DATA_SAMPLE_PATH = os.path.join("data", "samples", "HR_data_sample.csv")
SOT_UPLOADS_PATH = "data/sot_uploads.json"
RECON_HISTORY_PATH = "data/panel_history.json"
RECON_SUMMARY_PATH = "data/reconciliation_summary.json"

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = "logs/reconify.log" 