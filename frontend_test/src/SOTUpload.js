import React, { useState, useEffect } from "react";

export default function SOTUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [sotType, setSotType] = useState("");
  const [sotList, setSotList] = useState([]);

  useEffect(() => {
    // Fetch SOT list from backend
    fetch("http://127.0.0.1:8000/sot/list")
      .then(res => res.json())
      .then(data => {
        setSotList(data.sots || []);
        if ((data.sots || []).length > 0) setSotType(data.sots[0]);
      });
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/sot/uploads");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data.reverse() : []);
    } catch {
      setHistory([]);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError("");
  };

  const handleSotTypeChange = (e) => {
    setSotType(e.target.value);
    setFile(null);
    setResult(null);
    setError("");
  };

  const getStatusColor = (status) => {
    if (!status) return "#6c757d"; // Default gray
    
    const statusLower = status.toLowerCase();
    
    // Success statuses
    if (statusLower === "complete" || statusLower === "uploaded") return "#27ae60"; // Green
    
    // Failed statuses
    if (statusLower === "failed") return "#e74c3c"; // Red
    
    return "#6c757d"; // Default gray
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    setUploading(true);
    setError("");
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sot_type", sotType);
    try {
      const res = await fetch("http://127.0.0.1:8000/sot/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
      if (data.error) setError(data.error);
      fetchHistory();
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ background: "#f4f6fb", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16, maxWidth: 700, margin: "40px auto" }}>
      <h2 style={{ textAlign: "center", color: "#343a40", marginBottom: 24 }}>Source of Truth Upload</h2>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 600, color: "#495057" }}>Select SOT:</label>
        <select
          value={sotType}
          onChange={handleSotTypeChange}
          style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #ced4da", borderRadius: 4, marginTop: 6, fontSize: 15 }}
        >
          {sotList.map(sot => (
            <option key={sot} value={sot}>
              {sot === "hr_data" ? "HR Data" : 
               sot === "service_users" ? "Service Users" :
               sot === "internal_users" ? "Internal Users" :
               sot === "thirdparty_users" ? "Third Party Users" :
               sot.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 600, color: "#495057" }}>
          Upload {sotType === "hr_data" ? "HR Data" : 
                  sotType === "service_users" ? "Service Users" :
                  sotType === "internal_users" ? "Internal Users" :
                  sotType === "thirdparty_users" ? "Third Party Users" :
                  sotType.toUpperCase()} (CSV or Excel):
        </label>
        <input
          type="file"
          accept=".csv, .xlsx, .xls"
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
        disabled={uploading || !file}
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
      {result && (
        <div style={{ marginTop: 18, background: result.status === "failed" ? "#fdf2f2" : "#eafaf1", borderRadius: 6, padding: 16, color: result.status === "failed" ? "#991b1b" : "#145a32" }}>
          <div><strong>{result.status === "failed" ? "Upload Failed!" : "File Uploaded!"}</strong></div>
          <div><strong>Doc ID:</strong> {result.doc_id}</div>
          <div><strong>File Name:</strong> {result.doc_name}</div>
          <div><strong>Uploaded By:</strong> {result.uploaded_by}</div>
          <div><strong>Timestamp:</strong> {result.timestamp}</div>
          <div><strong>Status:</strong> {result.status}</div>
          <div><strong>SOT Type:</strong> {result.sot_type}</div>
          {result.error && <div><strong>Error:</strong> {result.error}</div>}
        </div>
      )}
      <h3 style={{ marginTop: 36, color: "#343a40", fontWeight: 700, fontSize: 20 }}>Upload History</h3>
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <thead>
            <tr style={{ background: "#e9ecef" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Doc ID</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>File Name</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Uploaded By</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Timestamp</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Error</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>SOT Type</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#adb5bd", padding: 16 }}>No uploads yet.</td></tr>
            ) : (
              history.map((item, idx) => (
                <tr key={item.doc_id || idx} style={{ borderBottom: "1px solid #f1f3f5" }}>
                  <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.doc_id}</td>
                  <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.doc_name}</td>
                  <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.uploaded_by}</td>
                  <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.timestamp}</td>
                  <td style={{ padding: "8px 12px", fontSize: 14, color: getStatusColor(item.status), fontWeight: 600 }}>{item.status}</td>
                  <td style={{ padding: "8px 12px", fontSize: 14, color: "#e74c3c" }}>{item.error || "-"}</td>
                  <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.sot_type || "hr_data"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 