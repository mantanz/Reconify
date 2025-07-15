import React, { useState, useEffect } from "react";
import { getPanels, getAllReconHistory, getPanelConfig, reconcilePanelWithSOT, getReconSummaries, getReconSummaryDetail } from "./api";

export default function Reconciliation() {
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [reconResults, setReconResults] = useState({});
  const [loading, setLoading] = useState({});
  const [summaries, setSummaries] = useState([]);
  const [details, setDetails] = useState({});
  const [showDetails, setShowDetails] = useState({});

  useEffect(() => {
    getPanels().then(setPanels);
    getAllReconHistory().then(setHistory);
    getReconSummaries().then(setSummaries);
  }, []);

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
      getAllReconHistory().then(setHistory);
      getReconSummaries().then(setSummaries);
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleReconcile = async (upload) => {
    setLoading(l => ({ ...l, [upload.docid || upload.doc_id]: true }));
    const panelConfig = await getPanelConfig(upload.panelname);
    if (!panelConfig || !panelConfig.key_mapping) {
      alert("No key mapping found for this panel.");
      setLoading(l => ({ ...l, [upload.docid || upload.doc_id]: false }));
      return;
    }
    const mappings = panelConfig.key_mapping;
    const results = {};
    for (const sotType of Object.keys(mappings)) {
      const result = await reconcilePanelWithSOT(upload.panelname, sotType);
      results[sotType] = result;
    }
    setReconResults(r => ({ ...r, [upload.docid || upload.doc_id]: results }));
    setLoading(l => ({ ...l, [upload.docid || upload.doc_id]: false }));
    getReconSummaries().then(setSummaries);
  };

  const handleViewDetails = async (recon_id) => {
    if (!details[recon_id]) {
      const detail = await getReconSummaryDetail(recon_id);
      setDetails(d => ({ ...d, [recon_id]: detail }));
    }
    setShowDetails(s => ({ ...s, [recon_id]: !s[recon_id] }));
  };

  return (
    <div style={{ background: "#f4f6fb", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16, maxWidth: 1200, margin: "40px auto" }}>
      <div style={{ marginBottom: 36 }}>
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
          <label style={{ fontWeight: 600, color: "#495057" }}>Upload File (CSV or Excel):</label>
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
      </div>
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
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Reconcile</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "#adb5bd", padding: 16 }}>No uploads yet.</td></tr>
            ) : (
              history.map((item, idx) => (
                <React.Fragment key={item.docid || idx}>
                  <tr style={{ borderBottom: "1px solid #f1f3f5" }}>
                    <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.docid}</td>
                    <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.docname}</td>
                    <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.panelname}</td>
                    <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.timestamp}</td>
                    <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.total_records}</td>
                    <td style={{ padding: "8px 12px", fontSize: 14 }}>{item.uploadedby}</td>
                    <td style={{ padding: "8px 12px", fontSize: 14, color: item.status && item.status.startsWith("error") ? "#e74c3c" : "#27ae60", fontWeight: 600 }}>{item.status}</td>
                    <td style={{ padding: "8px 12px", fontSize: 14 }}>
                      <button
                        onClick={() => handleReconcile(item)}
                        disabled={loading[item.docid || item.doc_id]}
                      >
                        {loading[item.docid || item.doc_id] ? "Reconciling..." : "Reconcile"}
                      </button>
                    </td>
                  </tr>
                  {reconResults[item.docid || item.doc_id] && (
                    <tr>
                      <td colSpan={8}>
                        {Object.entries(reconResults[item.docid || item.doc_id]).map(([sotType, result]) => (
                          <div key={sotType} style={{ marginBottom: 16 }}>
                            <h4>Reconciliation with SOT: {sotType}</h4>
                            <pre style={{ background: "#f4f4f4", padding: 8 }}>
                              {JSON.stringify(result.summary, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      <h2 style={{ textAlign: "center", color: "#343a40", marginBottom: 24, marginTop: 48 }}>Overall Reconciliation Status Summary (Report 1):</h2>
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <thead>
            <tr style={{ background: "#e9ecef" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Panel Name</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Reconciliation ID</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Reconciliation Month</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Panel Data Upload Date</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Panel Data Uploaded By</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Reconciliation Start Date</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Reconciliation Performed By</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Failure Reason</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", color: "#adb5bd", padding: 16 }}>No reconciliations yet.</td></tr>
            ) : (
              summaries.map(row => (
                <React.Fragment key={row.recon_id}>
                  <tr>
                    <td>{row.panelname}</td>
                    <td>{row.recon_id}</td>
                    <td>{row.recon_month}</td>
                    <td style={{ color: row.status === "complete" ? "#27ae60" : "#e74c3c", fontWeight: 600 }}>{row.status}</td>
                    <td>{row.upload_date ? new Date(row.upload_date).toLocaleDateString() : "-"}</td>
                    <td>{row.uploaded_by || "-"}</td>
                    <td>{row.start_date || "-"}</td>
                    <td>{row.performed_by || "-"}</td>
                    <td>
                      {row.error ? (
                        <span style={{ color: "#e74c3c" }}>{row.error}</span>
                      ) : (
                        <button onClick={() => handleViewDetails(row.recon_id)}>
                          {showDetails[row.recon_id] ? "Hide Details" : "View Details"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {showDetails[row.recon_id] && (
                    <tr>
                      <td colSpan={9}>
                        <pre style={{ background: "#f4f4f4", padding: 8 }}>
                          {details[row.recon_id] ? JSON.stringify(details[row.recon_id].details.summary, null, 2) : "Loading..."}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 