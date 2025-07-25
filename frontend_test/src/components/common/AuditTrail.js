import React, { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";

const API_BASE = "http://127.0.0.1:8000";

export default function AuditTrail() {
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState({
    action: "",
    user: "",
    status: "",
    date_from: "",
    date_to: ""
  });
  const [availableActions, setAvailableActions] = useState({});

  useEffect(() => {
    fetchAuditTrail();
    fetchAuditSummary();
    fetchAvailableActions();
  }, [filters]);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const queryParams = new URLSearchParams();
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.user) queryParams.append('user', filters.user);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.date_from) queryParams.append('date_from', filters.date_from);
      if (filters.date_to) queryParams.append('date_to', filters.date_to);
      
      const res = await fetch(`${API_BASE}/audit/trail?${queryParams}`, { headers });
      const data = await res.json();
      setAuditLog(data.audit_entries || []);
    } catch (err) {
      console.error("Failed to fetch audit trail:", err);
      setAuditLog([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditSummary = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const res = await fetch(`${API_BASE}/audit/summary`, { headers });
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch audit summary:", err);
    }
  };

  const fetchAvailableActions = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const res = await fetch(`${API_BASE}/audit/actions`, { headers });
      const data = await res.json();
      setAvailableActions(data.available_actions || {});
    } catch (err) {
      console.error("Failed to fetch available actions:", err);
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "-";
    try {
      const jsDate = new Date(timestamp);
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toLocaleDateString('en-GB').replace(/\//g, '-') + ', ' + jsDate.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        });
      }
      return timestamp;
    } catch (error) {
      return timestamp;
    }
  };

  const getStatusColor = (status) => {
    return status === "success" ? "#28a745" : "#dc3545";
  };

  const getActionDisplayName = (action) => {
    return availableActions[action] || action;
  };

  const clearFilters = () => {
    setFilters({
      action: "",
      user: "",
      status: "",
      date_from: "",
      date_to: ""
    });
  };

  const renderAuditDetails = (details, action) => {
    if (!details) return "No details available.";

    if (typeof details === 'string') {
      return details;
    }

    if (typeof details === 'object' && details !== null) {
      if (Array.isArray(details)) {
        return (
          <ul>
            {details.map((item, index) => (
              <li key={index}>{renderAuditDetails(item, action)}</li>
            ))}
          </ul>
        );
      }

      // Action-specific formatting
      const formatValue = (key, value) => {
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            return (
              <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  {value.map((item, index) => (
                    <li key={index} style={{ fontSize: 11 }}>
                      {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          } else {
            // For objects, show as formatted JSON
            return (
              <div style={{ 
                maxHeight: '200px', 
                overflow: 'auto',
                background: '#f8f9fa',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #dee2e6',
                fontFamily: 'monospace',
                fontSize: 11
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            );
          }
        }
        
        // Format file sizes
        if (key === 'records_processed' || key === 'total_users' || key === 'users_to_reconcile') {
          return <span style={{ fontWeight: 'bold', color: '#28a745' }}>{value.toLocaleString()}</span>;
        }
        
        // Format status values
        if (key === 'status' || key === 'user_status') {
          const statusColor = value === 'success' || value === 'active' ? '#28a745' : 
                             value === 'failed' || value === 'inactive' ? '#dc3545' : '#ffc107';
          return <span style={{ color: statusColor, fontWeight: 'bold' }}>{value}</span>;
        }
        
        // Format timestamps
        if (key.includes('timestamp') || key.includes('date')) {
          return <span style={{ fontFamily: 'monospace', color: '#6c757d' }}>{value}</span>;
        }
        
        // Format file names
        if (key.includes('file_name') || key.includes('doc_name')) {
          return <span style={{ fontFamily: 'monospace', color: '#007bff' }}>{value}</span>;
        }
        
        // Format IDs
        if (key.includes('id') || key.includes('doc_id') || key.includes('recon_id')) {
          return <span style={{ fontFamily: 'monospace', color: '#6f42c1' }}>{value}</span>;
        }
        
        // Format errors
        if (key === 'error') {
          return <span style={{ color: '#dc3545', fontStyle: 'italic' }}>{value}</span>;
        }
        
        // Format panel configuration specific fields
        if (key === 'panel_name') {
          return <span style={{ fontWeight: 'bold', color: '#007bff' }}>{value}</span>;
        }
        
        if (key === 'key_mapping') {
          return (
            <div style={{ 
              maxHeight: '150px', 
              overflow: 'auto',
              background: '#f8f9fa',
              padding: '6px',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
              fontFamily: 'monospace',
              fontSize: 10
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          );
        }
        
        // Default formatting
        return String(value);
      };

      return (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#e9ecef" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6", fontSize: 12 }}>Field</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6", fontSize: 12 }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(details).map(([key, value]) => (
              <tr key={key} style={{ borderBottom: "1px solid #f1f3f5" }}>
                <td style={{ 
                  padding: "8px 12px", 
                  fontSize: 12, 
                  color: "#495057",
                  fontWeight: 500,
                  textTransform: "capitalize"
                }}>
                  {key.replace(/_/g, ' ')}
                </td>
                <td style={{ padding: "8px 12px", fontSize: 12 }}>
                  {formatValue(key, value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return String(details);
  };

  return (
    <div style={{ 
      background: "#fff", 
      borderRadius: 12, 
      padding: 32, 
      boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)", 
      marginBottom: 16, 
      maxWidth: 1400, 
      margin: "40px auto",
      border: "1px solid rgba(0,0,0,0.05)"
    }}>
      <h2 style={{ textAlign: "center", color: "#343a40", marginBottom: 24 }}>Audit Trail</h2>
      
      {/* Summary Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: 16, 
        marginBottom: 24 
      }}>
        <div style={{ 
          background: "#e3f2fd", 
          padding: 16, 
          borderRadius: 8, 
          textAlign: "center",
          border: "1px solid #bbdefb"
        }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#1976d2" }}>
            {summary.total_entries || 0}
          </div>
          <div style={{ color: "#1976d2", fontSize: 14 }}>Total Entries</div>
        </div>
        
        <div style={{ 
          background: "#e8f5e8", 
          padding: 16, 
          borderRadius: 8, 
          textAlign: "center",
          border: "1px solid #c8e6c9"
        }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#2e7d32" }}>
            {summary.recent_activity_24h || 0}
          </div>
          <div style={{ color: "#2e7d32", fontSize: 14 }}>Last 24 Hours</div>
        </div>
        
        <div style={{ 
          background: "#fff3e0", 
          padding: 16, 
          borderRadius: 8, 
          textAlign: "center",
          border: "1px solid #ffcc02"
        }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#f57c00" }}>
            {Object.keys(availableActions).length}
          </div>
          <div style={{ color: "#f57c00", fontSize: 14 }}>Action Types</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        background: "#f8f9fa", 
        padding: 20, 
        borderRadius: 8, 
        marginBottom: 24,
        border: "1px solid #dee2e6"
      }}>
        <h3 style={{ marginBottom: 16, color: "#495057" }}>Filters</h3>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: 16 
        }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Action Type</label>
            <select 
              value={filters.action} 
              onChange={(e) => setFilters({...filters, action: e.target.value})}
              style={{ 
                width: "100%", 
                padding: 8, 
                borderRadius: 4, 
                border: "1px solid #ced4da",
                fontSize: 14
              }}
            >
              <option value="">All Actions</option>
              {Object.entries(availableActions).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>User</label>
            <input
              type="text"
              placeholder="Filter by user"
              value={filters.user}
              onChange={(e) => setFilters({...filters, user: e.target.value})}
              style={{ 
                width: "100%", 
                padding: 8, 
                borderRadius: 4, 
                border: "1px solid #ced4da",
                fontSize: 14
              }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Status</label>
            <select 
              value={filters.status} 
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              style={{ 
                width: "100%", 
                padding: 8, 
                borderRadius: 4, 
                border: "1px solid #ced4da",
                fontSize: 14
              }}
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({...filters, date_from: e.target.value})}
              style={{ 
                width: "100%", 
                padding: 8, 
                borderRadius: 4, 
                border: "1px solid #ced4da",
                fontSize: 14
              }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({...filters, date_to: e.target.value})}
              style={{ 
                width: "100%", 
                padding: 8, 
                borderRadius: 4, 
                border: "1px solid #ced4da",
                fontSize: 14
              }}
            />
          </div>
        </div>
        
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            onClick={clearFilters}
            style={{
              padding: "8px 16px",
              background: "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div style={{ background: "#fff", borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <LoadingSpinner 
              fullScreen={false} 
              message="Loading audit trail..." 
              size={32}
            />
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#e9ecef" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>Timestamp</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>Action</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>User</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>Details</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #dee2e6" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#adb5bd", padding: 24 }}>
                    No audit entries found.
                  </td>
                </tr>
              ) : (
                auditLog.map((entry, idx) => (
                  <tr key={entry.id || idx} style={{ borderBottom: "1px solid #f1f3f5" }}>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      {formatDateTime(entry.timestamp)}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>
                      {getActionDisplayName(entry.action)}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      {entry.user_name || "-"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      <details>
                        <summary style={{ cursor: "pointer", color: "#007bff" }}>View Details</summary>
                        <div style={{ 
                          fontSize: 12, 
                          marginTop: 8, 
                          background: "#f8f9fa", 
                          padding: 12, 
                          borderRadius: 4,
                          border: "1px solid #dee2e6"
                        }}>
                          {renderAuditDetails(entry.details, entry.action)}
                        </div>
                      </details>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      <span style={{ 
                        color: getStatusColor(entry.status),
                        fontWeight: "bold"
                      }}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Info */}
      {auditLog.length > 0 && (
        <div style={{ 
          marginTop: 16, 
          textAlign: "center", 
          color: "#6c757d", 
          fontSize: 14 
        }}>
          Showing {auditLog.length} entries
        </div>
      )}
    </div>
  );
} 