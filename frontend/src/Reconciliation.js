import React, { useState, useEffect } from "react";
import { getPanels } from "./api";

export default function Reconciliation() {
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getPanels().then(setPanels);
    fetchAllHistory();
  }, []);

  const fetchAllHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/recon/history");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data.reverse() : []);
    } catch {
      setHistory([]);
    }
  };

  const handlePanelChange = (e) => {
    setSelectedPanel(e.target.value);
    setResult(null);
    setError("");
    setFile(null);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError("");
  };

  const handleUpload = async () => {
    if (!selectedPanel) {
      setError("Please select a panel.");
      return;
    }
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    setUploading(true);
    setError("");
    setResult(null);
    const formData = new FormData();
    formData.append("panel_name", selectedPanel);
    formData.append("file", file);
    try {
      const res = await fetch("http://127.0.0.1:8000/recon/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
      if (data.error) setError(data.error);
      fetchAllHistory();
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ background: "#f4f6fb", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16, maxWidth: 700, margin: "40px auto" }}>
      <h2 style={{ textAlign: "center", color: "#343a40", marginBottom: 24 }}>Reconciliation Upload</h2>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 600, color: "#495057" }}>Select Panel:</label>
        <select
          value={selectedPanel}
          onChange={handlePanelChange}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1.5px solid #ced4da",
            borderRadius: 4,
            marginTop: 6,
            fontSize: 15,
            background: "#fff"
          }}
        >
          <option value="">Select panel</option>
          {panels.map(p => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 600, color: "#495057" }}>Upload File (CSV):</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{
            width: "100%",
            padding: "8px 0",
            marginTop: 6,
            fontSize: 15,
            background: "#fff"
          }}
        />
      </div>
      <button
        onClick={handleUpload}
        disabled={uploading || !selectedPanel || !file}
        style={{
          width: "100%",
          background: uploading ? "#adb5bd" : "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "10px 0",
          fontWeight: 600,
          fontSize: 16,
          cursor: uploading ? "not-allowed" : "pointer",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          transition: "background 0.2s"
        }}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {error && <div style={{ marginTop: 14, color: "#e74c3c", fontWeight: 500 }}>{error}</div>}
      {result && !result.error && (
        <div style={{ marginTop: 18, background: "#eafaf1", borderRadius: 6, padding: 16, color: "#145a32" }}>
          <div><strong>File Uploaded!</strong></div>
          <div><strong>Panel Name:</strong> {result.panelname}</div>
          <div><strong>Doc ID:</strong> {result.docid}</div>
          <div><strong>File Name:</strong> {result.docname}</div>
          <div><strong>Timestamp:</strong> {result.timestamp}</div>
          <div><strong>Total Records:</strong> {result.total_records}</div>
          <div><strong>Uploaded By:</strong> {result.uploadedby}</div>
          <div><strong>Status:</strong> {result.status}</div>
        </div>
      )}
      <h3 style={{ marginTop: 36, color: "#343a40", fontWeight: 700, fontSize: 20 }}>Panel Upload History</h3>
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <thead>
            <tr style={{ background: "#e9ecef" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Doc ID</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>File Name</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Panel Name</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Timestamp</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Total Records</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Uploaded By</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#adb5bd", padding: 16 }}>No uploads yet.</td></tr>
            ) : (
              history.map((item, idx) => (
                <tr key={item.docid || idx} style={{ borderBottom: "1px solid #f1f3f5" }}>
                  <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.docid}</td>
                  <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.docname}</td>
                  <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.panelname}</td>
                  <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.timestamp}</td>
                  <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.total_records}</td>
                  <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.uploadedby}</td>
                  <td style={{ padding: "8px 12px", fontSize: 14, color: item.status.startsWith("error") ? "#e74c3c" : "#27ae60", fontWeight: 600 }}>{item.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 