import React, { useState, useEffect } from "react";
import { getUserWiseSummary } from "./api";

export default function UserSummary() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState("email_id");
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    loadUserSummary();
  }, []);

  const loadUserSummary = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getUserWiseSummary();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (err) {
      setError(err.message || "Failed to load user summary");
    } finally {
      setLoading(false);
    }
  };

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtering function
  const handleFilter = () => {
    if (!filterField || !filterValue) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => {
      const fieldValue = user[filterField];
      if (!fieldValue) return false;
      return fieldValue.toString().toLowerCase().includes(filterValue.toLowerCase());
    });
    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  // Clear filter
  const clearFilter = () => {
    setFilterField("");
    setFilterValue("");
    setFilteredUsers(users);
    setCurrentPage(1);
  };

  // Sort users
  const getSortedUsers = () => {
    return [...filteredUsers].sort((a, b) => {
      let aVal = a[sortField] || "";
      let bVal = b[sortField] || "";
      
      // Convert to string for comparison
      aVal = aVal.toString().toLowerCase();
      bVal = bVal.toString().toLowerCase();
      
      if (sortDirection === "asc") {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
  };

  // Pagination
  const totalPages = Math.ceil(getSortedUsers().length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentUsers = getSortedUsers().slice(startIndex, endIndex);

  // CSV Download
  const downloadCSV = () => {
    const headers = ["email_id", "reconid", "recon_month", "panel_name", "initial_status", "final_status"];
    const csvContent = [
      headers.join(","),
      ...getSortedUsers().map(user => 
        headers.map(header => {
          const value = user[header] || "";
          // Escape commas and quotes in CSV
          return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user_summary_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: "40px auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: 18, color: "#6c757d" }}>Loading user summary...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 1200, margin: "40px auto", padding: "0 20px" }}>
        <div style={{ 
          background: "#f8d7da", 
          color: "#721c24", 
          padding: "16px", 
          borderRadius: "6px", 
          border: "1px solid #f5c6cb",
          textAlign: "center"
        }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "40px auto", padding: "0 20px" }}>
      <div style={{ 
        background: "#fff", 
        borderRadius: "8px", 
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)", 
        padding: "24px",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ color: "#343a40", margin: 0 }}>📊 User Summary</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={downloadCSV}
              style={{
                padding: "6px 12px",
                background: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
              title="Download Data"
            >
              📥 Download
            </button>
            
            <button
              onClick={loadUserSummary}
              style={{
                padding: "6px 12px",
                background: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
              title="Refresh Data"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        
        {/* Filter Controls */}
        <div style={{ 
          background: "#f8f9fa", 
          padding: "16px", 
          borderRadius: "6px", 
          marginBottom: "16px",
          border: "1px solid #dee2e6"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: "#495057" }}>Filter by:</label>
              <select
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                style={{
                  padding: "6px 8px",
                  border: "1px solid #ced4da",
                  borderRadius: 4,
                  fontSize: 14,
                  minWidth: "120px"
                }}
              >
                <option value="">Select field</option>
                <option value="email_id">Email ID</option>
                <option value="panel_name">Panel Name</option>
                <option value="recon_id">Recon ID</option>
                <option value="recon_month">Recon Month</option>
                <option value="initial_status">Initial Status</option>
                <option value="final_status">Final Status</option>
              </select>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: "#495057" }}>Value:</label>
              <input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="Enter filter value..."
                style={{
                  padding: "6px 8px",
                  border: "1px solid #ced4da",
                  borderRadius: 4,
                  fontSize: 14,
                  minWidth: "150px"
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleFilter()}
              />
            </div>
            
            <button
              onClick={handleFilter}
              style={{
                padding: "6px 12px",
                background: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              🔍 Apply Filter
            </button>
            
            {filterField && (
              <button
                onClick={clearFilter}
                style={{
                  padding: "6px 12px",
                  background: "#6c757d",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                ❌ Clear Filter
              </button>
            )}
          </div>
        </div>
        
        {/* Filter Info */}
        {filterField && (
          <div style={{ 
            background: "#e7f3ff", 
            padding: "8px 12px", 
            borderRadius: 4, 
            marginBottom: 16,
            fontSize: 14,
            color: "#0056b3"
          }}>
            🔍 Filtered: {filterField} = "{filterValue}" ({filteredUsers.length} users)
          </div>
        )}

        {/* User Data Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <thead>
              <tr style={{ background: "#002e6e" }}>
                <th 
                  style={{ 
                    padding: "12px 8px", 
                    textAlign: "left",  
                    fontWeight: 600, 
                    fontSize: 14,
                    cursor: "pointer",
                    borderBottom: "2px solid #dee2e6",
                    color: "#ffffff"
                  }}
                  onClick={() => handleSort("email_id")}
                >
                  Email ID {sortField === "email_id" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  style={{ 
                    padding: "12px 8px", 
                    textAlign: "left", 
                    fontWeight: 600, 
                    fontSize: 14, 
                    cursor: "pointer",
                    borderBottom: "2px solid #dee2e6",
                    color: "#ffffff"
                  }}
                  onClick={() => handleSort("panel_name")}
                >
                  Panel Name {sortField === "panel_name" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  style={{ 
                    padding: "12px 8px", 
                    textAlign: "left", 
                    fontWeight: 600, 
                    fontSize: 14,
                    cursor: "pointer",
                    borderBottom: "2px solid #dee2e6",
                    color: "#ffffff"
                  }}
                  onClick={() => handleSort("recon_id")}
                >
                  Recon ID {sortField === "recon_id" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  style={{ 
                    padding: "12px 8px", 
                    textAlign: "left", 
                    fontWeight: 600, 
                    fontSize: 14,
                    cursor: "pointer",
                    borderBottom: "2px solid #dee2e6",
                    color: "#ffffff"
                  }}
                  onClick={() => handleSort("recon_month")}
                >
                  Recon Month {sortField === "recon_month" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  style={{ 
                    padding: "12px 8px", 
                    textAlign: "left", 
                    fontWeight: 600, 
                    fontSize: 14,
                    cursor: "pointer",
                    borderBottom: "2px solid #dee2e6",
                    color: "#ffffff"
                  }}
                  onClick={() => handleSort("initial_status")}
                >
                  Initial Status {sortField === "initial_status" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  style={{ 
                    padding: "12px 8px", 
                    textAlign: "left", 
                    fontWeight: 600, 
                    fontSize: 14,
                    cursor: "pointer",
                    borderBottom: "2px solid #dee2e6",
                    color: "#ffffff"
                  }}
                  onClick={() => handleSort("final_status")}
                >
                  Final Status {sortField === "final_status" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#adb5bd", padding: 32 }}>
                    {filteredUsers.length === 0 ? "No user data available." : "No users match the current filter."}
                  </td>
                </tr>
              ) : (
                currentUsers.map((user, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f3f5" }}>
                    <td style={{ padding: "12px 8px", fontSize: 14, fontWeight: 500 }}>
                      {user.email_id}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: 14 }}>
                      {user.panel_name}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: 14, fontFamily: "monospace" }}>
                      {user.recon_id || "-"}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: 14 }}>
                      {user.recon_month || "-"}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: 14 }}>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: 12, 
                        fontSize: 12, 
                        fontWeight: 600,
                        background: getStatusColor(user.initial_status),
                        color: "#fff"
                      }}>
                        {user.initial_status || "unknown"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: 14 }}>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: 12, 
                        fontSize: 12, 
                        fontWeight: 600,
                        background: getStatusColor(user.final_status),
                        color: "#fff"
                      }}>
                        {user.final_status || "unknown"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
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
          borderTop: "1px solid #dee2e6"
        }}>
          <div style={{ color: "#495057", fontSize: 14 }}>
            Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredUsers.length)} of {filteredUsers.length} users
          </div>
          
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              style={{
                padding: "6px 12px",
                border: "1px solid #ced4da",
                borderRadius: 4,
                background: currentPage === 1 ? "#f8f9fa" : "#fff",
                color: currentPage === 1 ? "#adb5bd" : "#495057",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: 14
              }}
            >
              First
            </button>
            
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: "6px 12px",
                border: "1px solid #ced4da",
                borderRadius: 4,
                background: currentPage === 1 ? "#f8f9fa" : "#fff",
                color: currentPage === 1 ? "#adb5bd" : "#495057",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: 14
              }}
            >
              Previous
            </button>
            
            <span style={{ padding: "6px 12px", fontSize: 14, color: "#495057" }}>
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: "6px 12px",
                border: "1px solid #ced4da",
                borderRadius: 4,
                background: currentPage === totalPages ? "#f8f9fa" : "#fff",
                color: currentPage === totalPages ? "#adb5bd" : "#495057",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: 14
              }}
            >
              Next
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              style={{
                padding: "6px 12px",
                border: "1px solid #ced4da",
                borderRadius: 4,
                background: currentPage === totalPages ? "#f8f9fa" : "#fff",
                color: currentPage === totalPages ? "#adb5bd" : "#495057",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: 14
              }}
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get status color
function getStatusColor(status) {
  if (!status) return "#6c757d";
  
  const statusLower = status.toLowerCase();
  if (statusLower.includes("active") || statusLower.includes("service")) {
    return "#28a745";
  } else if (statusLower.includes("inactive") || statusLower.includes("not found")) {
    return "#dc3545";
  } else if (statusLower.includes("internal")) {
    return "#007bff";
  } else if (statusLower.includes("thirdparty")) {
    return "#ffc107";
  } else {
    return "#6c757d";
  }
}