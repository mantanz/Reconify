import React, { useState, useEffect } from "react";
import { getPanels, deletePanelByName } from "./api";

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
    <div style={{ background: "#f4f6fb", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 600, color: "#495057" }}>Select Panel:</label>
        <select
          value={selectedPanel ? selectedPanel.name : ""}
          onChange={handlePanelSelect}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1.5px solid #ced4da",
            borderRadius: 4,
            marginTop: 6,
            fontSize: 15,
            background: "#fff"
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
              borderRadius: 4,
              padding: "10px 0",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              transition: "background 0.2s"
            }}
            onClick={handleDelete}
          >
            Delete
          </button>
        </>
      )}
      {showConfirm && (
        <div style={{ marginTop: 16, background: "#f9e79f", padding: 10, borderRadius: 4 }}>
          <div style={{ marginBottom: 8 }}>Are you sure you want to delete this panel?</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{ background: "#e74c3c", color: "#fff", border: "none", borderRadius: 4, padding: "8px 18px", fontWeight: 600, cursor: "pointer" }}
              onClick={confirmDelete}
            >
              Yes
            </button>
            <button
              style={{ background: "#fff", color: "#343a40", border: "1.5px solid #ced4da", borderRadius: 4, padding: "8px 18px", fontWeight: 600, cursor: "pointer" }}
              onClick={() => setShowConfirm(false)}
            >
              No
            </button>
          </div>
        </div>
      )}
      {message && <div style={{ marginTop: 14, color: message.includes("Deleted") ? "#27ae60" : "#e74c3c", fontWeight: 500 }}>{message}</div>}
    </div>
  );
} 