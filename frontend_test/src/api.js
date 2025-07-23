const API_BASE = "http://127.0.0.1:8000";

export async function uploadPanelFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/panels/upload_file`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function getHRFields() {
  const res = await fetch(`${API_BASE}/hr_data/fields`);
  return res.json();
}

export async function savePanelConfig(data) {
  const res = await fetch(`${API_BASE}/panels/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getPanels() {
  const res = await fetch(`${API_BASE}/panels`);
  return res.json();
}

export async function modifyPanelConfig(data) {
  const res = await fetch(`${API_BASE}/panels/modify`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deletePanelByName(name) {
  const res = await fetch(`${API_BASE}/panels/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function getPanelHeaders(panelName) {
  const res = await fetch(`http://127.0.0.1:8000/panels/${encodeURIComponent(panelName)}/headers`);
  if (!res.ok) {
    throw new Error(`Failed to fetch panel headers: ${res.statusText}`);
  }
  return res.json();
}

export async function getSOTFields(sotType) {
  const res = await fetch(`${API_BASE}/sot/fields/${sotType}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch SOT fields: ${res.statusText}`);
  }
  return res.json();
}

export async function getSOTList() {
  const res = await fetch(`${API_BASE}/sot/list`);
  return res.json();
}

// Fetch panel config by name
export async function getPanelConfig(panelName) {
  const res = await fetch(`${API_BASE}/panels`);
  const panels = await res.json();
  return panels.find(p => p.name === panelName);
}

// Trigger user categorization
export async function categorizeUsers(panelName) {
  const formData = new FormData();
  formData.append("panel_name", panelName);
  const res = await fetch(`http://localhost:8000/categorize_users`, {
    method: "POST",
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
    body: formData,
  });
  return res.json();
}

// Fetch all panel upload history
export async function getAllReconHistory() {
  const res = await fetch(`${API_BASE}/panels/upload_history`);
  return res.json();
}

// Fetch all reconciliation summaries (excluding details)
export async function getReconSummaries() {
  const res = await fetch(`${API_BASE}/recon/summary`);
  return res.json();
}

// Fetch panel details including configuration, data, and history
export async function getPanelDetails(panelName) {
  const res = await fetch(`${API_BASE}/panels/${encodeURIComponent(panelName)}/details`);
  if (!res.ok) {
    throw new Error(`Failed to fetch panel details: ${res.statusText}`);
  }
  return res.json();
}

// Fetch reconciliation summary details by recon_id
export async function getReconSummaryDetail(reconId) {
  const res = await fetch(`${API_BASE}/recon/summary/${reconId}`);
  return res.json();
}

// Recategorize users with uploaded file
export async function recategorizeUsers(panelName, file) {
  const formData = new FormData();
  formData.append("panel_name", panelName);
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/recategorize_users`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Failed to recategorize users: ${res.statusText}`);
  }
  return res.json();
}

// Get user-wise summary across all panels
export async function getUserWiseSummary() {
  const res = await fetch(`${API_BASE}/users/summary`);
  if (!res.ok) {
    throw new Error(`Failed to fetch user summary: ${res.statusText}`);
  }
  return res.json();
} 