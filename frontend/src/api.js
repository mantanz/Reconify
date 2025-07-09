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
  return res.json();
}

export async function getSOTFields(sotType) {
  const res = await fetch(`${API_BASE}/sot/fields/${sotType}`);
  return res.json();
} 