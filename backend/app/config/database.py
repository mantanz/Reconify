# Database configuration
# This file can be extended for database connection settings
# Currently using file-based storage, but can be extended for MySQL/PostgreSQL

from .settings import DB_PATH, SOT_UPLOADS_PATH, RECON_HISTORY_PATH, RECON_SUMMARY_PATH

# Database file paths
PANEL_CONFIG_PATH = DB_PATH
SOT_UPLOADS_FILE = SOT_UPLOADS_PATH
RECON_HISTORY_FILE = RECON_HISTORY_PATH
RECON_SUMMARY_FILE = RECON_SUMMARY_PATH 