import React, { useState, useEffect } from "react";
import { getPanels, getAllReconHistory, categorizeUsers, reconcilePanelWithHR, getReconSummaries, getReconSummaryDetail, getPanelDetails, recategorizeUsers } from "./api";

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
  const [currentStep, setCurrentStep] = useState({});
  const [summaries, setSummaries] = useState([]);
  const [details, setDetails] = useState({});
  const [showDetails, setShowDetails] = useState({});
  const [panelDetails, setPanelDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filteredRows, setFilteredRows] = useState(null);
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [showPanelDetails, setShowPanelDetails] = useState(false);
  const [recategorizationFile, setRecategorizationFile] = useState(null);
  const [recategorizationLoading, setRecategorizationLoading] = useState({});
  const [showRecategorization, setShowRecategorization] = useState({});

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
    setPanelDetails(null); // Clear previous panel details
    setCurrentPage(1); // Reset to first page
  };

  const handleViewPanelDetails = async () => {
    if (!selectedPanel) {
      alert("Please select a panel first.");
      return;
    }
    
    setLoadingDetails(true);
    try {
      const details = await getPanelDetails(selectedPanel);
      setPanelDetails(details);
    } catch (error) {
      console.error("Failed to fetch panel details:", error);
      alert("Failed to fetch panel details. Please check the console for details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError("");
  };

  const handleRecategorizationFileChange = (e) => {
    setRecategorizationFile(e.target.files[0]);
  };

  const handleShowRecategorization = (reconId) => {
    setShowRecategorization(s => ({ ...s, [reconId]: !s[reconId] }));
    setRecategorizationFile(null); // Clear any previous file
  };

  const handleUserRecategorization = async (panelName, reconId) => {
    if (!recategorizationFile) {
      alert("Please select a recategorization file first.");
      return;
    }

    setRecategorizationLoading(l => ({ ...l, [reconId]: true }));
    
    try {
      const result = await recategorizeUsers(panelName, recategorizationFile);
      alert(`Recategorization completed!\n\nSummary:\n- Total users: ${result.summary.total_panel_users}\n- Matched: ${result.summary.matched}\n- Not found: ${result.summary.not_found}\n- Errors: ${result.summary.errors}`);
      
      // Refresh the reconciliation summaries to show updated data
      getReconSummaries().then(setSummaries);
      
      // Clear the file and hide recategorization interface
      setRecategorizationFile(null);
      setShowRecategorization(s => ({ ...s, [reconId]: false }));
    } catch (error) {
      console.error("Recategorization failed:", error);
      alert(`Recategorization failed: ${error.message || "Unknown error"}`);
    } finally {
      setRecategorizationLoading(l => ({ ...l, [reconId]: false }));
    }
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
    const uploadId = upload.docid || upload.doc_id;
    setLoading(l => ({ ...l, [uploadId]: true }));
    setCurrentStep(s => ({ ...s, [uploadId]: "Starting..." }));
    
    try {
      // Step 1: Categorize users
      setCurrentStep(s => ({ ...s, [uploadId]: "Categorizing users..." }));
      console.log("Starting user categorization...");
      const categorizationResult = await categorizeUsers(upload.panelname);
      console.log("User categorization completed:", categorizationResult);
      
      // Step 2: Reconcile with HR data
      setCurrentStep(s => ({ ...s, [uploadId]: "Reconciling with HR..." }));
      console.log("Starting HR reconciliation...");
      const reconciliationResult = await reconcilePanelWithHR(upload.panelname);
      console.log("HR reconciliation completed:", reconciliationResult);
      
      // Store both results
      setReconResults(r => ({ 
        ...r, 
        [uploadId]: { 
          "categorization": categorizationResult,
          "hr_data": reconciliationResult 
        } 
      }));
      
      setCurrentStep(s => ({ ...s, [uploadId]: "Completed" }));
      getReconSummaries().then(setSummaries);
    } catch (error) {
      console.error("Process failed:", error);
      setCurrentStep(s => ({ ...s, [uploadId]: "Failed" }));
      alert("Process failed. Please check the console for details.");
    } finally {
      setLoading(l => ({ ...l, [uploadId]: false }));
    }
  };

  const handleViewDetails = async (recon_id) => {
    if (!details[recon_id]) {
      const detail = await getReconSummaryDetail(recon_id);
      setDetails(d => ({ ...d, [recon_id]: detail }));
      
      // Automatically load panel details if panel name is available
      if (detail.panelname) {
        try {
          const panelDetail = await getPanelDetails(detail.panelname);
          setPanelDetails(panelDetail);
        } catch (error) {
          console.error("Failed to load panel details:", error);
          // Don't show alert, just log the error
        }
      }
    } else {
      // If details already exist, check if we need to load different panel data
      const existingDetail = details[recon_id];
      if (existingDetail.panelname && (!panelDetails || panelDetails.panel_name !== existingDetail.panelname)) {
        try {
          const panelDetail = await getPanelDetails(existingDetail.panelname);
          setPanelDetails(panelDetail);
        } catch (error) {
          console.error("Failed to load panel details:", error);
        }
      }
    }
    setShowDetails(s => ({ ...s, [recon_id]: !s[recon_id] }));
  };

  // Pagination helper functions
  const getTotalPages = () => {
    const dataToUse = filteredRows || (panelDetails?.rows || []);
    return Math.ceil(dataToUse.length / rowsPerPage);
  };

  const getCurrentPageData = () => {
    const dataToUse = filteredRows || (panelDetails?.rows || []);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return dataToUse.slice(startIndex, endIndex);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  const handleFilterData = () => {
    if (!panelDetails || !panelDetails.rows) {
      alert("No data available to filter");
      return;
    }

    const newFilterField = prompt("Enter field name to filter by (e.g., 'initial_status', 'email'):");
    if (newFilterField) {
      const newFilterValue = prompt(`Enter value to filter for '${newFilterField}':`);
      if (newFilterValue !== null) {
        setFilterField(newFilterField);
        setFilterValue(newFilterValue);
        
        // Apply filter
        const filtered = panelDetails.rows.filter(row => 
          String(row[newFilterField] || "").toLowerCase().includes(newFilterValue.toLowerCase())
        );
        setFilteredRows(filtered);
        setCurrentPage(1); // Reset to first page
        
        alert(`Filter applied: Found ${filtered.length} rows matching "${newFilterValue}" in "${newFilterField}"`);
      }
    }
  };

  const clearFilter = () => {
    setFilteredRows(null);
    setFilterField("");
    setFilterValue("");
    setCurrentPage(1);
  };

  const handleDownloadData = () => {
    const dataToDownload = filteredRows || (panelDetails?.rows || []);
    if (!dataToDownload || dataToDownload.length === 0) {
      alert("No data available to download");
      return;
    }

    try {
      // Create CSV content
      const headers = Object.keys(dataToDownload[0]);
      const csvContent = [
        headers.join(','), // Header row
        ...dataToDownload.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Create filename with filter info if applicable
      let filename = `${panelDetails.panel_name}_data`;
      if (filteredRows) {
        filename += `_filtered_${filterField}_${filterValue}`;
      }
      filename += `_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      const message = filteredRows 
        ? `Downloaded ${dataToDownload.length} filtered rows to CSV file`
        : `Downloaded ${dataToDownload.length} rows to CSV file`;
      alert(message);
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading data. Please try again.');
    }
  };

  return (
    <div style={{ background: "#f4f6fb", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16, maxWidth: 1200, margin: "40px auto" }}>
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ textAlign: "center", color: "#343a40", marginBottom: 24 }}>Reconciliation</h2>
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
            <div><strong>#Total Records:</strong> {result.total_records}</div>
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
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>#Total Records</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Uploaded By</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Action</th>
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
                        {loading[item.docid || item.doc_id] 
                          ? (currentStep[item.docid || item.doc_id] || "Processing...") 
                          : "Start Recon"}
                      </button>
                    </td>
                  </tr>
                  {reconResults[item.docid || item.doc_id] && (
                    <tr>
                      <td colSpan={8}>
                        {/* User Categorization Results */}
                        <div style={{ marginBottom: 16, borderBottom: "1px solid #dee2e6", paddingBottom: 16 }}>
                          <h4 style={{ color: "#495057", marginBottom: 8 }}>📊 User Categorization Results</h4>
                          <pre style={{ background: "#f8f9fa", padding: 8, borderRadius: 4, fontSize: 12 }}>
                            {JSON.stringify(reconResults[item.docid || item.doc_id].categorization?.summary, null, 2)}
                          </pre>
                          {reconResults[item.docid || item.doc_id].categorization?.message && (
                            <div style={{ color: "#17a2b8", fontWeight: 500, marginTop: 8, fontSize: 14 }}>
                              ✅ {reconResults[item.docid || item.doc_id].categorization.message}
                            </div>
                          )}
                        </div>
                        
                        {/* HR Reconciliation Results */}
                        <div style={{ marginBottom: 16 }}>
                          <h4 style={{ color: "#495057", marginBottom: 8 }}>🏢 HR Reconciliation Results</h4>
                          <pre style={{ background: "#f8f9fa", padding: 8, borderRadius: 4, fontSize: 12 }}>
                            {JSON.stringify(reconResults[item.docid || item.doc_id].hr_data?.summary, null, 2)}
                          </pre>
                          {reconResults[item.docid || item.doc_id].hr_data?.message && (
                            <div style={{ color: "#28a745", fontWeight: 500, marginTop: 8, fontSize: 14 }}>
                              ✅ {reconResults[item.docid || item.doc_id].hr_data.message}
                            </div>
                          )}
                        </div>
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
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Action</th>
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
                    <td>{row.error || "-"}</td>
                    <td>
                      {row.error ? (
                        <span style={{ color: "#e74c3c" }}>{row.error}</span>
                      ) : (
                        <button 
                          onClick={() => handleViewDetails(row.recon_id)}
                          style={{
                            padding: "4px 8px",
                            background: "#007bff",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            fontSize: 12,
                            cursor: "pointer"
                          }}
                        >
                          {showDetails[row.recon_id] ? "Hide Details" : "View Details"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {showDetails[row.recon_id] && (
                    <tr>
                      <td colSpan={9}>
                        <div style={{ padding: 16, background: "#f8f9fa", borderRadius: 6, margin: 8 }}>
                          <h4 style={{ color: "#495057", marginBottom: 12, fontSize: 16 }}>📊 Reconciliation Summary</h4>
                          
                          {details[row.recon_id] ? (
                            <div>
                              {/* Basic Info */}
                              <div style={{ marginBottom: 16 }}>
                                <h5 style={{ color: "#6c757d", marginBottom: 8, fontSize: 14 }}>Reconciliation Information</h5>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                                  <div style={{ background: "#fff", padding: 8, borderRadius: 4, border: "1px solid #dee2e6" }}>
                                    <strong>Panel Name:</strong> {details[row.recon_id].panelname || "N/A"}
                                  </div>
                                  <div style={{ background: "#fff", padding: 8, borderRadius: 4, border: "1px solid #dee2e6" }}>
                                    <strong>SOT Type:</strong> {details[row.recon_id].sot_type || "N/A"}
                                  </div>
                                  <div style={{ background: "#fff", padding: 8, borderRadius: 4, border: "1px solid #dee2e6" }}>
                                    <strong>Status:</strong> 
                                    <span style={{ 
                                      color: details[row.recon_id].status === "complete" ? "#28a745" : "#dc3545",
                                      fontWeight: 600,
                                      marginLeft: 4
                                    }}>
                                      {details[row.recon_id].status || "N/A"}
                                    </span>
                                  </div>
                                  <div style={{ background: "#fff", padding: 8, borderRadius: 4, border: "1px solid #dee2e6" }}>
                                    <strong>Performed By:</strong> {details[row.recon_id].performed_by || "N/A"}
                                  </div>
                                </div>
                              </div>

                              {/* Total Users Overview */}
                              {details[row.recon_id].summary && details[row.recon_id].summary.total_panel_users && (
                                <div style={{ marginBottom: 16 }}>
                                  <h5 style={{ color: "#6c757d", marginBottom: 8, fontSize: 14 }}>Panel Overview</h5>
                                  <div style={{ 
                                    background: "#fff", 
                                    padding: 16, 
                                    borderRadius: 6, 
                                    border: "1px solid #dee2e6",
                                    textAlign: "center"
                                  }}>
                                    <div style={{ 
                                      fontSize: 14, 
                                      color: "#6c757d", 
                                      textTransform: "uppercase",
                                      fontWeight: 600,
                                      marginBottom: 4
                                    }}>
                                      Total Panel Users
                                    </div>
                                    <div style={{ 
                                      fontSize: 32, 
                                      fontWeight: 700,
                                      color: "#007bff"
                                    }}>
                                      {details[row.recon_id].summary.total_panel_users}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Summary Statistics */}
                              {details[row.recon_id].summary && (
                                <div style={{ marginBottom: 16 }}>
                                  <h5 style={{ color: "#6c757d", marginBottom: 8, fontSize: 14 }}>Reconciliation Results</h5>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                                    {Object.entries(details[row.recon_id].summary).map(([key, value]) => {
                                      // Skip certain fields that are better displayed separately
                                      if (["panel_name", "total_panel_users"].includes(key)) {
                                        return null;
                                      }
                                      
                                      // Determine color based on key
                                      let color = "#007bff"; // default blue
                                      if (key.includes("found") || key.includes("matched") || key.includes("active")) {
                                        color = "#28a745"; // green
                                      } else if (key.includes("not_found") || key.includes("errors") || key.includes("inactive")) {
                                        color = "#dc3545"; // red
                                      } else if (key.includes("service_users")) {
                                        color = "#17a2b8"; // info blue
                                      } else if (key.includes("thirdparty_users")) {
                                        color = "#ffc107"; // warning yellow
                                      } else if (key.includes("internal_users")) {
                                        color = "#6f42c1"; // purple
                                      } else if (key.includes("other_users")) {
                                        color = "#fd7e14"; // orange
                                      }
                                      
                                      return (
                                        <div key={key} style={{ 
                                          background: "#fff", 
                                          padding: 12, 
                                          borderRadius: 6, 
                                          border: "1px solid #dee2e6",
                                          textAlign: "center"
                                        }}>
                                          <div style={{ 
                                            fontSize: 12, 
                                            color: "#6c757d", 
                                            textTransform: "uppercase",
                                            fontWeight: 600,
                                            marginBottom: 4
                                          }}>
                                            {key.replace(/_/g, ' ')}
                                          </div>
                                          <div style={{ 
                                            fontSize: 20, 
                                            fontWeight: 700,
                                            color: color
                                          }}>
                                            {value}
                                          </div>
                                        </div>
                                      );
                                    }).filter(Boolean)}
                                  </div>
                                </div>
                              )}

                              {/* User Recategorization Section */}
                              {details[row.recon_id].panelname && (
                                <div style={{ marginBottom: 16 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <h5 style={{ color: "#6c757d", fontSize: 14 }}>🔄 User Recategorization</h5>
                                    <button
                                      onClick={() => handleShowRecategorization(row.recon_id)}
                                      style={{
                                        padding: "4px 8px",
                                        background: "#28a745",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: 4,
                                        fontSize: 12,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px"
                                      }}
                                    >
                                      {showRecategorization[row.recon_id] ? "🔄 Hide Recategorization" : "🔄 Recategorize Users"}
                                    </button>
                                  </div>
                                  
                                  {showRecategorization[row.recon_id] && (
                                    <div style={{ background: "#fff", borderRadius: 6, padding: 12, border: "1px solid #dee2e6" }}>
                                      <div style={{ marginBottom: 12 }}>
                                        <h6 style={{ color: "#495057", marginBottom: 6, fontSize: 13 }}>Recategorization Instructions</h6>
                                        <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 8 }}>
                                          <strong>File Requirements:</strong>
                                          <ul style={{ margin: "4px 0", paddingLeft: 16 }}>
                                            <li>Must contain a match column (email, user_email, domain, id, user_id, employee_id)</li>
                                            <li>Must contain a type column (type, user_type, status, category, final_status, classification)</li>
                                            <li>Match column values will be compared with panel data</li>
                                            <li>Type column values will be used as the new final_status</li>
                                          </ul>
                                        </div>
                                      </div>
                                      
                                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <input
                                          type="file"
                                          accept=".csv, .xlsx, .xls"
                                          onChange={handleRecategorizationFileChange}
                                          style={{
                                            padding: "6px",
                                            border: "1px solid #ced4da",
                                            borderRadius: 4,
                                            fontSize: 12
                                          }}
                                        />
                                        <button
                                          onClick={() => handleUserRecategorization(details[row.recon_id].panelname, row.recon_id)}
                                          disabled={!recategorizationFile || recategorizationLoading[row.recon_id]}
                                          style={{
                                            padding: "6px 12px",
                                            background: recategorizationLoading[row.recon_id] ? "#adb5bd" : "#28a745",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: 4,
                                            fontSize: 12,
                                            cursor: recategorizationLoading[row.recon_id] ? "not-allowed" : "pointer",
                                            fontWeight: 600
                                          }}
                                        >
                                          {recategorizationLoading[row.recon_id] ? "🔄 Processing..." : "🔄 Start Recategorization"}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Panel Details Section */}
                              {details[row.recon_id].panelname && (
                                <div style={{ marginBottom: 16 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <h5 style={{ color: "#6c757d", fontSize: 14 }}>📋 Panel Details</h5>
                                    <button
                                      onClick={() => setShowPanelDetails(!showPanelDetails)}
                                      style={{
                                        padding: "4px 8px",
                                        background: "#007bff",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: 4,
                                        fontSize: 12,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px"
                                      }}
                                    >
                                      {showPanelDetails ? "📋 Hide Panel Data" : "📋 View Details"}
                                    </button>
                                  </div>
                                  
                                  {showPanelDetails && panelDetails && panelDetails.panel_name === details[row.recon_id].panelname ? (
                                    <div style={{ background: "#fff", borderRadius: 6, padding: 12, border: "1px solid #dee2e6" }}>
                                      {/* Basic Statistics */}
                                      <div style={{ marginBottom: 12 }}>
                                        <h6 style={{ color: "#495057", marginBottom: 6, fontSize: 13 }}>Panel Statistics</h6>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 6 }}>
                                          <div style={{ background: "#f8f9fa", padding: 6, borderRadius: 4, textAlign: "center" }}>
                                            <div style={{ fontSize: 10, color: "#6c757d" }}>Total Rows</div>
                                            <div style={{ fontSize: 16, fontWeight: 600, color: "#007bff" }}>
                                              {panelDetails.rows ? panelDetails.rows.length : 0}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Status Distribution */}
                                      {panelDetails.rows && panelDetails.rows.length > 0 && (
                                        <div style={{ marginBottom: 12 }}>
                                          <h6 style={{ color: "#495057", marginBottom: 6, fontSize: 13 }}>Status Distribution</h6>
                                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 4 }}>
                                            {(() => {
                                              const dataToAnalyze = filteredRows || panelDetails.rows;
                                              const statusCounts = {};
                                              dataToAnalyze.forEach(row => {
                                                const status = row.initial_status || "unknown";
                                                statusCounts[status] = (statusCounts[status] || 0) + 1;
                                              });
                                              return Object.entries(statusCounts).map(([status, count]) => (
                                                <div key={status} style={{ 
                                                  background: "#e9ecef", 
                                                  padding: 6, 
                                                  borderRadius: 4, 
                                                  textAlign: "center",
                                                  fontSize: 12
                                                }}>
                                                  <div style={{ fontWeight: 600, fontSize: 10 }}>{status}</div>
                                                  <div style={{ fontSize: 14, color: "#007bff" }}>{count}</div>
                                                </div>
                                              ));
                                            })()}
                                          </div>
                                        </div>
                                      )}

                                      {/* Complete Panel Data with Pagination */}
                                      {panelDetails.rows && panelDetails.rows.length > 0 && (
                                        <div>
                                          <h6 style={{ color: "#495057", marginBottom: 6, fontSize: 13 }}>
                                            Panel Data ({filteredRows ? filteredRows.length : panelDetails.rows.length} total rows)
                                            {filteredRows && (
                                              <span style={{ 
                                                color: "#17a2b8", 
                                                fontSize: 11, 
                                                marginLeft: 8,
                                                fontWeight: "normal"
                                              }}>
                                                (Filtered: {filterField} = "{filterValue}")
                                              </span>
                                            )}
                                          </h6>
                                          
                                          {/* Action Buttons */}
                                          <div style={{ 
                                            marginBottom: 8, 
                                            display: "flex", 
                                            justifyContent: "space-between", 
                                            alignItems: "center" 
                                          }}>
                                            {/* Rows per page selector */}
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                              <label style={{ fontSize: 11, color: "#495057" }}>Rows per page:</label>
                                              <select
                                                value={rowsPerPage}
                                                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                                                style={{
                                                  padding: "2px 6px",
                                                  border: "1px solid #ced4da",
                                                  borderRadius: 3,
                                                  fontSize: 11
                                                }}
                                              >
                                                <option value={5}>5</option>
                                                <option value={10}>10</option>
                                                <option value={25}>25</option>
                                                <option value={50}>50</option>
                                              </select>
                                            </div>
                                            
                                            {/* Action Icons */}
                                            <div style={{ display: "flex", gap: 4 }}>
                                              <button
                                                onClick={() => handleFilterData()}
                                                style={{
                                                  padding: "4px 8px",
                                                  background: filteredRows ? "#ffc107" : "#17a2b8",
                                                  color: "#fff",
                                                  border: "none",
                                                  borderRadius: 3,
                                                  fontSize: 11,
                                                  cursor: "pointer",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "4px"
                                                }}
                                                title={filteredRows ? "Change Filter" : "Filter Data"}
                                              >
                                                🔍 {filteredRows ? "Change Filter" : "Filter"}
                                              </button>
                                              
                                              {filteredRows && (
                                                <button
                                                  onClick={clearFilter}
                                                  style={{
                                                    padding: "4px 8px",
                                                    background: "#dc3545",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: 3,
                                                    fontSize: 11,
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px"
                                                  }}
                                                  title="Clear Filter"
                                                >
                                                  ❌ Clear
                                                </button>
                                              )}
                                              
                                              <button
                                                onClick={() => handleDownloadData()}
                                                style={{
                                                  padding: "4px 8px",
                                                  background: "#28a745",
                                                  color: "#fff",
                                                  border: "none",
                                                  borderRadius: 3,
                                                  fontSize: 11,
                                                  cursor: "pointer",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "4px"
                                                }}
                                                title="Download Data"
                                              >
                                                📥 Download
                                              </button>
                                            </div>
                                          </div>
                                          
                                          <div style={{ overflowX: "auto", maxHeight: 300 }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                                              <thead>
                                                <tr style={{ background: "#e9ecef" }}>
                                                  {Object.keys(panelDetails.rows[0]).map(header => (
                                                    <th key={header} style={{ 
                                                      padding: "4px 6px", 
                                                      textAlign: "left", 
                                                      border: "1px solid #dee2e6",
                                                      fontSize: 10,
                                                      fontWeight: 600
                                                    }}>
                                                      {header}
                                                    </th>
                                                  ))}
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {getCurrentPageData().map((row, idx) => (
                                                  <tr key={idx}>
                                                    {Object.keys(panelDetails.rows[0]).map(header => (
                                                      <td key={header} style={{ 
                                                        padding: "4px 6px", 
                                                        border: "1px solid #dee2e6", 
                                                        maxWidth: 100, 
                                                        overflow: "hidden", 
                                                        textOverflow: "ellipsis",
                                                        fontSize: 10
                                                      }}>
                                                        {row[header] || ""}
                                                      </td>
                                                    ))}
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                          
                                          {/* Compact Pagination Controls */}
                                          <div style={{ 
                                            marginTop: 8, 
                                            display: "flex", 
                                            justifyContent: "space-between", 
                                            alignItems: "center",
                                            padding: "6px 0",
                                            borderTop: "1px solid #dee2e6",
                                            fontSize: 11
                                          }}>
                                            <div style={{ color: "#495057" }}>
                                              Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, (filteredRows ? filteredRows.length : panelDetails.rows.length))} of {filteredRows ? filteredRows.length : panelDetails.rows.length} rows
                                            </div>
                                            
                                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                              <button
                                                onClick={() => handlePageChange(1)}
                                                disabled={currentPage === 1}
                                                style={{
                                                  padding: "3px 8px",
                                                  border: "1px solid #ced4da",
                                                  borderRadius: 3,
                                                  background: currentPage === 1 ? "#f8f9fa" : "#fff",
                                                  color: currentPage === 1 ? "#adb5bd" : "#495057",
                                                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                                                  fontSize: 10
                                                }}
                                              >
                                                First
                                              </button>
                                              
                                              <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                style={{
                                                  padding: "3px 8px",
                                                  border: "1px solid #ced4da",
                                                  borderRadius: 3,
                                                  background: currentPage === 1 ? "#f8f9fa" : "#fff",
                                                  color: currentPage === 1 ? "#adb5bd" : "#495057",
                                                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                                                  fontSize: 10
                                                }}
                                              >
                                                Prev
                                              </button>
                                              
                                              <span style={{ color: "#495057", padding: "0 8px", fontSize: 10 }}>
                                                {currentPage} of {getTotalPages()}
                                              </span>
                                              
                                              <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === getTotalPages()}
                                                style={{
                                                  padding: "3px 8px",
                                                  border: "1px solid #ced4da",
                                                  borderRadius: 3,
                                                  background: currentPage === getTotalPages() ? "#f8f9fa" : "#fff",
                                                  color: currentPage === getTotalPages() ? "#adb5bd" : "#495057",
                                                  cursor: currentPage === getTotalPages() ? "not-allowed" : "pointer",
                                                  fontSize: 10
                                                }}
                                              >
                                                Next
                                              </button>
                                              
                                              <button
                                                onClick={() => handlePageChange(getTotalPages())}
                                                disabled={currentPage === getTotalPages()}
                                                style={{
                                                  padding: "3px 8px",
                                                  border: "1px solid #ced4da",
                                                  borderRadius: 3,
                                                  background: currentPage === getTotalPages() ? "#f8f9fa" : "#fff",
                                                  color: currentPage === getTotalPages() ? "#adb5bd" : "#495057",
                                                  cursor: currentPage === getTotalPages() ? "not-allowed" : "pointer",
                                                  fontSize: 10
                                                }}
                                              >
                                                Last
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : showPanelDetails && (
                                    <div style={{ 
                                      background: "#fff", 
                                      borderRadius: 6, 
                                      padding: 12, 
                                      border: "1px solid #dee2e6",
                                      textAlign: "center",
                                      color: "#6c757d"
                                    }}>
                                      Loading panel details...
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Error Information */}
                              {details[row.recon_id].error && (
                                <div style={{ 
                                  background: "#f8d7da", 
                                  color: "#721c24", 
                                  padding: 12, 
                                  borderRadius: 6, 
                                  border: "1px solid #f5c6cb",
                                  marginTop: 12
                                }}>
                                  <strong>Error:</strong> {details[row.recon_id].error}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ textAlign: "center", color: "#6c757d" }}>
                              Loading reconciliation details...
                            </div>
                          )}
                        </div>
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