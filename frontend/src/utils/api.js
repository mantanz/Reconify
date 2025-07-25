export const API_BASE = "http://localhost:8000";

// Helper function to get authentication token
function getAuthToken() {
  return localStorage.getItem('access_token');
}

// Helper function to create headers with authentication
function createAuthHeaders(contentType = null) {
  const headers = {};
  const token = getAuthToken();
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  return headers;
}

export async function uploadPanelFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/panels/upload_file`, {
    method: "POST",
    headers: createAuthHeaders(),
    body: formData,
  });
  return res.json();
}

export async function getHRFields() {
  const res = await fetch(`${API_BASE}/hr_data/fields`, {
    headers: createAuthHeaders(),
  });
  return res.json();
}

export async function savePanelConfig(data) {
  const res = await fetch(`${API_BASE}/panels/save`, {
    method: "POST",
    headers: createAuthHeaders("application/json"),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getPanels() {
  const res = await fetch(`${API_BASE}/panels`, {
    headers: createAuthHeaders(),
  });
  return res.json();
}

export async function modifyPanelConfig(data) {
  const res = await fetch(`${API_BASE}/panels/modify`, {
    method: "PUT",
    headers: createAuthHeaders("application/json"),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deletePanelByName(name) {
  const res = await fetch(`${API_BASE}/panels/delete`, {
    method: "DELETE",
    headers: createAuthHeaders("application/json"),
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function getPanelHeaders(panelName) {
  const res = await fetch(`${API_BASE}/panels/${encodeURIComponent(panelName)}/headers`, {
    headers: createAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch panel headers: ${res.statusText}`);
  }
  return res.json();
}

export async function getSOTFields(sotType) {
  const res = await fetch(`${API_BASE}/sot/fields/${sotType}`, {
    headers: createAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch SOT fields: ${res.statusText}`);
  }
  return res.json();
}

export async function getSOTList() {
  const res = await fetch(`${API_BASE}/sot/list`, {
    headers: createAuthHeaders(),
  });
  return res.json();
}

// Fetch panel config by name
export async function getPanelConfig(panelName) {
  const res = await fetch(`${API_BASE}/panels`, {
    headers: createAuthHeaders(),
  });
  const panels = await res.json();
  return panels.find(p => p.name === panelName);
}

// Trigger user categorization
export async function categorizeUsers(panelName) {
  const formData = new FormData();
  formData.append("panel_name", panelName);
  const res = await fetch(`${API_BASE}/categorize_users`, {
    method: "POST",
    headers: createAuthHeaders(),
    body: formData,
  });
  return res.json();
}

// Trigger reconciliation with HR data (only for internal users)
export async function reconcilePanelWithHR(panelName) {
  const formData = new FormData();
  formData.append("panel_name", panelName);
  const res = await fetch(`${API_BASE}/recon/process`, {
    method: "POST",
    headers: createAuthHeaders(),
    body: formData,
  });
  return res.json();
}

// Fetch all panel upload history
export async function getAllReconHistory() {
  const res = await fetch(`${API_BASE}/panels/upload_history`, {
    headers: createAuthHeaders(),
  });
  return res.json();
}

// Fetch all reconciliation summaries (excluding details)
export async function getReconSummaries() {
  const res = await fetch(`${API_BASE}/recon/summary`, {
    headers: createAuthHeaders(),
  });
  return res.json();
}

// Fetch panel details including configuration, data, and history
export async function getPanelDetails(panelName) {
  const res = await fetch(`${API_BASE}/panels/${encodeURIComponent(panelName)}/details`, {
    headers: createAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch panel details: ${res.statusText}`);
  }
  return res.json();
}

// Fetch reconciliation summary details by recon_id
export async function getReconSummaryDetail(reconId) {
  const res = await fetch(`${API_BASE}/recon/summary/${reconId}`, {
    headers: createAuthHeaders(),
  });
  return res.json();
}

// Recategorize users with uploaded file
export async function recategorizeUsers(panelName, file) {
  const formData = new FormData();
  formData.append("panel_name", panelName);
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/recategorize_users`, {
    method: "POST",
    headers: createAuthHeaders(),
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Failed to recategorize users: ${res.statusText}`);
  }
  return res.json();
}

// Get user-wise summary across all panels
export async function getUserWiseSummary() {
  const res = await fetch(`${API_BASE}/users/summary`, {
    headers: createAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch user summary: ${res.statusText}`);
  }
  return res.json();
}

// Upload SOT file
export async function uploadSOTFile(file, sotType) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sot_type", sotType);
  const res = await fetch(`${API_BASE}/sot/upload`, {
    method: "POST",
    headers: createAuthHeaders(),
    body: formData,
  });
  return res.json();
}

// Upload panel file
export async function uploadPanelData(panelName, file) {
  const formData = new FormData();
  formData.append("panel_name", panelName);
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/recon/upload`, {
    method: "POST",
    headers: createAuthHeaders(),
    body: formData,
  });
  return res.json();
}

// Get SOT uploads list
export async function getSOTUploads() {
  const res = await fetch(`${API_BASE}/sot/uploads`, {
    headers: createAuthHeaders(),
  });
  return res.json();
}

// Fetch all initial status summaries
export const getInitialSummaries = (statusType = "initial") => {
  return fetch(`${API_BASE}/recon/initialsummary?status_type=${statusType}`, {
    headers: createAuthHeaders(),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch initial summaries: ${response.statusText}`);
      }
      return response.json();
    });
};

// Fetch initial status summary details by recon_id
export const getInitialSummaryDetail = (reconId, statusType = "initial") => {
  return fetch(`${API_BASE}/recon/initialsummary/${reconId}?status_type=${statusType}`, {
    headers: createAuthHeaders(),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch initial summary detail: ${response.statusText}`);
      }
      return response.json();
    });
};

// Audit Trail API Functions
export async function getAuditTrail(filters = {}) {
  const queryParams = new URLSearchParams(filters);
  const res = await fetch(`${API_BASE}/audit/trail?${queryParams}`, {
    headers: createAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch audit trail: ${res.statusText}`);
  }
  return res.json();
}

export async function getAuditSummary() {
  const res = await fetch(`${API_BASE}/audit/summary`, {
    headers: createAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch audit summary: ${res.statusText}`);
  }
  return res.json();
}

export async function getAvailableActions() {
  const res = await fetch(`${API_BASE}/audit/actions`, {
    headers: createAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch available actions: ${res.statusText}`);
  }
  return res.json();
}

export async function getUserActivity(userName, limit = 50) {
  const res = await fetch(`${API_BASE}/audit/user-activity/${encodeURIComponent(userName)}?limit=${limit}`, {
    headers: createAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch user activity: ${res.statusText}`);
  }
  return res.json();
}

export async function getActionStatistics(action) {
  const res = await fetch(`${API_BASE}/audit/action-stats/${encodeURIComponent(action)}`, {
    headers: createAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch action statistics: ${res.statusText}`);
  }
  return res.json();
}

export async function cleanupAuditLogs(daysToKeep = 90) {
  const res = await fetch(`${API_BASE}/audit/cleanup?days_to_keep=${daysToKeep}`, {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to cleanup audit logs: ${res.statusText}`);
  }
  return res.json();
} 