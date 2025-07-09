import React, { useState, useEffect } from "react";
import { getPanels, getHRFields, modifyPanelConfig, getPanelHeaders, getSOTFields } from "./api";

export default function ModifyPanel() {
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [panelHeaders, setPanelHeaders] = useState([]);
  const [hrFields, setHRFields] = useState([]);
  const [sotType, setSotType] = useState("hr_data");
  const [keyMappings, setKeyMappings] = useState({
    hr_data: { panel: "", hr: "" },
    sot2: { panel: "", hr: "" },
    sot3: { panel: "", hr: "" }
  });
  const [message, setMessage] = useState("");
  const [panelExists, setPanelExists] = useState(true);

  useEffect(() => {
    getPanels().then(setPanels);
    // Default to hr_data fields
    getSOTFields("hr_data").then(res => setHRFields(res.fields || []));
  }, []);

  const handlePanelSelect = async (e) => {
    const panel = panels.find(p => p.name === e.target.value);
    setSelectedPanel(panel);
    if (panel) {
      const res = await getPanelHeaders(panel.name);
      setPanelHeaders(res.headers || []);
      // Load mappings for all SOTs
      const mapping = panel.key_mapping || {};
      setKeyMappings({
        hr_data: mapping.hr_data
          ? { panel: Object.keys(mapping.hr_data)[0] || "", hr: Object.values(mapping.hr_data)[0] || "" }
          : { panel: "", hr: "" },
        sot2: mapping.sot2
          ? { panel: Object.keys(mapping.sot2)[0] || "", hr: Object.values(mapping.sot2)[0] || "" }
          : { panel: "", hr: "" },
        sot3: mapping.sot3
          ? { panel: Object.keys(mapping.sot3)[0] || "", hr: Object.values(mapping.sot3)[0] || "" }
          : { panel: "", hr: "" }
      });
      setSotType("hr_data");
      // Fetch fields for hr_data by default
      getSOTFields("hr_data").then(res => setHRFields(res.fields || []));
      setPanelExists(true);
    } else {
      setPanelHeaders([]);
      setKeyMappings({
        hr_data: { panel: "", hr: "" },
        sot2: { panel: "", hr: "" },
        sot3: { panel: "", hr: "" }
      });
      setSotType("hr_data");
      setHRFields([]);
      setPanelExists(false);
    }
    setMessage("");
  };

  const handleSotTypeChange = async (e) => {
    const sot = e.target.value;
    setSotType(sot);
    // Fetch fields for the selected SOT
    const res = await getSOTFields(sot);
    setHRFields(res.fields || []);
  };

  const handleKeyMappingChange = (field, value) => {
    setKeyMappings(km => ({
      ...km,
      [sotType]: {
        ...km[sotType],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedPanel) {
      setMessage("Please select a panel.");
      return;
    }
    // At least one SOT mapping must be filled
    const hasMapping = Object.values(keyMappings).some(km => km.panel && km.hr);
    if (!hasMapping) {
      setMessage("Please select key mapping for at least one SOT.");
      return;
    }
    // Build key_mapping object for config
    const key_mapping = {};
    Object.entries(keyMappings).forEach(([sot, km]) => {
      if (km.panel && km.hr) {
        key_mapping[sot] = { [km.panel]: km.hr };
      } else {
        key_mapping[sot] = {};
      }
    });
    const data = {
      name: selectedPanel.name,
      key_mapping
    };
    const res = await modifyPanelConfig(data);
    setMessage(res.message || "Updated!");
    getPanels().then(setPanels);
  };

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
      {selectedPanel && panelHeaders.length > 0 && (
        <>
          {renderExistingMappings()}
          <div style={{ marginTop: 16, marginBottom: 18 }}>
            <label style={{ fontWeight: 600, color: "#495057" }}>Select SOT for Mapping:</label>
            <select
              value={sotType}
              onChange={handleSotTypeChange}
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #ced4da", borderRadius: 4, fontSize: 15, marginBottom: 10 }}
            >
              <option value="hr_data">HR Data</option>
              <option value="sot2">SOT2</option>
              <option value="sot3">SOT3</option>
            </select>
            {hrFields.length === 0 ? (
              <div style={{ color: "#e74c3c", marginTop: 10, fontWeight: 500 }}>
                No fields found for this SOT. Please upload SOT data first.
              </div>
            ) : (
              <>
                <label style={{ fontWeight: 600, color: "#495057" }}>Key Mapping for {sotType === "hr_data" ? "HR Data" : sotType.toUpperCase()}:</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <select
                    value={keyMappings[sotType].panel}
                    onChange={e => handleKeyMappingChange("panel", e.target.value)}
                    style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #ced4da", borderRadius: 4, fontSize: 15 }}
                  >
                    <option value="">Select panel field</option>
                    {panelHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span style={{ fontWeight: 600, color: "#adb5bd" }}>→</span>
                  <select
                    value={keyMappings[sotType].hr}
                    onChange={e => handleKeyMappingChange("hr", e.target.value)}
                    style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #ced4da", borderRadius: 4, fontSize: 15 }}
                  >
                    <option value="">Select HR field</option>
                    {hrFields.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          <button
            style={{
              width: "100%",
              background: hrFields.length === 0 ? "#e74c3c" : "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "10px 0",
              fontWeight: 600,
              fontSize: 16,
              cursor: hrFields.length === 0 ? "not-allowed" : "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              transition: "background 0.2s"
            }}
            onClick={handleSave}
            disabled={hrFields.length === 0}
          >
            Save
          </button>
        </>
      )}
      {message && <div style={{ marginTop: 14, color: message.includes("select") ? "#e74c3c" : "#27ae60", fontWeight: 500 }}>{message}</div>}
    </div>
  );
} 