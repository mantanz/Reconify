import React, { useState, useEffect } from "react";
import { getReconSummaries, getReconSummaryDetail, getPanelDetails } from "./api";

export default function Reconsummary() {
  const [summaries, setSummaries] = useState([]);
  const [details, setDetails] = useState({});
  const [showDetails, setShowDetails] = useState({});
  const [panelDetails, setPanelDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filteredRows, setFilteredRows] = useState(null);
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [showPanelDetails, setShowPanelDetails] = useState(false);

  useEffect(() => {
    getReconSummaries().then(setSummaries);
  }, []);

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

  const getStatusColor = (status) => {
    if (!status) return "#6c757d"; // Default gray
    
    const statusLower = status.toLowerCase();
    
    // Success statuses
    if (statusLower === "complete" || statusLower === "uploaded" || statusLower === "ready to recon" || statusLower === "recon finished") return "#27ae60"; // Green
    
    // Failed statuses
    if (statusLower === "failed") return "#e74c3c"; // Red
    
    return "#6c757d"; // Default gray
  };

  const getDisplayStatus = (item) => {
    if (!item.status) return "Unknown";
    
    const statusLower = item.status.toLowerCase();
    
    if (statusLower === "failed") return "Failed";
    if (statusLower === "complete") return "Recon Finished";
    if (statusLower === "uploaded") return "Ready to Recon";
    
    return item.status;
  };

  // Helper function to parse IST timestamp format (dd-mm-yyyy hh:mm:ss)
  const parseISTTimestamp = (timestamp) => {
    if (!timestamp) return "Invalid Date";
    
    try {
      // Check if it's already a valid date (for backward compatibility)
      const jsDate = new Date(timestamp);
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toLocaleDateString();
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
      
      const parsedDate = new Date(year, month, day, hour, minute, second);
      return parsedDate.toLocaleDateString();
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
      {/* Reconciliation Summary Section */}
      <div style={{ 
        background: "#fff", 
        borderRadius: 12, 
        padding: 32, 
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)", 
        marginBottom: 24,
        border: "1px solid rgba(0,0,0,0.05)"
      }}>
        <h3 style={{ 
          color: "#343a40", 
          marginBottom: 24, 
          fontSize: 20, 
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          📊 Reconciliation Summary
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
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Reconciliation ID</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Month</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Upload Date</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Performed By</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ 
                    textAlign: "center", 
                    color: "#adb5bd", 
                    padding: 32,
                    fontSize: 14
                  }}>
                    📭 No reconciliations yet. Start reconciliation from the upload history in the Reconciliation tab.
                  </td>
                </tr>
              ) : (
                summaries.map(row => (
                  <React.Fragment key={row.recon_id}>
                    <tr style={{ borderBottom: "1px solid #f1f3f5" }}>
                      <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500, color: "#343a40" }}>
                        {row.panelname}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057", fontFamily: "monospace" }}>
                        {row.recon_id}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057" }}>
                        {row.recon_month}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14 }}>
                        <span style={{ 
                          color: getStatusColor(row.status), 
                          fontWeight: 600,
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: row.status === "complete" || row.status === "uploaded" ? "#e8f5e8" : 
                                     row.status === "failed" ? "#ffeaea" : "#f8f9fa"
                        }}>
                          {getDisplayStatus(row)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057" }}>
                        {row.upload_date ? parseISTTimestamp(row.upload_date) : "-"}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057" }}>
                        {row.performed_by || "-"}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14 }}>
                        {row.error ? (
                          <span style={{ 
                            color: "#e74c3c", 
                            fontSize: 12,
                            padding: "4px 8px",
                            background: "#ffeaea",
                            borderRadius: 4
                          }}>
                            ⚠️ {row.error}
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleViewDetails(row.recon_id)}
                            style={{
                              padding: "8px 16px",
                              background: "#007bff",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = "#0056b3";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = "#007bff";
                            }}
                          >
                            {showDetails[row.recon_id] ? "👁️ Hide Details" : "👁️ View Details"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {showDetails[row.recon_id] && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div style={{ 
                            background: "#f8f9fa", 
                            padding: 24, 
                            borderTop: "1px solid #e9ecef"
                          }}>
                            {details[row.recon_id] ? (
                              <div>
                                {/* Basic Info Cards */}
                                <div style={{ marginBottom: 24 }}>
                                  <h4 style={{ 
                                    color: "#495057", 
                                    marginBottom: 16, 
                                    fontSize: 18, 
                                    fontWeight: 600 
                                  }}>
                                    📋 Reconciliation Information
                                  </h4>
                                  <div style={{ 
                                    display: "grid", 
                                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                                    gap: 12 
                                  }}>
                                    <div style={{ 
                                      background: "#fff", 
                                      padding: 16, 
                                      borderRadius: 8, 
                                      border: "1px solid #e9ecef",
                                      textAlign: "center"
                                    }}>
                                      <div style={{ fontSize: 12, color: "#6c757d", marginBottom: 4 }}>Panel Name</div>
                                      <div style={{ fontSize: 16, fontWeight: 600, color: "#343a40" }}>
                                        {details[row.recon_id].panelname || "N/A"}
                                      </div>
                                    </div>
                                    <div style={{ 
                                      background: "#fff", 
                                      padding: 16, 
                                      borderRadius: 8, 
                                      border: "1px solid #e9ecef",
                                      textAlign: "center"
                                    }}>
                                      <div style={{ fontSize: 12, color: "#6c757d", marginBottom: 4 }}>SOT Type</div>
                                      <div style={{ fontSize: 16, fontWeight: 600, color: "#343a40" }}>
                                        {details[row.recon_id].sot_type || "N/A"}
                                      </div>
                                    </div>
                                    <div style={{ 
                                      background: "#fff", 
                                      padding: 16, 
                                      borderRadius: 8, 
                                      border: "1px solid #e9ecef",
                                      textAlign: "center"
                                    }}>
                                      <div style={{ fontSize: 12, color: "#6c757d", marginBottom: 4 }}>Status</div>
                                      <div style={{ 
                                        fontSize: 16, 
                                        fontWeight: 600,
                                        color: getStatusColor(details[row.recon_id].status)
                                      }}>
                                        {details[row.recon_id].status || "N/A"}
                                      </div>
                                    </div>
                                    <div style={{ 
                                      background: "#fff", 
                                      padding: 16, 
                                      borderRadius: 8, 
                                      border: "1px solid #e9ecef",
                                      textAlign: "center"
                                    }}>
                                      <div style={{ fontSize: 12, color: "#6c757d", marginBottom: 4 }}>Performed By</div>
                                      <div style={{ fontSize: 16, fontWeight: 600, color: "#343a40" }}>
                                        {details[row.recon_id].performed_by || "N/A"}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Total Users Overview */}
                                {details[row.recon_id].summary && details[row.recon_id].summary.total_panel_users && (
                                  <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ 
                                      color: "#495057", 
                                      marginBottom: 16, 
                                      fontSize: 18, 
                                      fontWeight: 600 
                                    }}>
                                      👥 Panel Overview
                                    </h4>
                                    <div style={{ 
                                      background: "#fff", 
                                      padding: 24, 
                                      borderRadius: 8, 
                                      border: "1px solid #e9ecef",
                                      textAlign: "center"
                                    }}>
                                      <div style={{ 
                                        fontSize: 14, 
                                        color: "#6c757d", 
                                        textTransform: "uppercase",
                                        fontWeight: 600,
                                        marginBottom: 8
                                      }}>
                                        Total Panel Users
                                      </div>
                                      <div style={{ 
                                        fontSize: 48, 
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
                                  <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ 
                                      color: "#495057", 
                                      marginBottom: 16, 
                                      fontSize: 18, 
                                      fontWeight: 600 
                                    }}>
                                      📊 Reconciliation Results
                                    </h4>
                                    <div style={{ 
                                      display: "grid", 
                                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
                                      gap: 12 
                                    }}>
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
                                            padding: 16, 
                                            borderRadius: 8, 
                                            border: "1px solid #e9ecef",
                                            textAlign: "center"
                                          }}>
                                            <div style={{ 
                                              fontSize: 12, 
                                              color: "#6c757d", 
                                              textTransform: "uppercase",
                                              fontWeight: 600,
                                              marginBottom: 8
                                            }}>
                                              {key.replace(/_/g, ' ')}
                                            </div>
                                            <div style={{ 
                                              fontSize: 24, 
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

                                {/* Panel Details Section */}
                                {details[row.recon_id].panelname && (
                                  <div style={{ marginBottom: 24 }}>
                                    <div style={{ 
                                      display: "flex", 
                                      justifyContent: "space-between", 
                                      alignItems: "center", 
                                      marginBottom: 16 
                                    }}>
                                      <h4 style={{ 
                                        color: "#495057", 
                                        fontSize: 18, 
                                        fontWeight: 600,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8
                                      }}>
                                        📋 Panel Details
                                      </h4>
                                      <button
                                        onClick={() => setShowPanelDetails(!showPanelDetails)}
                                        style={{
                                          padding: "8px 16px",
                                          background: "#007bff",
                                          color: "#fff",
                                          border: "none",
                                          borderRadius: 6,
                                          fontSize: 12,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                          transition: "all 0.2s ease"
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.background = "#0056b3";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.background = "#007bff";
                                        }}
                                      >
                                        {showPanelDetails ? "📋 Hide Panel Data" : "📋 View Details"}
                                      </button>
                                    </div>
                                    
                                    {showPanelDetails && panelDetails && panelDetails.panel_name === details[row.recon_id].panelname ? (
                                      <div style={{ 
                                        background: "#fff", 
                                        borderRadius: 8, 
                                        padding: 20, 
                                        border: "1px solid #e9ecef" 
                                      }}>
                                        {/* Basic Statistics */}
                                        <div style={{ marginBottom: 20 }}>
                                          <h5 style={{ 
                                            color: "#495057", 
                                            marginBottom: 12, 
                                            fontSize: 16, 
                                            fontWeight: 600 
                                          }}>
                                            📊 Panel Statistics
                                          </h5>
                                          <div style={{ 
                                            display: "grid", 
                                            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
                                            gap: 12 
                                          }}>
                                            <div style={{ 
                                              background: "#f8f9fa", 
                                              padding: 16, 
                                              borderRadius: 8, 
                                              textAlign: "center",
                                              border: "1px solid #e9ecef"
                                            }}>
                                              <div style={{ fontSize: 12, color: "#6c757d", marginBottom: 4 }}>Total Rows</div>
                                              <div style={{ fontSize: 24, fontWeight: 700, color: "#007bff" }}>
                                                {panelDetails.rows ? panelDetails.rows.length : 0}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Status Distribution */}
                                        {panelDetails.rows && panelDetails.rows.length > 0 && (
                                          <div style={{ marginBottom: 20 }}>
                                            <h5 style={{ 
                                              color: "#495057", 
                                              marginBottom: 12, 
                                              fontSize: 16, 
                                              fontWeight: 600 
                                            }}>
                                              📈 Status Distribution
                                            </h5>
                                            <div style={{ 
                                              display: "grid", 
                                              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", 
                                              gap: 8 
                                            }}>
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
                                                    padding: 12, 
                                                    borderRadius: 8, 
                                                    textAlign: "center",
                                                    border: "1px solid #dee2e6"
                                                  }}>
                                                    <div style={{ fontWeight: 600, fontSize: 12, color: "#495057" }}>{status}</div>
                                                    <div style={{ fontSize: 18, color: "#007bff", fontWeight: 700 }}>{count}</div>
                                                  </div>
                                                ));
                                              })()}
                                            </div>
                                          </div>
                                        )}

                                        {/* Complete Panel Data with Pagination */}
                                        {panelDetails.rows && panelDetails.rows.length > 0 && (
                                          <div>
                                            <h5 style={{ 
                                              color: "#495057", 
                                              marginBottom: 12, 
                                              fontSize: 16, 
                                              fontWeight: 600 
                                            }}>
                                              📋 Panel Data ({filteredRows ? filteredRows.length : panelDetails.rows.length} total rows)
                                              {filteredRows && (
                                                <span style={{ 
                                                  color: "#17a2b8", 
                                                  fontSize: 13, 
                                                  marginLeft: 8,
                                                  fontWeight: "normal"
                                                }}>
                                                  (Filtered: {filterField} = "{filterValue}")
                                                </span>
                                              )}
                                            </h5>
                                            
                                            {/* Action Buttons */}
                                            <div style={{ 
                                              marginBottom: 16, 
                                              display: "flex", 
                                              justifyContent: "space-between", 
                                              alignItems: "center" 
                                            }}>
                                              {/* Rows per page selector */}
                                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <label style={{ fontSize: 13, color: "#495057" }}>Rows per page:</label>
                                                <select
                                                  value={rowsPerPage}
                                                  onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                                                  style={{
                                                    padding: "6px 12px",
                                                    border: "2px solid #e9ecef",
                                                    borderRadius: 6,
                                                    fontSize: 13,
                                                    background: "#fff",
                                                    color: "#495057"
                                                  }}
                                                >
                                                  <option value={5}>5</option>
                                                  <option value={10}>10</option>
                                                  <option value={25}>25</option>
                                                  <option value={50}>50</option>
                                                </select>
                                              </div>
                                              
                                              {/* Action Icons */}
                                              <div style={{ display: "flex", gap: 8 }}>
                                                <button
                                                  onClick={() => handleFilterData()}
                                                  style={{
                                                    padding: "8px 16px",
                                                    background: filteredRows ? "#ffc107" : "#17a2b8",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                    transition: "all 0.2s ease"
                                                  }}
                                                  title={filteredRows ? "Change Filter" : "Filter Data"}
                                                >
                                                  🔍 {filteredRows ? "Change Filter" : "Filter"}
                                                </button>
                                                
                                                {filteredRows && (
                                                  <button
                                                    onClick={clearFilter}
                                                    style={{
                                                      padding: "8px 16px",
                                                      background: "#dc3545",
                                                      color: "#fff",
                                                      border: "none",
                                                      borderRadius: 6,
                                                      fontSize: 12,
                                                      fontWeight: 600,
                                                      cursor: "pointer",
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: 6,
                                                      transition: "all 0.2s ease"
                                                    }}
                                                    title="Clear Filter"
                                                  >
                                                    ❌ Clear
                                                  </button>
                                                )}
                                                
                                                <button
                                                  onClick={() => handleDownloadData()}
                                                  style={{
                                                    padding: "8px 16px",
                                                    background: "#28a745",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                    transition: "all 0.2s ease"
                                                  }}
                                                  title="Download Data"
                                                >
                                                  📥 Download
                                                </button>
                                              </div>
                                            </div>
                                            
                                            <div style={{ 
                                              overflowX: "auto", 
                                              maxHeight: 400,
                                              border: "1px solid #e9ecef",
                                              borderRadius: 8
                                            }}>
                                              <table style={{ 
                                                width: "100%", 
                                                borderCollapse: "collapse", 
                                                fontSize: 12 
                                              }}>
                                                <thead>
                                                  <tr style={{ background: "#f8f9fa" }}>
                                                    {Object.keys(panelDetails.rows[0]).map(header => (
                                                      <th key={header} style={{ 
                                                        padding: "8px 12px", 
                                                        textAlign: "left", 
                                                        border: "1px solid #e9ecef",
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: "#495057"
                                                      }}>
                                                        {header}
                                                      </th>
                                                    ))}
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {getCurrentPageData().map((row, idx) => (
                                                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                                                      {Object.keys(panelDetails.rows[0]).map(header => (
                                                        <td key={header} style={{ 
                                                          padding: "8px 12px", 
                                                          border: "1px solid #e9ecef", 
                                                          maxWidth: 120, 
                                                          overflow: "hidden", 
                                                          textOverflow: "ellipsis",
                                                          fontSize: 12,
                                                          color: "#495057"
                                                        }}>
                                                          {row[header] || ""}
                                                        </td>
                                                      ))}
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                            
                                            {/* Pagination Controls */}
                                            <div style={{ 
                                              marginTop: 16, 
                                              display: "flex", 
                                              justifyContent: "space-between", 
                                              alignItems: "center",
                                              padding: "12px 0",
                                              borderTop: "1px solid #e9ecef",
                                              fontSize: 13
                                            }}>
                                              <div style={{ color: "#495057" }}>
                                                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, (filteredRows ? filteredRows.length : panelDetails.rows.length))} of {filteredRows ? filteredRows.length : panelDetails.rows.length} rows
                                              </div>
                                              
                                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                <button
                                                  onClick={() => handlePageChange(1)}
                                                  disabled={currentPage === 1}
                                                  style={{
                                                    padding: "6px 12px",
                                                    border: "1px solid #e9ecef",
                                                    borderRadius: 6,
                                                    background: currentPage === 1 ? "#f8f9fa" : "#fff",
                                                    color: currentPage === 1 ? "#adb5bd" : "#495057",
                                                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    transition: "all 0.2s ease"
                                                  }}
                                                >
                                                  First
                                                </button>
                                                
                                                <button
                                                  onClick={() => handlePageChange(currentPage - 1)}
                                                  disabled={currentPage === 1}
                                                  style={{
                                                    padding: "6px 12px",
                                                    border: "1px solid #e9ecef",
                                                    borderRadius: 6,
                                                    background: currentPage === 1 ? "#f8f9fa" : "#fff",
                                                    color: currentPage === 1 ? "#adb5bd" : "#495057",
                                                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    transition: "all 0.2s ease"
                                                  }}
                                                >
                                                  Prev
                                                </button>
                                                
                                                <span style={{ 
                                                  color: "#495057", 
                                                  padding: "0 12px", 
                                                  fontSize: 13,
                                                  fontWeight: 600
                                                }}>
                                                  {currentPage} of {getTotalPages()}
                                                </span>
                                                
                                                <button
                                                  onClick={() => handlePageChange(currentPage + 1)}
                                                  disabled={currentPage === getTotalPages()}
                                                  style={{
                                                    padding: "6px 12px",
                                                    border: "1px solid #e9ecef",
                                                    borderRadius: 6,
                                                    background: currentPage === getTotalPages() ? "#f8f9fa" : "#fff",
                                                    color: currentPage === getTotalPages() ? "#adb5bd" : "#495057",
                                                    cursor: currentPage === getTotalPages() ? "not-allowed" : "pointer",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    transition: "all 0.2s ease"
                                                  }}
                                                >
                                                  Next
                                                </button>
                                                
                                                <button
                                                  onClick={() => handlePageChange(getTotalPages())}
                                                  disabled={currentPage === getTotalPages()}
                                                  style={{
                                                    padding: "6px 12px",
                                                    border: "1px solid #e9ecef",
                                                    borderRadius: 6,
                                                    background: currentPage === getTotalPages() ? "#f8f9fa" : "#fff",
                                                    color: currentPage === getTotalPages() ? "#adb5bd" : "#495057",
                                                    cursor: currentPage === getTotalPages() ? "not-allowed" : "pointer",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    transition: "all 0.2s ease"
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
                                        borderRadius: 8, 
                                        padding: 20, 
                                        border: "1px solid #e9ecef",
                                        textAlign: "center",
                                        color: "#6c757d"
                                      }}>
                                        🔄 Loading panel details...
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Error Information */}
                                {details[row.recon_id].error && (
                                  <div style={{ 
                                    background: "#f8d7da", 
                                    color: "#721c24", 
                                    padding: 16, 
                                    borderRadius: 8, 
                                    border: "1px solid #f5c6cb",
                                    marginTop: 16
                                  }}>
                                    <strong>⚠️ Error:</strong> {details[row.recon_id].error}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ 
                                textAlign: "center", 
                                color: "#6c757d",
                                padding: 32
                              }}>
                                🔄 Loading reconciliation details...
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
    </div>
  );
} 