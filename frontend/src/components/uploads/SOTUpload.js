import React, { useState, useEffect } from "react";
import { API_BASE, getSOTList, getSOTUploads, uploadSOTFile } from "../../utils/api";

export default function SOTUpload() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [sotList, setSotList] = useState([]);
  const [sotMetadata, setSotMetadata] = useState({});
  const [uploadingSot, setUploadingSot] = useState("");

  useEffect(() => {
    // Fetch SOT list from backend
    getSOTList()
      .then(data => {
        setSotList(data.sots || []);
      })
      .catch(err => {
        console.error("Failed to fetch SOT list:", err);
      });
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getSOTUploads();
      setHistory(Array.isArray(data) ? data : []);
      
      // Process history to create SOT metadata
      const metadata = {};
      data.forEach(item => {
        const sot = item.sot_type || "hr_data";
        if (!metadata[sot]) {
          metadata[sot] = {
            rowCount: 0,
            lastRefreshed: null,
            uploadedBy: null,
            latestUpload: null
          };
        }
        
        // Update with latest upload info
        if (!metadata[sot].latestUpload || new Date(item.timestamp) > new Date(metadata[sot].latestUpload.timestamp)) {
          metadata[sot].latestUpload = item;
          metadata[sot].lastRefreshed = item.timestamp;
          metadata[sot].uploadedBy = item.uploaded_by;
        }
      });
      
      // Get row counts for each SOT
      for (const sot of Object.keys(metadata)) {
        try {
          const token = localStorage.getItem('access_token');
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
          const res = await fetch(`${API_BASE}/debug/sot/${sot}`, { headers });
          const sotData = await res.json();
          metadata[sot].rowCount = sotData.row_count || 0;
        } catch (e) {
          metadata[sot].rowCount = 0;
        }
      }
      
      setSotMetadata(metadata);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setHistory([]);
      setSotMetadata({});
    }
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

  const handleUpload = async (sotType, file) => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    setUploading(true);
    setUploadingSot(sotType);
    setError("");
    setResult(null);
    
    try {
      const data = await uploadSOTFile(file, sotType);
      setResult(data);
      if (data.error) {
        setError(data.error);
      } else {
        // Refresh history after successful upload
        await fetchHistory();
      }
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadingSot("");
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "-";
    
    try {
      // Check if it's already a valid date (for backward compatibility)
      const jsDate = new Date(timestamp);
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toLocaleDateString('en-GB').replace(/\//g, '-') + ', ' + jsDate.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        });
      }
      
      // Parse IST format: dd-mm-yyyy hh:mm:ss
      const parts = timestamp.split(' ');
      if (parts.length !== 2) return timestamp; // Return as-is if format is unexpected
      
      const datePart = parts[0]; // dd-mm-yyyy
      const timePart = parts[1]; // hh:mm:ss
      
      const dateParts = datePart.split('-');
      const timeParts = timePart.split(':');
      
      if (dateParts.length !== 3 || timeParts.length !== 3) return timestamp;
      
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed in JavaScript
      const year = parseInt(dateParts[2], 10);
      const hour = parseInt(timeParts[0], 10);
      const minute = parseInt(timeParts[1], 10);
      const second = parseInt(timeParts[2], 10);
      
      // Validate the parsed values
      if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute) || isNaN(second)) {
        return timestamp; // Return original if any value is invalid
      }
      
      const parsedDate = new Date(year, month, day, hour, minute, second);
      
      // Check if the parsed date is valid
      if (isNaN(parsedDate.getTime())) {
        return timestamp; // Return original if parsing results in invalid date
      }
      
      return parsedDate.toLocaleDateString('en-GB').replace(/\//g, '-') + ', ' + parsedDate.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    } catch (error) {
      console.error("Error parsing timestamp:", timestamp, error);
      return timestamp; // Return original if parsing fails
    }
  };

  const getSotDisplayName = (sot) => {
    return sot === "hr_data" ? "HR Data" : 
           sot === "service_users" ? "Service Users" :
           sot === "internal_users" ? "Internal Users" :
           sot === "thirdparty_users" ? "Third Party Users" :
           sot.toUpperCase();
  };

  return (
    <div style={{ 
      background: "#fff", 
      borderRadius: 12, 
      padding: 32, 
      boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)", 
      marginBottom: 16, 
      maxWidth: 1200, 
      margin: "40px auto",
      border: "1px solid rgba(0,0,0,0.05)"
    }}>
      <h2 style={{ textAlign: "center", color: "#343a40", marginBottom: 24 }}>Source of Truth</h2>
      
      {/* Error and Result Messages */}
      {error && <div style={{ marginBottom: 16, color: "#e74c3c", fontWeight: 500, background: "#fdf2f2", padding: 12, borderRadius: 6 }}>{error}</div>}
      {result && (
        <div style={{ marginBottom: 16, background: result.status === "failed" ? "#fdf2f2" : "#eafaf1", borderRadius: 6, padding: 16, color: result.status === "failed" ? "#991b1b" : "#145a32" }}>
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

      {/* SOT Table */}
      <div style={{ background: "#fff", borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#e9ecef" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>SOT</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>#Rows</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>Last Refreshed DateTime</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>Uploaded By</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>Upload</th>
            </tr>
          </thead>
          <tbody>
            {sotList.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "#adb5bd", padding: 24 }}>
                  No SOTs configured. Please configure SOT mappings in panel settings first.
                </td>
              </tr>
            ) : (
              sotList.map((sot, idx) => {
                const metadata = sotMetadata[sot] || {};
                const isUploading = uploadingSot === sot;
                
                return (
                  <React.Fragment key={sot}>
                    <SOTRow 
                      sot={sot}
                      metadata={metadata}
                      isUploading={isUploading}
                      uploading={uploading}
                      onUpload={handleUpload}
                      getSotDisplayName={getSotDisplayName}
                      formatDateTime={formatDateTime}
                    />
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Upload History Section (Collapsible) */}
      <div style={{ marginTop: 24 }}>
        <details style={{ background: "#fff", borderRadius: 6, padding: 16, border: "1px solid #dee2e6" }}>
          <summary style={{ fontWeight: 600, color: "#495057", cursor: "pointer", fontSize: 16 }}>
            📋 Upload History
          </summary>
          <div style={{ marginTop: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 6 }}>
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
                      <td style={{ padding: "8px 12px", fontSize: 14 }}>{formatDateTime(item.timestamp)}</td>
                      <td style={{ padding: "8px 12px", fontSize: 14, color: getStatusColor(item.status), fontWeight: 600 }}>{item.status}</td>
                      <td style={{ padding: "8px 12px", fontSize: 14, color: "#e74c3c" }}>{item.error || "-"}</td>
                      <td style={{ padding: "8px 12px", fontSize: 14 }}>{getSotDisplayName(item.sot_type || "hr_data")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}

// Separate component for SOT row with integrated file upload
function SOTRow({ sot, metadata, isUploading, uploading, onUpload, getSotDisplayName, formatDateTime }) {
  const fileInputRef = React.useRef(null);

  const handleUploadClick = () => {
    if (!uploading) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      onUpload(sot, selectedFile);
      // Reset the file input
      e.target.value = '';
    }
  };

  return (
    <tr style={{ borderBottom: "1px solid #f1f3f5" }}>
      <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>
        {getSotDisplayName(sot)}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 14 }}>
        {metadata.rowCount || 0}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 14 }}>
        {formatDateTime(metadata.lastRefreshed)}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 14 }}>
        {metadata.uploadedBy || "-"}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 14 }}>
        <button
          onClick={handleUploadClick}
          disabled={uploading}
          style={{
            padding: "8px 12px",
            background: uploading ? "#adb5bd" : "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontSize: 12,
            cursor: uploading ? "not-allowed" : "pointer",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            minWidth: "80px",
            justifyContent: "center"
          }}
        >
          {isUploading ? (
            <>
              <span>🔄</span>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <span>⬆️</span>
              <span>Upload</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, .xls, .xlsb"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </td>
    </tr>
  );
} 