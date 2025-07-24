// API Configuration
export const API_BASE = "http://localhost:8000";

// Navigation Configuration
export const NAV_ITEMS = [
  { key: "home", label: "Home", component: null },
  { key: "config", label: "Config", component: null },
  { key: "sot_upload", label: "SOT Upload", component: null },
  { key: "user_summary", label: "Reports", component: null },
  { key: "reconciliation", label: "Reconciliation", component: null },
];

// Panel Functions
export const PANEL_FUNCTIONS = [
  { value: "add", label: "Add Panel" },
  { value: "modify", label: "Modify Panel" },
  { value: "delete", label: "Delete Panel" },
];

// File Upload Configuration
export const ALLOWED_FILE_TYPES = [".csv", ".xlsx", ".xls", ".xlsb"];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Status Colors
export const STATUS_COLORS = {
  success: "#27ae60",
  error: "#e74c3c",
  warning: "#f39c12",
  info: "#3498db",
  default: "#6c757d"
};

// UI Configuration
export const UI_CONFIG = {
  borderRadius: "8px",
  primaryColor: "#002e6e",
  secondaryColor: "#00b4d8",
  backgroundColor: "#f8f9ff",
  borderColor: "#e8ecff",
  shadow: "0 8px 32px rgba(0, 123, 255, 0.08), 0 4px 16px rgba(0, 123, 255, 0.04)"
};

// Pagination Configuration
export const PAGINATION_CONFIG = {
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50, 100]
};

// Date Formats
export const DATE_FORMATS = {
  display: "dd-mm-yyyy",
  api: "yyyy-mm-dd",
  timestamp: "dd-mm-yyyy hh:mm:ss"
}; 