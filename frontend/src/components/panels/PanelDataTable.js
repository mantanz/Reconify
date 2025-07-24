import React, { useState, useEffect } from "react";

export default function PanelDataTable({ panelDetails, panelName, compact = false }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [filteredRows, setFilteredRows] = useState([]);

  // Reset when panel details change
  useEffect(() => {
    setCurrentPage(1);
    setFilteredRows(panelDetails?.rows || []);
    setFilterField("");
    setFilterValue("");
    setSortField("");
    setSortDirection("asc");
  }, [panelDetails]);

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
      setFilteredRows(panelDetails?.rows || []);
      return;
    }

    const filtered = (panelDetails?.rows || []).filter(row => {
      const fieldValue = row[filterField];
      if (!fieldValue) return false;
      return fieldValue.toString().toLowerCase().includes(filterValue.toLowerCase());
    });
    setFilteredRows(filtered);
    setCurrentPage(1);
  };

  // Clear filter
  const clearFilter = () => {
    setFilterField("");
    setFilterValue("");
    setFilteredRows(panelDetails?.rows || []);
    setCurrentPage(1);
  };

  // Sort rows
  const getSortedRows = () => {
    return [...filteredRows].sort((a, b) => {
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
  const totalPages = Math.ceil(getSortedRows().length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = getSortedRows().slice(startIndex, endIndex);

  // CSV Download
  const downloadCSV = () => {
    if (!getSortedRows().length) {
      alert("No data available to download");
      return;
    }

    const headers = Object.keys(getSortedRows()[0]);
    const csvContent = [
      headers.join(","),
      ...getSortedRows().map(row => 
        headers.map(header => {
          const value = row[header] || "";
          // Escape commas and quotes in CSV
          return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${panelName}_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Get available fields for filtering
  const getAvailableFields = () => {
    if (!panelDetails?.rows || panelDetails.rows.length === 0) return [];
    return Object.keys(panelDetails.rows[0]);
  };

  if (!panelDetails || !panelDetails.rows) {
    return (
      <div style={{ 
        textAlign: "center", 
        color: "#6c757d",
        padding: 32,
        fontSize: 14
      }}>
        📭 No panel data available
      </div>
    );
  }

  const padding = compact ? "8px 6px" : "12px 8px";
  const fontSize = compact ? 12 : 14;

  return (
    <div>
      {/* Header with Download and Refresh */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "16px" 
      }}>
        <h4 style={{ 
          color: "#343a40", 
          margin: 0, 
          fontSize: compact ? 16 : 18,
          fontWeight: 600
        }}>
          📋 {panelName} Data ({panelDetails.rows.length} rows)
        </h4>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={downloadCSV}
            style={{
              padding: "6px 12px",
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
            title="Download Data"
          >
            📥 Download
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
            <label style={{ fontSize: 12, fontWeight: 600, color: "#495057" }}>Filter by:</label>
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              style={{
                padding: "6px 8px",
                border: "1px solid #ced4da",
                borderRadius: 4,
                fontSize: 12,
                minWidth: "120px"
              }}
            >
              <option value="">Select field</option>
              {getAvailableFields().map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#495057" }}>Value:</label>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder="Enter filter value..."
              style={{
                padding: "6px 8px",
                border: "1px solid #ced4da",
                borderRadius: 4,
                fontSize: 12,
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
              fontSize: 12,
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
                fontSize: 12,
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
          fontSize: 12,
          color: "#0056b3"
        }}>
          🔍 Filtered: {filterField} = "{filterValue}" ({filteredRows.length} rows)
        </div>
      )}

      {/* Data Table */}
      <div>
        <table style={{ 
          width: "100%", 
          borderCollapse: "collapse", 
          background: "#fff", 
          borderRadius: 8, 
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          fontSize: compact ? 10 : 12
        }}>
          <thead>
            <tr style={{ background: "#002e6e" }}>
              {getAvailableFields().map(field => (
                <th 
                  key={field}
                  style={{ 
                    padding, 
                    textAlign: "left", 
                    fontWeight: 600, 
                    fontSize,
                    cursor: "pointer",
                    borderBottom: "2px solid #dee2e6",
                    color: "#ffffff",
                    maxWidth: compact ? 100 : 120,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                  onClick={() => handleSort(field)}
                >
                  {field} {sortField === field && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={getAvailableFields().length} style={{ 
                  textAlign: "center", 
                  color: "#adb5bd", 
                  padding: 32,
                  fontSize: 12
                }}>
                  {filteredRows.length === 0 ? "No data available." : "No rows match the current filter."}
                </td>
              </tr>
            ) : (
              currentRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f1f3f5" }}>
                  {getAvailableFields().map(field => (
                    <td key={field} style={{ 
                      padding, 
                      fontSize,
                      fontFamily: field === "email" || field.includes("id") ? "monospace" : "inherit",
                      maxWidth: compact ? 100 : 120,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#495057"
                    }}>
                      {row[field] || "-"}
                    </td>
                  ))}
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
        <div style={{ color: "#495057", fontSize: 12 }}>
          Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredRows.length)} of {filteredRows.length} rows
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
              fontSize: 12
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
              fontSize: 12
            }}
          >
            Previous
          </button>
          
          <span style={{ padding: "6px 12px", fontSize: 12, color: "#495057" }}>
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
              fontSize: 12
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
              fontSize: 12
            }}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
} 