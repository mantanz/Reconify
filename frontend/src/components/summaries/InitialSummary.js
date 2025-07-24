import React, { useState, useEffect } from "react";
import { getInitialSummaries, getInitialSummaryDetail } from "../../utils/api";
import PanelDataTable from "../panels/PanelDataTable";

export default function InitialSummary({ 
  statusType = "initial",
  title = "Panel wise Reconciliation Summary - Initial & Final",
  showToggle = true
}) {
  const [summaries, setSummaries] = useState([]);
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [details, setDetails] = useState({});
  const [showDetails, setShowDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecon, setSelectedRecon] = useState(null);
  const [currentStatusType, setCurrentStatusType] = useState(statusType);

  useEffect(() => {
    setCurrentStatusType(statusType);
  }, [statusType]);

  // Handle data loading
  useEffect(() => {
    const isInitialLoad = summaries.length === 0 && dynamicColumns.length === 0;
    loadInitialSummaries(isInitialLoad); // Show loading only for initial load
  }, [currentStatusType]); // Re-run when currentStatusType changes

  const loadInitialSummaries = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const data = await getInitialSummaries(currentStatusType);
      setSummaries(data.summaries || []);
      setDynamicColumns(data.columns || []);
    } catch (error) {
      console.error("Error loading initial summaries:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleViewDetails = async (recon_id) => {
    if (!details[recon_id]) {
      try {
        const detail = await getInitialSummaryDetail(recon_id, currentStatusType);
        setDetails(d => ({ ...d, [recon_id]: detail }));
        setSelectedRecon(detail);
      } catch (error) {
        console.error("Error loading initial summary detail:", error);
        return;
      }
    } else {
      setSelectedRecon(details[recon_id]);
    }
    setShowModal(true);
  };

  const handleToggle = () => {
    setCurrentStatusType(prev => prev === "initial" ? "final" : "initial");
    // Clear cached details when switching
    setDetails({});
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRecon(null);
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

  // Helper function to capitalize first letter of each word
  const capitalizeFirstLetter = (str) => {
    if (!str) return str;
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  if (loading) {
    return (
      <div style={{ 
        maxWidth: 1200, 
        margin: "40px auto", 
        padding: "0 20px",
        minHeight: "400px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#6c757d"
      }}>
        <div>
          <div style={{ fontSize: 24, marginBottom: 16 }}>🔄</div>
          <div>Loading {currentStatusType === "final" ? "final" : "initial"} status summaries...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: 1200, 
      margin: "40px auto", 
      padding: "0 20px",
      minHeight: "400px" // Prevent layout shifts
    }}>
      {/* Initial Status Summary Section */}
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
          {title}
        </h3>
        
        {/* Enhanced Toggle Button */}
        {showToggle && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
            padding: "16px 20px",
            background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
            borderRadius: 12,
            border: "1px solid #dee2e6",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#495057"
              }}>
                📊 Status Type:
              </span>
            </div>
            
            <div style={{
              position: "relative",
              display: "flex",
              background: "#e9ecef",
              borderRadius: 8,
              padding: 3,
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)"
            }}>
              {/* Sliding Background */}
              <div style={{
                position: "absolute",
                top: 3,
                left: currentStatusType === "initial" ? 3 : "calc(50% + 3px)",
                width: "calc(50% - 3px)",
                height: "calc(100% - 6px)",
                background: "linear-gradient(135deg, #007bff 0%, #0056b3 100%)",
                borderRadius: 6,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 2px 4px rgba(0,123,255,0.3)"
              }} />
              
              <button
                onClick={handleToggle}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  color: currentStatusType === "initial" ? "#fff" : "#495057",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  minWidth: 90,
                  textAlign: "center",
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
                onMouseEnter={(e) => {
                  if (currentStatusType !== "initial") {
                    e.target.style.color = "#007bff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentStatusType !== "initial") {
                    e.target.style.color = "#495057";
                  }
                }}
              >
                <span style={{ fontSize: 12 }}>🔄</span>
                Initial
              </button>
              
              <button
                onClick={handleToggle}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  color: currentStatusType === "final" ? "#fff" : "#495057",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  minWidth: 90,
                  textAlign: "center",
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
                onMouseEnter={(e) => {
                  if (currentStatusType !== "final") {
                    e.target.style.color = "#007bff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentStatusType !== "final") {
                    e.target.style.color = "#495057";
                  }
                }}
              >
                <span style={{ fontSize: 12 }}>✅</span>
                Final
              </button>
            </div>
            
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              background: currentStatusType === "initial" ? "#e3f2fd" : "#e8f5e8",
              borderRadius: 6,
              border: `1px solid ${currentStatusType === "initial" ? "#bbdefb" : "#c8e6c9"}`
            }}>
              <span style={{
                fontSize: 12,
                color: currentStatusType === "initial" ? "#1976d2" : "#2e7d32",
                fontWeight: 500
              }}>
                {currentStatusType === "initial" ? "📊" : "✅"} 
                {currentStatusType === "initial" ? "Showing initial status data" : "Showing final status data"}
              </span>
            </div>
          </div>
        )}
        
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
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Total Users</th>
                {dynamicColumns.map(column => (
                  <th key={column} style={{ 
                    padding: "12px 16px", 
                    textAlign: "left", 
                    fontWeight: 600, 
                    fontSize: 14, 
                    color: "#ffffff"
                  }}>
                    {capitalizeFirstLetter(column)}
                  </th>
                ))}
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={4 + dynamicColumns.length + 1} style={{ 
                    textAlign: "center", 
                    color: "#adb5bd", 
                    padding: 32,
                    fontSize: 14
                  }}>
                    📭 No initial status summaries available. Complete reconciliations to see data.
                  </td>
                </tr>
              ) : (
                summaries.map(row => (
                  <React.Fragment key={row.recon_id}>
                    <tr style={{ borderBottom: "1px solid #f1f3f5" }}>
                      <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500, color: "#343a40" }}>
                        {row.panel_name}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057", fontFamily: "monospace" }}>
                        {row.recon_id}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057" }}>
                        {row.recon_month}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057", fontWeight: 600 }}>
                        {row.total_users}
                      </td>
                      {dynamicColumns.map(column => (
                        <td key={column} style={{ padding: "12px 16px", fontSize: 14, color: "#495057" }}>
                          {row.status_breakdown?.[column] || 0}
                        </td>
                      ))}
                      <td style={{ padding: "12px 16px", fontSize: 14 }}>
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
                          👁️ View Details
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Panel Details */}
      {showModal && selectedRecon && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            position: "relative"
          }}>
            {/* Close Button */}
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
                color: "#6c757d",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#f8f9fa";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "none";
              }}
            >
              ×
            </button>

            {/* Modal Header */}
            <div style={{ marginBottom: 20, paddingRight: 40 }}>
              <h3 style={{
                color: "#343a40",
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                📊 {currentStatusType === "final" ? "Final" : "Initial"} Status Details
              </h3>
              <p style={{
                color: "#6c757d",
                margin: "8px 0 0 0",
                fontSize: 14
              }}>
                Panel: <strong>{selectedRecon.panel_name}</strong> | 
                ID: <strong>{selectedRecon.recon_id}</strong> | 
                Total Users: <strong>{selectedRecon.total_users}</strong>
              </p>
            </div>

            {/* Panel Details */}
            {selectedRecon.panel_data && selectedRecon.panel_data.length > 0 ? (
              <PanelDataTable
                panelDetails={{
                  rows: selectedRecon.panel_data,
                  panel_name: selectedRecon.panel_name
                }}
                panelName={selectedRecon.panel_name}
                compact={false}
              />
            ) : (
              <div style={{
                background: "#f8f9fa",
                borderRadius: 8,
                padding: 32,
                textAlign: "center",
                color: "#6c757d",
                fontSize: 14
              }}>
                📭 No panel data available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 