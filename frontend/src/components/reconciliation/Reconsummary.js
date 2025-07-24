import React, { useState, useEffect } from "react";
import { getReconSummaries, getReconSummaryDetail, getPanelDetails } from "../../utils/api";
import PanelDataTable from "../panels/PanelDataTable";

export default function Reconsummary() {
  const [summaries, setSummaries] = useState([]);
  const [details, setDetails] = useState({});
  const [showDetails, setShowDetails] = useState({});
  const [panelDetails, setPanelDetails] = useState(null);
  const [showPanelDetails, setShowPanelDetails] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecon, setSelectedRecon] = useState(null);

  useEffect(() => {
    getReconSummaries().then(setSummaries);
  }, []);

  const handleViewDetails = async (recon_id) => {
    if (!details[recon_id]) {
      const detail = await getReconSummaryDetail(recon_id);
      setDetails(d => ({ ...d, [recon_id]: detail }));
      
      // Load panel details if panel name is available
      if (detail.panelname) {
        try {
          const panelDetail = await getPanelDetails(detail.panelname);
          setPanelDetails(panelDetail);
        } catch (error) {
          console.error("Failed to load panel details:", error);
        }
      }
    } else {
      // Use existing details
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
    
    // Set selected reconciliation and show modal
    setSelectedRecon(details[recon_id] || await getReconSummaryDetail(recon_id));
    setShowModal(true);
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

  // Helper function to format date from YYYY-MM-DD to dd-mm-yyyy
  const formatStartDate = (dateString) => {
    if (!dateString) return "-";
    
    try {
      // Parse YYYY-MM-DD format
      const [year, month, day] = dateString.split('-');
      if (year && month && day) {
        // Format as dd-mm-yyyy
        return `${day}-${month}-${year}`;
      }
      return dateString; // Return original if parsing fails
    } catch (error) {
      console.error("Error formatting start date:", dateString, error);
      return dateString; // Return original if formatting fails
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
        
        <div>
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
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Start Date</th>
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
                        {row.start_date ? formatStartDate(row.start_date) : "-"}
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
                            👁️ View Details
                          </button>
                        )}
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
                📊 Reconciliation Details
              </h3>
              <p style={{
                color: "#6c757d",
                margin: "8px 0 0 0",
                fontSize: 14
              }}>
                Panel: <strong>{selectedRecon.panelname}</strong> | 
                ID: <strong>{selectedRecon.recon_id}</strong> | 
                Date: <strong>{selectedRecon.start_date ? formatStartDate(selectedRecon.start_date) : "-"}</strong>
              </p>
            </div>

            {/* Panel Details */}
            {panelDetails && panelDetails.panel_name === selectedRecon.panelname ? (
              <PanelDataTable
                panelDetails={panelDetails}
                panelName={selectedRecon.panelname}
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
                🔄 Loading panel details...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 