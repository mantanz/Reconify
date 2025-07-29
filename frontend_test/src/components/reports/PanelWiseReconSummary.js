import React, { useState, useEffect } from "react";
import { getReconSummaries, getReconSummaryDetail, debugFinalStatus } from "../../services/api";

export default function PanelWiseReconSummary() {
  const [summaries, setSummaries] = useState([]);
  const [statusType, setStatusType] = useState("initial"); // "initial" or "final"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReconSummaries();
  }, []);

  const loadReconSummaries = async () => {
    setLoading(true);
    try {
      const data = await getReconSummaries();
      setSummaries(data || []);
    } catch (error) {
      console.error("Failed to load reconciliation summaries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debug function to check final_status values
  const handleDebugFinalStatus = async () => {
    if (summaries.length === 0) {
      alert("No reconciliation data available");
      return;
    }
    
    // Get the first panel name from summaries
    const panelName = summaries[0].panelname;
    try {
      const debugData = await debugFinalStatus(panelName);
      console.log("Debug Final Status Data:", debugData);
      alert(`Debug Data for ${panelName}:\n\nUnique Final Statuses: ${debugData.unique_final_statuses.join(', ')}\n\nFinal Status Counts: ${JSON.stringify(debugData.final_status_counts, null, 2)}`);
    } catch (error) {
      console.error("Debug failed:", error);
      alert(`Debug failed: ${error.message}`);
    }
  };

  // Refresh data when status type changes
  useEffect(() => {
    loadReconSummaries();
  }, [statusType]);

  // Color grading functions based on industry standards
  const getColorGrade = (value, field, total) => {
    const numValue = parseInt(value) || 0;
    const numTotal = parseInt(total) || 1;
    const percentage = (numValue / numTotal) * 100;

    switch (field) {
      case "total_users":
        return "#6f42c1"; // Purple - Fixed color for total users
      
      case "internal_users":
        return "#007bff"; // Blue - Fixed color for internal users
      
      case "other_users":
        return "#fd7e14"; // Orange - Fixed color for other users
      
      case "active":
        return "#28a745"; // Green - Fixed color for active users
      
      case "inactive":
        return "#ffc107"; // Yellow - Fixed color for inactive users
      
      case "not_found":
        return "#dc3545"; // Red - Fixed color for not found users
      
      // Dynamic final status fields - use percentage-based grading
      case "active-movement case":
      case "delay in exit clearance":
      case "incorrect email":
      case "movement case":
      case "service id":
      case "third party":
      case "zomato":
        if (numValue <= 5) return "#28a745"; // Green - Good
        if (numValue <= 10) return "#ffc107"; // Yellow - Warning
        return "#dc3545"; // Red - Poor
      
      default:
        // For any other dynamic fields, use percentage-based grading
        if (numValue <= 5) return "#28a745"; // Green - Good
        if (numValue <= 10) return "#ffc107"; // Yellow - Warning
        return "#dc3545"; // Red - Poor
    }
  };

  const getStatusColor = (status) => {
    if (!status) return "#6c757d";
    
    const statusLower = status.toLowerCase();
    if (statusLower === "complete" || statusLower === "uploaded" || statusLower === "ready to recon" || statusLower === "recon finished") return "#28a745";
    if (statusLower === "failed") return "#e74c3c";
    return "#6c757d";
  };

  const getDisplayStatus = (item) => {
    if (!item.status) return "Unknown";
    
    const statusLower = item.status.toLowerCase();
    if (statusLower === "failed") return "Failed";
    if (statusLower === "complete") return "Recon Finished";
    if (statusLower === "uploaded") return "Ready to Recon";
    
    return item.status;
  };

  // Transform summaries data to match the required format
  const transformSummaryData = (summary) => {
    const detail = summary.summary || {};
    
    return {
      panel: summary.panelname || "N/A",
      recon_id: summary.recon_id || "N/A",
      month: summary.recon_month || "N/A",
      total_users: detail.total_panel_users || 0,
      // Initial status data (current reconciliation results)
      internal_users: detail.internal_users || 0,
      other_users: detail.other_users || 0,
      active: detail.found_active || 0,
      inactive: detail.found_inactive || 0,
      not_found: detail.not_found || 0,
      // Dynamic final status fields (will be populated based on actual data)
      final_status_data: detail.final_status_data || {},
      service_id: summary.service_id || "N/A",
      status: summary.status,
      performed_by: summary.performed_by,
      upload_date: summary.upload_date
    };
  };

  const transformedData = summaries.map(transformSummaryData);

  // Get dynamic final status columns from the data
  const getDynamicFinalStatusColumns = () => {
    const allFinalStatusFields = new Set();
    
    transformedData.forEach(row => {
      if (row.final_status_data && typeof row.final_status_data === 'object') {
        Object.keys(row.final_status_data).forEach(field => {
          allFinalStatusFields.add(field);
        });
      }
    });
    
    return Array.from(allFinalStatusFields);
  };

  const dynamicFinalStatusColumns = getDynamicFinalStatusColumns();

  if (loading) {
    return (
      <div style={{ 
        maxWidth: 1200, 
        margin: "40px auto", 
        padding: "0 20px",
        textAlign: "center",
        color: "#6c757d"
      }}>
        🔄 Loading reconciliation data...
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: 1200, 
      margin: "40px auto", 
      padding: "0 20px"
    }}>
      {/* Panel-wise Reconciliation Summary Section */}
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
          fontSize: 24, 
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          📊 Panel-wise Reconciliation Summary - Initial & Final
        </h3>
        
        {/* Status Type Selector */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 16, 
          marginBottom: 24,
          padding: "16px 20px",
          background: "#f8f9fa",
          borderRadius: 8,
          border: "1px solid #e9ecef"
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 8,
            fontWeight: 600,
            color: "#495057"
          }}>
            📊 Status Type:
          </div>
          
          <button
            onClick={() => setStatusType("initial")}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: statusType === "initial" ? "#007bff" : "#fff",
              color: statusType === "initial" ? "#fff" : "#495057",
              border: statusType === "initial" ? "1px solid #007bff" : "1px solid #dee2e6"
            }}
          >
            🔄 Initial
          </button>
          
          <button
            onClick={() => setStatusType("final")}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: statusType === "final" ? "#007bff" : "#fff",
              color: statusType === "final" ? "#fff" : "#495057",
              border: statusType === "final" ? "1px solid #007bff" : "1px solid #dee2e6"
            }}
          >
            ✅ Final
          </button>
          
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 6,
            padding: "6px 12px",
            background: "#e7f3ff",
            borderRadius: 20,
            fontSize: 13,
            color: "#0056b3",
            fontWeight: 500
          }}>
            📊 Showing {statusType} status data
          </div>

          <button
            onClick={loadReconSummaries}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #dee2e6",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#fff",
              color: "#495057"
            }}
            title="Refresh data after recategorization"
          >
            🔄 Refresh
          </button>

          <button
            onClick={handleDebugFinalStatus}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #dc3545",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#fff",
              color: "#dc3545"
            }}
            title="Debug final_status values in database"
          >
            🐛 Debug
          </button>
        </div>
        
        {/* Reconciliation Summary Table */}
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
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Internal Users</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Other Users</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Active</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Inactive</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Not Found</th>
                {statusType === "final" && (
                  <>
                    {dynamicFinalStatusColumns.map((field, index) => (
                      <th key={index} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>
                        {field}
                      </th>
                    ))}
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Service Id</th>
                  </>
                )}
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {transformedData.length === 0 ? (
                <tr>
                  <td colSpan={statusType === "final" ? (10 + dynamicFinalStatusColumns.length) : 9} style={{ 
                    textAlign: "center", 
                    color: "#adb5bd", 
                    padding: 32,
                    fontSize: 14
                  }}>
                    📭 No reconciliation data available.
                  </td>
                </tr>
              ) : (
                transformedData.map((row, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #f1f3f5" }}>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500, color: "#343a40" }}>
                      {row.panel}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057", fontFamily: "monospace" }}>
                      {row.recon_id}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057" }}>
                      {row.month}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057", fontWeight: 600 }}>
                      <span style={{ 
                        color: getColorGrade(row.total_users, "total_users", row.total_users),
                        fontWeight: 600,
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: `${getColorGrade(row.total_users, "total_users", row.total_users)}15`
                      }}>
                        {row.total_users}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      <span style={{ 
                        color: getColorGrade(row.internal_users, "internal_users", row.total_users),
                        fontWeight: 600,
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: `${getColorGrade(row.internal_users, "internal_users", row.total_users)}15`
                      }}>
                        {row.internal_users}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      <span style={{ 
                        color: getColorGrade(row.other_users, "other_users", row.total_users),
                        fontWeight: 600,
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: `${getColorGrade(row.other_users, "other_users", row.total_users)}15`
                      }}>
                        {row.other_users}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      <span style={{ 
                        color: getColorGrade(row.active, "active", row.total_users),
                        fontWeight: 600,
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: `${getColorGrade(row.active, "active", row.total_users)}15`
                      }}>
                        {row.active}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      <span style={{ 
                        color: getColorGrade(row.inactive, "inactive", row.total_users),
                        fontWeight: 600,
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: `${getColorGrade(row.inactive, "inactive", row.total_users)}15`
                      }}>
                        {row.inactive}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      <span style={{ 
                        color: getColorGrade(row.not_found, "not_found", row.total_users),
                        fontWeight: 600,
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: `${getColorGrade(row.not_found, "not_found", row.total_users)}15`
                      }}>
                        {row.not_found}
                      </span>
                    </td>
                    {statusType === "final" && (
                      <>
                        {dynamicFinalStatusColumns.map((field, index) => (
                          <td key={index} style={{ padding: "12px 16px", fontSize: 14 }}>
                            <span style={{ 
                              color: getColorGrade(row.final_status_data[field], field),
                              fontWeight: 600,
                              padding: "4px 8px",
                              borderRadius: 4,
                              background: `${getColorGrade(row.final_status_data[field], field)}15`
                            }}>
                              {row.final_status_data[field]}
                            </span>
                          </td>
                        ))}
                        <td style={{ padding: "12px 16px", fontSize: 14, color: "#495057" }}>
                          {row.service_id}
                        </td>
                      </>
                    )}
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      <button 
                        style={{
                          padding: "8px 16px",
                          background: "#007bff",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 