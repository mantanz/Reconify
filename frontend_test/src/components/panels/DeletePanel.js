import React, { useState, useEffect } from "react";
import { getPanels, deletePanelByName } from "../../services/api";

export default function DeletePanel() {
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getPanels().then(setPanels);
  }, []);

  const handlePanelSelect = (e) => {
    const panel = panels.find(p => p.name === e.target.value);
    setSelectedPanel(panel);
    setShowConfirm(false);
    setMessage("");
  };

  const handleDelete = async () => {
    if (!selectedPanel) return;
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    const res = await deletePanelByName(selectedPanel.name);
    setMessage(res.message || "Deleted!");
    setShowConfirm(false);
    setSelectedPanel(null);
    getPanels().then(setPanels);
  };

  // Helper to render existing mappings
  const renderExistingMappings = () => {
    if (!selectedPanel || !selectedPanel.key_mapping) return null;
    const mapping = selectedPanel.key_mapping;
    return (
      <div style={{ marginBottom: 16 }}>
        <strong>Existing Mapping(s):</strong>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {Object.entries(mapping).map(([sot, map], idx) =>
            Object.entries(map).length > 0 ? (
              <li key={sot + idx}><b>{sot.toUpperCase()}</b>: {Object.entries(map).map(([panelField, hrField]) => `${panelField} → ${hrField}`).join(", ")}</li>
            ) : (
              <li key={sot + idx}><b>{sot.toUpperCase()}</b>: <i>No mapping</i></li>
            )
          )}
        </ul>
      </div>
    );
  };

  return (
    <div style={{ 
      background: "transparent", 
      borderRadius: 8, 
      padding: 0,
      marginBottom: 0,
      boxShadow: "none",
      border: "none"
    }}>
      <div style={{ marginBottom: 20 }}>
        <label style={{ 
          display: "block", 
          marginBottom: 8, 
          color: "#343a40", 
          fontWeight: 500, 
          fontSize: 14 
        }}>
          Select Panel:
        </label>
        <select
          value={selectedPanel ? selectedPanel.name : ""}
          onChange={handlePanelSelect}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "2px solid #e9ecef",
            borderRadius: 8,
            fontSize: 14,
            background: "#fff",
            color: "#343a40",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.2s ease"
          }}
        >
          <option value="">Select panel</option>
          {panels.map(p => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>
      
      {selectedPanel && (
        <>
          {renderExistingMappings()}
          
          <button
            style={{
              width: "100%",
              background: "#e74c3c",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "14px 32px",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(231, 76, 60, 0.3)",
              transition: "all 0.2s ease"
            }}
            onClick={handleDelete}
            onMouseEnter={(e) => {
              e.target.style.background = "#c0392b";
              e.target.style.boxShadow = "0 4px 12px rgba(231, 76, 60, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#e74c3c";
              e.target.style.boxShadow = "0 2px 8px rgba(231, 76, 60, 0.3)";
            }}
          >
            Delete Panel
          </button>

          {message && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              borderRadius: 6, 
              background: message.includes("Deleted") ? "#eafaf1" : "#fdf2f2",
              color: message.includes("Deleted") ? "#145a32" : "#991b1b", 
              fontWeight: 500,
              fontSize: 14,
              border: `1px solid ${message.includes("Deleted") ? "#bbf7d0" : "#fecaca"}`
            }}>
              {message}
            </div>
          )}
        </>
      )}
      
      {showConfirm && (
        <div style={{ 
          marginTop: 20, 
          background: "#fff3cd", 
          padding: 16, 
          borderRadius: 8,
          border: "1px solid #ffeaa7"
        }}>
          <div style={{ 
            marginBottom: 12, 
            color: "#856404",
            fontWeight: 600,
            fontSize: 14 
          }}>
            ⚠️ Are you sure you want to delete this panel?
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              style={{ 
                background: "#e74c3c", 
                color: "#fff", 
                border: "none", 
                borderRadius: 6, 
                padding: "10px 20px", 
                fontWeight: 600, 
                cursor: "pointer",
                fontSize: 14,
                transition: "all 0.2s ease"
              }}
              onClick={confirmDelete}
              onMouseEnter={(e) => {
                e.target.style.background = "#c0392b";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#e74c3c";
              }}
            >
              Yes, Delete
            </button>
            <button
              style={{ 
                background: "#fff", 
                color: "#343a40", 
                border: "2px solid #e9ecef", 
                borderRadius: 6, 
                padding: "10px 20px", 
                fontWeight: 600, 
                cursor: "pointer",
                fontSize: 14,
                transition: "all 0.2s ease"
              }}
              onClick={() => setShowConfirm(false)}
              onMouseEnter={(e) => {
                e.target.style.background = "#f8f9fa";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#fff";
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 