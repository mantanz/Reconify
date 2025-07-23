import React, { useState, useEffect } from "react";
import { parseISTTimestamp } from "./utils";
import { FiUpload, FiRefreshCw } from 'react-icons/fi';
import "./tables.css";

export default function SOTUpload() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [sotList, setSotList] = useState([]);
  const [sotMetadata, setSotMetadata] = useState({});
  const [uploadingSot, setUploadingSot] = useState("");
  const [sotStatus, setSotStatus] = useState({}); // Track current status for each SOT

  useEffect(() => {
    // Fetch SOT list from backend
    fetch("http://127.0.0.1:8000/sot/list")
      .then(res => res.json())
      .then(data => {
        setSotList(data.sots || []);
      });
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/sot/uploads");
      const data = await res.json();
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
          const res = await fetch(`http://127.0.0.1:8000/debug/sot/${sot}`);
          const sotData = await res.json();
          metadata[sot].rowCount = sotData.row_count || 0;
        } catch (e) {
          metadata[sot].rowCount = 0;
        }
      }
      
      setSotMetadata(metadata);
    } catch {
      setHistory([]);
      setSotMetadata({});
    }
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
      
      // Update SOT status based on upload result
      if (data.error) {
        setError(data.error);
        setSotStatus(prev => ({ ...prev, [sotType]: "failed" }));
      } else {
        setSotStatus(prev => ({ ...prev, [sotType]: "uploaded" }));
      }
      
      fetchHistory();
    } catch (err) {
      setError("Upload failed. Please try again.");
      setSotStatus(prev => ({ ...prev, [sotType]: "failed" }));
    } finally {
      setUploading(false);
      setUploadingSot("");
    }
  };

  const formatDateTime = (timestamp) => {
    return parseISTTimestamp(timestamp);
  };

  const getSotDisplayName = (sot) => {
    return sot === "hr_data" ? "HR Data" : 
           sot === "service_users" ? "Service Users" :
           sot === "internal_users" ? "Internal Users" :
           sot === "thirdparty_users" ? "Third Party Users" :
           sot.toUpperCase();
  };

  const getStatusBadge = (sot, metadata) => {
    // Check current upload status first, then fall back to metadata
    const currentStatus = sotStatus[sot];
    const status = currentStatus || (metadata.latestUpload ? metadata.latestUpload.status : null);
    
    if (!status) {
      return <span style={{ color: "#6c757d" }}>-</span>;
    }

    const isUploaded = status === "uploaded";
    const isFailed = status === "failed";

    if (isFailed) {
      return (
        <span style={{
          background: "#fecaca",
          color: "#991b1b",
          padding: "4px 12px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600"
        }}>
          failed
        </span>
      );
    }

    if (isUploaded) {
      return (
        <span style={{
          background: "#bbf7d0",
          color: "#166534",
          padding: "4px 12px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600"
        }}>
          uploaded
        </span>
      );
    }

    return <span style={{ color: "#6c757d" }}>-</span>;
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
      
      {/* Error Messages */}
      {error && <div style={{ marginBottom: 16, color: "#e74c3c", fontWeight: 500, background: "#fdf2f2", padding: 12, borderRadius: 6 }}>{error}</div>}

      {/* SOT Table */}
      <div className="table-container">
        <table className="data-table">
          <thead className="table-header">
            <tr>
              <th style={{ textAlign: "left" }}>SOT</th>
              <th style={{ textAlign: "center" }}>#Rows</th>
              <th style={{ textAlign: "center" }}>Last Refreshed DateTime</th>
              <th style={{ textAlign: "center" }}>Uploaded By</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "center" }}>Upload</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {sotList.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-cell-center" style={{ color: "#adb5bd" }}>
                  No SOTs configured. Please configure SOT mappings in panel settings first.
                </td>
              </tr>
            ) : (
              sotList.map((sot, idx) => {
                const metadata = sotMetadata[sot] || {};
                const isUploading = uploadingSot === sot;
                
                return (
                  <SOTRow 
                    key={sot}
                    sot={sot}
                    metadata={metadata}
                    isUploading={isUploading}
                    uploading={uploading}
                    onUpload={handleUpload}
                    getSotDisplayName={getSotDisplayName}
                    formatDateTime={formatDateTime}
                    getStatusBadge={getStatusBadge}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>


    </div>
  );
}

// Separate component for SOT row with integrated file upload
function SOTRow({ sot, metadata, isUploading, uploading, onUpload, getSotDisplayName, formatDateTime, getStatusBadge }) {
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
    <tr className="table-row">
      <td className="table-cell-medium" style={{ verticalAlign: "middle" }}>
        {getSotDisplayName(sot)}
      </td>
      <td className="table-cell-center" style={{ verticalAlign: "middle" }}>
        {metadata.rowCount || 0}
      </td>
      <td className="table-cell-center" style={{ verticalAlign: "middle" }}>
        {formatDateTime(metadata.lastRefreshed)}
      </td>
      <td className="table-cell-center" style={{ verticalAlign: "middle" }}>
        {metadata.uploadedBy || "-"}
      </td>
      <td className="table-cell-center" style={{ verticalAlign: "middle" }}>
        {getStatusBadge(sot, metadata)}
      </td>
      <td className="table-cell-center" style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        height: "100%"
      }}>
        <button
          onClick={handleUploadClick}
          disabled={isUploading}
          className="action-button"
          style={{
            background: isUploading ? "#adb5bd" : "#00BAF2",
            cursor: isUploading ? "not-allowed" : "pointer",
            fontSize: 16,
            width: "40px",
            height: "40px",
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
            borderRadius: "6px",
            border: "none"
          }}
          title={isUploading ? "Uploading..." : "Upload File"}
        >
          {isUploading ? (
            <FiRefreshCw 
              style={{ 
                animation: "spin 1s linear infinite",
                fontSize: "18px"
              }} 
            />
          ) : (
            <FiUpload style={{ fontSize: "18px" }} />
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