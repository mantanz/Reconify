import React, { useState, useEffect } from "react";
import { API_BASE, getAllReconHistory, categorizeUsers, reconcilePanelWithHR, uploadPanelData } from "../../utils/api";
import { MAX_FILE_SIZE } from '../../utils/constants';

export default function Reconciliation() {
  const [selectedPanel, setSelectedPanel] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState({});
  const [currentStep, setCurrentStep] = useState({});
  const [reconResults, setReconResults] = useState({});
  const [showRecategorization, setShowRecategorization] = useState({});
  const [recategorizationFile, setRecategorizationFile] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/panels`)
      .then(res => res.json())
      .then(setPanels);
    getAllReconHistory().then(setHistory);
  }, []);

  const handlePanelChange = (e) => {
    setSelectedPanel(e.target.value);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // File size validation
      if (selectedFile.size > MAX_FILE_SIZE) {
        const sizeInMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
        alert(`File size exceeds the maximum limit of ${sizeInMB}MB. Please choose a smaller file.`);
        e.target.value = '';
        return;
      }
    }
    setSelectedFile(selectedFile);
  };

  const handleRecategorizationFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // File size validation
      if (selectedFile.size > MAX_FILE_SIZE) {
        const sizeInMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
        alert(`File size exceeds the maximum limit of ${sizeInMB}MB. Please choose a smaller file.`);
        e.target.value = '';
        return;
      }
    }
    setRecategorizationFile(selectedFile);
  };

  const handleShowRecategorization = (reconId) => {
    setShowRecategorization(prev => ({ ...prev, [reconId]: !prev[reconId] }));
  };

  const handleUserRecategorization = async (panelName, reconId) => {
    if (!recategorizationFile) {
      alert("Please select a file for recategorization.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("panel_name", panelName);
      formData.append("file", recategorizationFile);
      const res = await fetch(`${API_BASE}/recategorize_users`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        alert(`Recategorization failed: ${data.error}`);
      } else {
        alert("Recategorization completed successfully!");
        setShowRecategorization(prev => ({ ...prev, [reconId]: false }));
        setRecategorizationFile(null);
        // Refresh history
        getAllReconHistory().then(setHistory);
      }
    } catch (err) {
      alert("Recategorization failed. Please try again.");
    }
  };

  const handlePanelNameClick = async (panelName) => {
    try {
      // Fetch the data first
      const response = await fetch(`${API_BASE}/panels/${encodeURIComponent(panelName)}/details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch panel data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Filter out status columns on the frontend
      const statusColumns = ["initial_status", "final_status"];
      const filteredRows = data.rows.map(row => {
        const filteredRow = {};
        Object.keys(row).forEach(key => {
          if (!statusColumns.includes(key)) {
            filteredRow[key] = row[key];
          }
        });
        return filteredRow;
      });
      
      // Create a simple HTML page with pagination
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Panel Data: ${panelName}</title>
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
              <h1>Panel Data: ${panelName}</h1>
              <p>${filteredRows.length} records</p>
            </div>
            
            <div class="content">
              ${filteredRows.length > 0 ? `
                <div class="pagination-info">
                  <div class="total-records">Total Records: ${filteredRows.length}</div>
                  <div class="page-info">Showing <span id="startRecord">1</span> to <span id="endRecord">10</span> of ${filteredRows.length}</div>
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
                        ${Object.keys(filteredRows[0]).map(header => `<th>${header}</th>`).join('')}
                      </tr>
                    </thead>
                    <tbody id="tableBody">
                      ${filteredRows.slice(0, 10).map(row => `
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
                  No data available for this panel.
                </div>
              `}
            </div>
          </div>
          
          <script>
            // Pagination variables
            let currentPage = 1;
            let pageSize = 10;
            let totalPages = Math.ceil(${filteredRows.length} / pageSize);
            const allData = ${JSON.stringify(filteredRows)};
            
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
        alert("Please allow popups for this site to view panel data in a new tab.");
      }
      
    } catch (error) {
      console.error("Error fetching panel data:", error);
      alert("Failed to fetch panel data. Please try again.");
    }
  };

  const handleUpload = async () => {
    if (!selectedPanel || !selectedFile) {
      setError("Please select both a panel and a file.");
      return;
    }
    setUploading(true);
    setError("");
    setResult(null);
    
    // Start polling for status updates
    const pollInterval = setInterval(async () => {
      const updatedHistory = await getAllReconHistory();
      setHistory(updatedHistory);
    }, 2000); // Poll every 2 seconds
    
    try {
      const data = await uploadPanelData(selectedPanel, selectedFile);
      setResult(data);
      if (data.error) setError(data.error);
      // Final refresh after upload completes
      const finalHistory = await getAllReconHistory();
      setHistory(finalHistory);
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      clearInterval(pollInterval); // Stop polling
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
      
      // Update the history to reflect the completed status
      setHistory(prevHistory => 
        prevHistory.map(item => 
          (item.docid || item.doc_id) === uploadId 
            ? { ...item, status: "complete" }
            : item
        )
      );
    } catch (error) {
      console.error("Process failed:", error);
      setCurrentStep(s => ({ ...s, [uploadId]: "Failed" }));
      
      // Update the history to reflect the failed status
      setHistory(prevHistory => 
        prevHistory.map(item => 
          (item.docid || item.doc_id) === uploadId 
            ? { ...item, status: "failed" }
            : item
        )
      );
      
      alert("Process failed. Please check the console for details.");
    } finally {
      setLoading(l => ({ ...l, [uploadId]: false }));
    }
  };

  const getStatusColor = (status) => {
    if (!status) return "#6c757d"; // Default gray
    
    const statusLower = status.toLowerCase();
    
    // Success statuses
    if (statusLower === "complete" || statusLower === "processed" || statusLower === "recon finished") return "#27ae60"; // Green
    
    // Ready statuses
    if (statusLower === "ready to recon") return "#f1c40f"; // Yellow
    
    // Processing statuses
    if (statusLower === "uploading" || statusLower === "uploaded" || statusLower === "processing") return "#f39c12"; // Orange
    
    // Warning statuses
    if (statusLower === "processed_with_warning") return "#e67e22"; // Dark Orange
    
    // Failed statuses
    if (statusLower === "failed") return "#e74c3c"; // Red
    
    return "#6c757d"; // Default gray
  };

  const getDisplayStatus = (item) => {
    if (!item.status) return "Unknown";
    
    const statusLower = item.status.toLowerCase();
    
    // If upload failed, show "Failed"
    if (statusLower === "failed") return "Failed";
    
    // If reconciliation is complete, show "Recon Finished"
    if (statusLower === "complete") return "Recon Finished";
    
    // If upload was successful but no reconciliation yet, show "Ready to Recon"
    if (statusLower === "processed") return "Ready to Recon";
    
    // Default fallback
    return item.status;
  };

  const canStartReconciliation = (item) => {
    return item.status && item.status.toLowerCase() === "processed";
  };

  // Helper function to parse IST timestamp format (dd-mm-yyyy hh:mm:ss)
  const parseISTTimestamp = (timestamp) => {
    if (!timestamp) return "Invalid Date";
    
    try {
      // Check if it's already a valid date (for backward compatibility)
      const jsDate = new Date(timestamp);
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).replace(/\//g, '-');
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
      
      return parsedDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');
    } catch (error) {
      console.error("Error parsing timestamp:", timestamp, error);
      return timestamp; // Return original if parsing fails
    }
  };

  return (
    <div style={{ 
      maxWidth: 1200, 
      margin: "40px auto", 
      padding: "0 20px"
    }}>
      {/* Header Section */}
      <div style={{ 
        background: "#fff", 
        borderRadius: 12, 
        padding: 32, 
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)", 
        marginBottom: 24,
        border: "1px solid rgba(0,0,0,0.05)"
      }}>
        <h2 style={{ 
          textAlign: "center", 
          color: "#343a40", 
          marginBottom: 32, 
          fontSize: 28, 
          fontWeight: 700 
        }}>
          📊 Data Reconciliation
        </h2>
        
        {/* Upload Section */}
        <div style={{ 
          background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)", 
          borderRadius: 12, 
          padding: 24, 
          border: "1px solid #dee2e6",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: 24
        }}>
          <h3 style={{ 
            color: "#495057", 
            fontSize: 18, 
            fontWeight: 600
          }}>
            🚀 Upload Panel Data
          </h3>
          
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            gap: 16,
            background: "#fff",
            borderRadius: 8,
            padding: "20px 24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            border: "1px solid #e9ecef",
            marginTop: 16
          }}>
            {/* Panel Selection */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <label style={{ 
                color: "#495057", 
                fontWeight: 600, 
                fontSize: 14,
                whiteSpace: "nowrap"
              }}>
                Panel:
              </label>
              <select
                value={selectedPanel}
                onChange={handlePanelChange}
                style={{
                  padding: "12px 16px",
                  border: "2px solid #e9ecef",
                  borderRadius: 8,
                  fontSize: 14,
                  background: "#fff",
                  color: selectedPanel ? "#495057" : "#6c757d",
                  cursor: "pointer",
                  outline: "none",
                  transition: "all 0.3s ease",
                  width: "100%",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  fontWeight: selectedPanel ? "500" : "400"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e9ecef";
                  e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
                }}
              >
                <option value="">-- Select Panel --</option>
                {panels.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div 
              style={{ 
                border: selectedFile ? "2px solid #28a745" : "2px dashed #007bff",
                borderRadius: 8,
                padding: "12px 20px",
                background: selectedFile ? "#f8fff9" : "#f8f9ff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transition: "all 0.3s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                flex: 1
              }}
              onClick={() => document.getElementById("fileInput").click()}
              onMouseEnter={(e) => {
                e.target.style.borderColor = selectedFile ? "#1e7e34" : "#0056b3";
                e.target.style.background = selectedFile ? "#e8f5e8" : "#e6f3ff";
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = selectedFile ? "#28a745" : "#007bff";
                e.target.style.background = selectedFile ? "#f8fff9" : "#f8f9ff";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
              }}
            >
              <span style={{ fontSize: 18 }}>{selectedFile ? "📄" : "📁"}</span>
              <span style={{ 
                fontSize: 14, 
                fontWeight: selectedFile ? 600 : 500,
                color: selectedFile ? "#28a745" : "#007bff",
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                {selectedFile ? selectedFile.name : "Choose file..."}
              </span>
              <input
                id="fileInput"
                type="file"
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv,.xlsb"
                style={{ display: "none" }}
              />
            </div>

            {/* Upload Button */}
            <button
              onClick={selectedFile ? handleUpload : () => document.getElementById("fileInput").click()}
              disabled={uploading || (!selectedPanel && selectedFile)}
              style={{
                borderRadius: 8,
                padding: "12px",
                width: "48px",
                height: "48px",
                border: "none",
                fontSize: 18,
                fontWeight: 600,
                cursor: uploading || (!selectedPanel && selectedFile) ? "not-allowed" : "pointer",
                background: selectedFile ? 
                  "linear-gradient(135deg, #28a745 0%, #20c997 100%)" : 
                  "linear-gradient(135deg, #007bff 0%, #17a2b8 100%)",
                color: "#fff",
                boxShadow: selectedFile ? 
                  "0 4px 12px rgba(40, 167, 69, 0.3)" : 
                  "0 4px 12px rgba(0, 123, 255, 0.3)",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: uploading || (!selectedPanel && selectedFile) ? 0.6 : 1,
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (!uploading && (selectedPanel || !selectedFile)) {
                  e.target.style.transform = "scale(1.1) translateY(-2px)";
                  e.target.style.boxShadow = selectedFile ? 
                    "0 6px 16px rgba(40, 167, 69, 0.4)" : 
                    "0 6px 16px rgba(0, 123, 255, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = selectedFile ? 
                  "0 4px 12px rgba(40, 167, 69, 0.3)" : 
                  "0 4px 12px rgba(0, 123, 255, 0.3)";
              }}
              title={selectedFile ? "Upload File" : "Select File"}
            >
              {uploading ? "⏳" : selectedFile ? "📤" : "📂"}
            </button>
          </div>
          
          {error && (
            <div style={{ 
              marginTop: 16, 
              background: "#fdf2f2", 
              borderRadius: 8, 
              padding: 16, 
              color: "#991b1b",
              border: "1px solid #fecaca",
              fontSize: 14,
              fontWeight: 500
            }}>
              ❌ {error}
            </div>
          )}
          
          {result && (
            <div style={{ 
              marginTop: 16, 
              background: result.status === "failed" ? "#fdf2f2" : "#eafaf1", 
              borderRadius: 8, 
              padding: 16, 
              color: result.status === "failed" ? "#991b1b" : "#145a32",
              border: `1px solid ${result.status === "failed" ? "#fecaca" : "#bbf7d0"}`
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16 }}>
                {result.status === "failed" ? "❌ Upload Failed!" : "✅ File Uploaded Successfully!"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 14 }}>
                <div><strong>Panel:</strong> {result.panelname}</div>
                <div><strong>File:</strong> {result.docname}</div>
                <div><strong>Records:</strong> {result.total_records}</div>
                <div><strong>Status:</strong> 
                  <span style={{ 
                    color: getStatusColor(result.status),
                    fontWeight: 600,
                    marginLeft: 4
                  }}>
                    {result.status}
                  </span>
                </div>
                <div><strong>Uploaded By:</strong> {result.uploadedby}</div>
                <div><strong>Timestamp:</strong> {parseISTTimestamp(result.timestamp)}</div>
              </div>
              {result.error && (
                <div style={{ marginTop: 12, padding: 8, background: "rgba(0,0,0,0.05)", borderRadius: 4 }}>
                  <strong>Error:</strong> {result.error}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Upload History Section */}
        <div style={{ 
          background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)", 
          borderRadius: 12, 
          padding: 24, 
          border: "1px solid #dee2e6",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          <h3 style={{ 
            color: "#495057", 
            marginBottom: 24, 
            fontSize: 18, 
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            📋 Panel Upload History
          </h3>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ 
              width: "100%", 
              borderCollapse: "collapse", 
              background: "#fff", 
              borderRadius: 8, 
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
            }}>
              <thead>
                <tr style={{ background: "#002e6e" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Panel</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>File Name</th>
                  <th style={{ padding: "12px 0px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Records</th>
                  <th style={{ padding: "12px 4px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Uploaded By</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Date</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ 
                      textAlign: "center", 
                      color: "#adb5bd", 
                      padding: 32,
                      fontSize: 14
                    }}>
                      📭 No uploads yet. Start by uploading panel data above.
                    </td>
                  </tr>
                ) : (
                  history.map((item, idx) => (
                    <React.Fragment key={item.docid || idx}>
                      <tr style={{ borderBottom: "1px solid #f1f3f5" }}>
                        <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500, color: "#343a40" }}>
                          {item.status && item.status.toLowerCase() === "failed" ? (
                            <span style={{ color: "#6c757d" }}>
                          {item.panelname}
                            </span>
                          ) : (
                            <span 
                              onClick={() => handlePanelNameClick(item.panelname)}
                              style={{
                                color: "#007bff",
                                cursor: "pointer",
                                textDecoration: "underline",
                                fontWeight: 600,
                                transition: "color 0.2s ease"
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.color = "#0056b3";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.color = "#007bff";
                              }}
                            >
                              {item.panelname}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057" }}>
                          {item.docname}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057" }}>
                          <span style={{ 
                            background: "#e3f2fd", 
                            color: "#1976d2", 
                            padding: "4px 8px", 
                            borderRadius: 4,
                            fontWeight: 600,
                            fontSize: 12
                          }}>
                            {item.total_records}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057" }}>
                          {item.uploadedby}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057" }}>
                          {parseISTTimestamp(item.timestamp)}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 14 }}>
                          <span style={{ 
                            color: getStatusColor(item.status), 
                            fontWeight: 600,
                            padding: "4px 8px",
                            borderRadius: 4,
                            background: item.status === "complete" || item.status === "uploaded" ? "#e8f5e8" : 
                                       item.status === "failed" ? "#ffeaea" : "#f8f9fa"
                          }}>
                            {getDisplayStatus(item)}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 14 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {/* Reconciliation Button */}
                            <button
                              onClick={() => handleReconcile(item)}
                              disabled={loading[item.docid || item.doc_id] || !canStartReconciliation(item)}
                              style={{
                                width: "32px",
                                height: "32px",
                                border: "none",
                                borderRadius: "6px",
                                background: loading[item.docid || item.doc_id] ? "#6c757d" : 
                                           canStartReconciliation(item) ? "#007bff" : 
                                           getDisplayStatus(item) === "Recon Finished" ? "#28a745" : "#6c757d",
                                color: "#fff",
                                fontSize: "14px",
                                cursor: loading[item.docid || item.doc_id] || !canStartReconciliation(item) ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                                opacity: loading[item.docid || item.doc_id] || !canStartReconciliation(item) ? 0.6 : 1,
                                position: "relative"
                              }}
                              title={
                                loading[item.docid || item.doc_id] ? 
                                `Processing: ${currentStep[item.docid || item.doc_id] || "Starting..."}` :
                                canStartReconciliation(item) ? "Start Reconciliation" :
                                getDisplayStatus(item) === "Recon Finished" ? "Reconciliation Completed" :
                                "Reconciliation Not Available"
                              }
                              onMouseEnter={(e) => {
                                if (!loading[item.docid || item.doc_id] && canStartReconciliation(item)) {
                                  e.target.style.transform = "scale(1.1)";
                                  e.target.style.boxShadow = "0 2px 8px rgba(0,123,255,0.3)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "scale(1)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              {loading[item.docid || item.doc_id] ? "⏳" : 
                               canStartReconciliation(item) ? "🔄" :
                               getDisplayStatus(item) === "Recon Finished" ? "✅" : "🔄"}
                            </button>
                            
                            {/* Recategorization Button */}
                            <button
                              onClick={() => handleShowRecategorization(item.docid || item.doc_id)}
                              disabled={getDisplayStatus(item) !== "Recon Finished"}
                              style={{
                                width: "32px",
                                height: "32px",
                                border: "none",
                                borderRadius: "6px",
                                background: getDisplayStatus(item) === "Recon Finished" ? "#17a2b8" : "#6c757d",
                                color: "#fff",
                                fontSize: "14px",
                                cursor: getDisplayStatus(item) === "Recon Finished" ? "pointer" : "not-allowed",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                                opacity: getDisplayStatus(item) === "Recon Finished" ? 1 : 0.6,
                                position: "relative"
                              }}
                              title={
                                getDisplayStatus(item) === "Recon Finished" ? 
                                "User Recategorization" : 
                                "Recategorization Available After Reconciliation"
                              }
                              onMouseEnter={(e) => {
                                if (getDisplayStatus(item) === "Recon Finished") {
                                  e.target.style.transform = "scale(1.1)";
                                  e.target.style.boxShadow = "0 2px 8px rgba(23,162,184,0.3)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "scale(1)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              👥
                            </button>
                          </div>
                        </td>
                      </tr>
                      {reconResults[item.docid || item.doc_id] && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0 }}>
                            <div style={{ 
                              background: "#f8f9fa", 
                              padding: 20, 
                              borderTop: "1px solid #e9ecef"
                            }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                {/* User Categorization Results */}
                                <div style={{ 
                                  background: "#fff", 
                                  padding: 16, 
                                  borderRadius: 8, 
                                  border: "1px solid #e9ecef"
                                }}>
                                  <h4 style={{ 
                                    color: "#495057", 
                                    marginBottom: 12, 
                                    fontSize: 16, 
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8
                                  }}>
                                    👥 User Categorization
                                  </h4>
                                  <div style={{ 
                                    background: "#f8f9fa", 
                                    padding: 12, 
                                    borderRadius: 6, 
                                    fontSize: 13,
                                    fontFamily: "monospace"
                                  }}>
                                    {JSON.stringify(reconResults[item.docid || item.doc_id].categorization?.summary, null, 2)}
                                  </div>
                                </div>
                                
                                {/* HR Reconciliation Results */}
                                <div style={{ 
                                  background: "#fff", 
                                  padding: 16, 
                                  borderRadius: 8, 
                                  border: "1px solid #e9ecef"
                                }}>
                                  <h4 style={{ 
                                    color: "#495057", 
                                    marginBottom: 12, 
                                    fontSize: 16, 
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8
                                  }}>
                                    🏢 HR Reconciliation
                                  </h4>
                                  <div style={{ 
                                    background: "#f8f9fa", 
                                    padding: 12, 
                                    borderRadius: 6, 
                                    fontSize: 13,
                                    fontFamily: "monospace"
                                  }}>
                                    {JSON.stringify(reconResults[item.docid || item.doc_id].hr_data?.summary, null, 2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {/* Recategorization Interface */}
                      {showRecategorization[item.docid || item.doc_id] && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0 }}>
                            <div style={{ 
                              background: "#f8f9fa", 
                              padding: 20, 
                              borderTop: "1px solid #e9ecef"
                            }}>
                              <div style={{ 
                                background: "#fff", 
                                borderRadius: 8, 
                                padding: 20, 
                                border: "1px solid #e9ecef" 
                              }}>
                                <div style={{ marginBottom: 16 }}>
                                  <h4 style={{ 
                                    color: "#495057", 
                                    marginBottom: 8, 
                                    fontSize: 16, 
                                    fontWeight: 600 
                                  }}>
                                    📋 Recategorization Instructions
                                  </h4>
                                  <div style={{ 
                                    fontSize: 13, 
                                    color: "#6c757d", 
                                    background: "#f8f9fa",
                                    padding: 12,
                                    borderRadius: 6,
                                    border: "1px solid #e9ecef"
                                  }}>
                                    <strong>File Requirements:</strong>
                                    <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
                                      <li>Must contain a match column (email, user_email, domain, id, user_id, employee_id)</li>
                                      <li>Must contain a type column (type, user_type, status, category, final_status, classification)</li>
                                      <li>Match column values will be compared with panel data</li>
                                      <li>Type column values will be used as the new final_status</li>
                                    </ul>
                                  </div>
                                </div>
                                
                                <div style={{ 
                                  display: "flex", 
                                  alignItems: "center", 
                                  gap: 16, 
                                  marginBottom: 16 
                                }}>
                                  <input
                                    type="file"
                                    onChange={handleRecategorizationFileChange}
                                    accept=".xlsx,.xls,.csv"
                                    style={{
                                      flex: 1,
                                      padding: "10px",
                                      border: "2px solid #e9ecef",
                                      borderRadius: 6,
                                      fontSize: 14
                                    }}
                                  />
                                  <button
                                    onClick={() => handleUserRecategorization(item.panelname, item.docid || item.doc_id)}
                                    disabled={false} // recategorizationLoading[item.docid || item.doc_id] || !recategorizationFile
                                    style={{
                                      padding: "10px 20px",
                                      background: "#17a2b8",
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: 6,
                                      fontSize: 14,
                                      fontWeight: 600,
                                      cursor: false ? "not-allowed" : "pointer",
                                      opacity: false ? 0.6 : 1,
                                      minWidth: 120
                                    }}
                                  >
                                    Recategorize
                                  </button>
                                </div>
                              </div>
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
      </div>

      {/* Panel Data Popup */}
      {/* This section is no longer needed as panel data is opened in a new tab */}

      {/* CSS for loading animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
} 