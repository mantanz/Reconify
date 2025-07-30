import React, { useState, useEffect } from "react";
import { API_BASE, getSOTList, getSOTUploads, uploadSOTFile } from "../../utils/api";
import { MAX_FILE_SIZE } from '../../utils/constants';

export default function SOTUpload() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [sotList, setSotList] = useState([]);
  const [sotMetadata, setSotMetadata] = useState({});
  const [uploadingSot, setUploadingSot] = useState("");
  const [showNewSOTForm, setShowNewSOTForm] = useState(false);
  const [newSOTName, setNewSOTName] = useState("");
  const [newSOTFile, setNewSOTFile] = useState(null);
  const [creatingSOT, setCreatingSOT] = useState(false);

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
    if (statusLower === "complete" || statusLower === "processed") return "#27ae60"; // Green
    
    // Processing statuses
    if (statusLower === "uploading" || statusLower === "uploaded" || statusLower === "processing") return "#f39c12"; // Orange
    
    // Warning statuses
    if (statusLower === "processed_with_warning") return "#e67e22"; // Dark Orange
    
    // Failed statuses
    if (statusLower === "failed") return "#e74c3c"; // Red
    
    return "#6c757d"; // Default gray
  };

  const handleUpload = async (sotType, file) => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      const sizeInMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
      setError(`File size exceeds the maximum limit of ${sizeInMB}MB. Please choose a smaller file.`);
      return;
    }

    setUploading(true);
    setUploadingSot(sotType);
    setError("");
    setResult(null);
    
    // Start polling for status updates
    const pollInterval = setInterval(async () => {
      await fetchHistory();
    }, 2000); // Poll every 2 seconds
    
    try {
      const data = await uploadSOTFile(file, sotType);
      setResult(data);
      if (data.error) {
        setError(data.error);
      } else {
        // Final refresh after upload completes
        await fetchHistory();
      }
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      clearInterval(pollInterval); // Stop polling
      setUploading(false);
      setUploadingSot("");
    }
  };

  const handleCreateNewSOT = async () => {
    if (!newSOTName.trim() || !newSOTFile) {
      setError("Please provide both SOT name and file.");
      return;
    }

    // File size validation
    if (newSOTFile.size > MAX_FILE_SIZE) {
      const sizeInMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
      setError(`File size exceeds the maximum limit of ${sizeInMB}MB. Please choose a smaller file.`);
      return;
    }

    setCreatingSOT(true);
    setError("");
    setResult(null);

    try {
      // Create SOT configuration first
      const sotName = newSOTName.trim().toLowerCase().replace(/\s+/g, '_');
      
      // Read file headers using a temporary upload
      const formData = new FormData();
      formData.append("file", newSOTFile);
      formData.append("sot_type", sotName);
      
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Upload file to get headers and create table
      const uploadRes = await fetch(`${API_BASE}/sot/upload`, {
        method: "POST",
        headers,
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      
      if (uploadData.error) {
        setError(uploadData.error);
        return;
      }

      // Extract headers from the uploaded data by checking the database
      const debugRes = await fetch(`${API_BASE}/debug/sot/${sotName}`, { headers });
      const debugData = await debugRes.json();
      const fileHeaders = debugData.columns || [];

      // Create SOT configuration with simplified structure
      const configRes = await fetch(`${API_BASE}/sot/config`, {
        method: "POST",
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: sotName,
          headers: fileHeaders
        })
      });

      if (configRes.ok) {
        setResult({
          status: "success",
          message: `New SOT '${newSOTName}' created successfully!`,
          sot_name: sotName,
          headers: fileHeaders
        });
        
        // Reset form
        setNewSOTName("");
        setNewSOTFile(null);
        setShowNewSOTForm(false);
        
        // Refresh SOT list
        const updatedSOTList = await getSOTList();
        setSotList(updatedSOTList.sots || []);
        
        // Refresh history
        await fetchHistory();
      } else {
        const configData = await configRes.json();
        setError(configData.detail || "Failed to create SOT configuration");
      }
    } catch (err) {
      setError(err.message || "Failed to create new SOT");
    } finally {
      setCreatingSOT(false);
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "-";
    
    try {
      // Handle different timestamp formats
      let date;
      if (timestamp.includes("-") && timestamp.includes(":")) {
        // Format: "27-07-2025 16:05:35"
        const [datePart, timePart] = timestamp.split(" ");
        const [day, month, year] = datePart.split("-");
        const [hour, minute, second] = timePart.split(":");
        date = new Date(year, month - 1, day, hour, minute, second);
      } else if (timestamp.includes("T")) {
        // ISO format
        date = new Date(timestamp);
      } else {
        // Try parsing as is
        date = new Date(timestamp);
      }
      
      if (isNaN(date.getTime())) {
        return timestamp; // Return original if parsing fails
      }
      
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
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
           sot.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleSOTNameClick = async (sotName) => {
    try {
      // Fetch the SOT data using the new details endpoint
      const response = await fetch(`${API_BASE}/sot/${encodeURIComponent(sotName)}/details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch SOT data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.rows || data.rows.length === 0) {
        alert("No data available for this SOT.");
        return;
      }
      
      // Create a simple HTML page with pagination
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SOT Data: ${getSotDisplayName(sotName)}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #f5f5f5;
              padding: 20px;
              line-height: 1.6;
            }
            
            .container {
              max-width: 1400px;
              margin: 0 auto;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            
            .header {
              background: linear-gradient(135deg, #002e6e 0%, #0056b6 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            
            .header h1 {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 8px;
            }
            
            .header p {
              font-size: 16px;
              opacity: 0.9;
            }
            
            .content {
              padding: 30px;
            }
            
            .pagination-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
              border: 1px solid #e9ecef;
            }
            
            .pagination-info .total-records {
              font-weight: 600;
              color: #495057;
            }
            
            .pagination-info .page-info {
              color: #6c757d;
              font-size: 14px;
            }
            
            .table-container {
              overflow-x: auto;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              margin-bottom: 20px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              background: white;
              font-size: 14px;
            }
            
            th {
              background: #002e6e;
              color: white;
              padding: 15px 12px;
              text-align: left;
              font-weight: 600;
              white-space: nowrap;
              position: sticky;
              top: 0;
            }
            
            td {
              padding: 12px;
              border-bottom: 1px solid #eee;
              word-wrap: break-word;
              white-space: normal;
              max-width: none;
            }
            
            tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            
            tr:hover {
              background-color: #f0f8ff;
            }
            
            .pagination-controls {
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 10px;
              margin-top: 20px;
            }
            
            .pagination-controls button {
              padding: 10px 15px;
              border: 1px solid #dee2e6;
              background: white;
              color: #495057;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s ease;
            }
            
            .pagination-controls button:hover:not(:disabled) {
              background: #007bff;
              color: white;
              border-color: #007bff;
            }
            
            .pagination-controls button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
            
            .pagination-controls .current-page {
              background: #007bff;
              color: white;
              border-color: #007bff;
            }
            
            .page-size-selector {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-left: 20px;
            }
            
            .page-size-selector select {
              padding: 8px 12px;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              background: white;
              font-size: 14px;
            }
            
            .no-data {
              text-align: center;
              padding: 50px;
              color: #666;
              font-size: 16px;
            }
            
            @media (max-width: 768px) {
              body {
                padding: 10px;
              }
              
              .header {
                padding: 20px;
              }
              
              .header h1 {
                font-size: 24px;
              }
              
              .content {
                padding: 20px;
              }
              
              .pagination-info {
                flex-direction: column;
                gap: 10px;
                text-align: center;
              }
              
              .pagination-controls {
                flex-wrap: wrap;
                gap: 5px;
              }
              
              .page-size-selector {
                margin-left: 0;
                margin-top: 10px;
              }
              
              th, td {
                padding: 10px 8px;
                font-size: 13px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SOT Data: ${getSotDisplayName(sotName)}</h1>
              <p>${data.rows.length} records</p>
            </div>
            
            <div class="content">
              ${data.rows.length > 0 ? `
                <div class="pagination-info">
                  <div class="total-records">Total Records: ${data.rows.length}</div>
                  <div class="page-info">Showing <span id="startRecord">1</span> to <span id="endRecord">10</span> of ${data.rows.length}</div>
                  <div class="page-size-selector">
                    <label>Records per page:</label>
                    <select id="pageSize" onchange="changePageSize()">
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>
                
                <div class="table-container">
                  <table id="dataTable">
                    <thead>
                      <tr>
                        ${Object.keys(data.rows[0]).map(header => `<th>${header}</th>`).join('')}
                      </tr>
                    </thead>
                    <tbody id="tableBody">
                      ${data.rows.slice(0, 10).map(row => `
                        <tr>
                          ${Object.values(row).map(value => `<td>${value || '-'}</td>`).join('')}
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
                
                <div class="pagination-controls">
                  <button onclick="goToPage(1)" id="firstPage">First</button>
                  <button onclick="goToPage(currentPage - 1)" id="prevPage">Previous</button>
                  
                  <div id="pageNumbers"></div>
                  
                  <button onclick="goToPage(currentPage + 1)" id="nextPage">Next</button>
                  <button onclick="goToPage(totalPages)" id="lastPage">Last</button>
                </div>
              ` : `
                <div class="no-data">
                  No data available for this SOT.
                </div>
              `}
            </div>
          </div>
          
          <script>
            // Pagination variables
            let currentPage = 1;
            let pageSize = 10;
            let totalPages = Math.ceil(${data.rows.length} / pageSize);
            const allData = ${JSON.stringify(data.rows)};
            
            // Initialize pagination
            function initializePagination() {
              updateTable();
              updatePaginationInfo();
              updatePageNumbers();
              updateButtonStates();
            }
            
            // Update table with current page data
            function updateTable() {
              const startIndex = (currentPage - 1) * pageSize;
              const endIndex = startIndex + pageSize;
              const pageData = allData.slice(startIndex, endIndex);
              
              const tableBody = document.getElementById('tableBody');
              tableBody.innerHTML = pageData.map(row => 
                '<tr>' + Object.values(row).map(value => '<td>' + (value || '-') + '</td>').join('') + '</tr>'
              ).join('');
            }
            
            // Update pagination information
            function updatePaginationInfo() {
              const startRecord = (currentPage - 1) * pageSize + 1;
              const endRecord = Math.min(currentPage * pageSize, allData.length);
              
              document.getElementById('startRecord').textContent = startRecord;
              document.getElementById('endRecord').textContent = endRecord;
            }
            
            // Update page numbers
            function updatePageNumbers() {
              const pageNumbersDiv = document.getElementById('pageNumbers');
              let pageNumbersHTML = '';
              
              const maxVisiblePages = 5;
              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              
              if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }
              
              for (let i = startPage; i <= endPage; i++) {
                const buttonClass = i === currentPage ? 'current-page' : '';
                pageNumbersHTML += '<button onclick="goToPage(' + i + ')" class="' + buttonClass + '">' + i + '</button>';
              }
              
              pageNumbersDiv.innerHTML = pageNumbersHTML;
            }
            
            // Update button states
            function updateButtonStates() {
              document.getElementById('firstPage').disabled = currentPage === 1;
              document.getElementById('prevPage').disabled = currentPage === 1;
              document.getElementById('nextPage').disabled = currentPage === totalPages;
              document.getElementById('lastPage').disabled = currentPage === totalPages;
            }
            
            // Go to specific page
            function goToPage(page) {
              if (page >= 1 && page <= totalPages) {
                currentPage = page;
                updateTable();
                updatePaginationInfo();
                updatePageNumbers();
                updateButtonStates();
              }
            }
            
            // Change page size
            function changePageSize() {
              pageSize = parseInt(document.getElementById('pageSize').value);
              totalPages = Math.ceil(allData.length / pageSize);
              currentPage = 1;
              initializePagination();
            }
            
            // Initialize on page load
            document.addEventListener('DOMContentLoaded', function() {
              initializePagination();
            });
          </script>
        </body>
        </html>
      `;
      
      // Open new tab and write content
      const newTab = window.open('', '_blank');
      if (newTab) {
        newTab.document.write(htmlContent);
        newTab.document.close();
      } else {
        alert("Please allow popups for this site to view SOT data in a new tab.");
      }
      
    } catch (error) {
      console.error("Error fetching SOT data:", error);
      alert("Failed to fetch SOT data. Please try again.");
    }
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
          <div><strong>{result.status === "failed" ? "Upload Failed!" : "Success!"}</strong></div>
          {result.message && <div>{result.message}</div>}
          {result.doc_id && <div><strong>Doc ID:</strong> {result.doc_id}</div>}
          {result.doc_name && <div><strong>File Name:</strong> {result.doc_name}</div>}
          {result.uploaded_by && <div><strong>Uploaded By:</strong> {result.uploaded_by}</div>}
          {result.timestamp && <div><strong>Timestamp:</strong> {result.timestamp}</div>}
          {result.status && <div><strong>Status:</strong> {result.status}</div>}
          {result.sot_type && <div><strong>SOT Type:</strong> {result.sot_type}</div>}
          {result.error && <div><strong>Error:</strong> {result.error}</div>}
        </div>
      )}

      {/* Add New SOT Section */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setShowNewSOTForm(!showNewSOTForm)}
          style={{
            background: showNewSOTForm ? "#6c757d" : "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 20px",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s ease"
          }}
        >
          <span>{showNewSOTForm ? "−" : "+"}</span>
          {showNewSOTForm ? "Cancel" : "Add New SOT"}
        </button>

        {showNewSOTForm && (
          <div style={{
            marginTop: 16,
            padding: 20,
            background: "#f8f9fa",
            borderRadius: 8,
            border: "1px solid #e9ecef"
          }}>
            <h3 style={{ marginBottom: 16, color: "#343a40", fontSize: 16 }}>Create New SOT</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: "block", 
                marginBottom: 8, 
                color: "#343a40", 
                fontWeight: 500, 
                fontSize: 14 
              }}>
                SOT Name:
              </label>
              <input
                type="text"
                placeholder="e.g., vendor_data, contractor_data"
                value={newSOTName}
                onChange={(e) => setNewSOTName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e9ecef",
                  borderRadius: 8,
                  outline: "none",
                  fontSize: 14,
                  background: "#fff",
                  color: "#343a40",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
              />
              <div style={{ 
                marginTop: 4, 
                fontSize: 12, 
                color: "#6c757d" 
              }}>
                Use lowercase letters, numbers, and underscores only. Spaces will be converted to underscores.
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: "block", 
                marginBottom: 8, 
                color: "#343a40", 
                fontWeight: 500, 
                fontSize: 14 
              }}>
                SOT File:
              </label>
              <input
                type="file"
                accept=".csv, .xlsx, .xls, .xlsb"
                onChange={(e) => setNewSOTFile(e.target.files[0])}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e9ecef",
                  borderRadius: 8,
                  fontSize: 14,
                  background: "#fff",
                  color: "#6c757d",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <button
              onClick={handleCreateNewSOT}
              disabled={creatingSOT || !newSOTName.trim() || !newSOTFile}
              style={{
                background: creatingSOT || !newSOTName.trim() || !newSOTFile ? "#adb5bd" : "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 24px",
                fontWeight: 600,
                fontSize: 14,
                cursor: creatingSOT || !newSOTName.trim() || !newSOTFile ? "not-allowed" : "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {creatingSOT ? "Creating..." : "Create SOT"}
            </button>
          </div>
        )}
      </div>

      {/* SOT Table */}
      <div style={{ background: "#fff", borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#e9ecef" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>SOT</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>#Rows</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>Last Refreshed DateTime</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>Uploaded By</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>Upload</th>
            </tr>
          </thead>
          <tbody>
            {sotList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#adb5bd", padding: 24 }}>
                  No SOTs configured. Create a new SOT above or configure SOT mappings in panel settings.
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
                    onSOTNameClick={handleSOTNameClick}
                    getStatusColor={getStatusColor}
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
function SOTRow({ sot, metadata, isUploading, uploading, onUpload, getSotDisplayName, formatDateTime, onSOTNameClick, getStatusColor }) {
  const fileInputRef = React.useRef(null);

  const handleUploadClick = () => {
    if (!uploading) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // File size validation
      if (selectedFile.size > MAX_FILE_SIZE) {
        const sizeInMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
        alert(`File size exceeds the maximum limit of ${sizeInMB}MB. Please choose a smaller file.`);
        // Reset the file input
        e.target.value = '';
        return;
      }
      
      onUpload(sot, selectedFile);
      // Reset the file input
      e.target.value = '';
    }
  };

  // Check if there's actual data available
  const hasData = metadata.rowCount > 0;

  return (
    <tr style={{ borderBottom: "1px solid #f1f3f5" }}>
      <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>
        {hasData ? (
          <span 
            style={{ 
              cursor: "pointer", 
              color: "#007bff", 
              textDecoration: "underline", 
              fontWeight: 600 
            }} 
            onClick={() => onSOTNameClick(sot)}
          >
            {getSotDisplayName(sot)}
          </span>
        ) : (
          <span style={{ color: "#6c757d" }}>
        {getSotDisplayName(sot)}
          </span>
        )}
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
      <td style={{ padding: "12px 16px", fontSize: 14, color: getStatusColor(metadata.latestUpload?.status) }}>
        {metadata.latestUpload?.status || "-"}
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