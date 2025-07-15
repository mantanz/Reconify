import React, { useState, useEffect } from "react";
import { uploadPanelFile, getHRFields, savePanelConfig, getPanels, getSOTFields } from "./api";

export default function AddPanel() {
  const [panelName, setPanelName] = useState("");
  const [panelFile, setPanelFile] = useState(null);
  const [panelHeaders, setPanelHeaders] = useState([]);
  const [hrFields, setHRFields] = useState([]);
  const [sotType, setSotType] = useState("hr_data");
  const [keyMappings, setKeyMappings] = useState({
    hr_data: { panel: "", hr: "" },
    sot2: { panel: "", hr: "" },
    sot3: { panel: "", hr: "" }
  });
  const [message, setMessage] = useState("");
  const [panels, setPanels] = useState([]);
  const [panelExists, setPanelExists] = useState(false);

  useEffect(() => {
    getPanels().then(setPanels);
    // Default to hr_data fields
    getSOTFields("hr_data").then(res => setHRFields(res.fields || []));
  }, []);

  const handlePanelNameChange = (e) => {
    const name = e.target.value;
    setPanelName(name);
    const exists = panels.some(
      p => p.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    setPanelExists(exists);
    setMessage("");
    setPanelFile(null);
    setPanelHeaders([]);
    setHRFields([]);
    setKeyMappings({
      hr_data: { panel: "", hr: "" },
      sot2: { panel: "", hr: "" },
      sot3: { panel: "", hr: "" }
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    setPanelFile(file);
    const res = await uploadPanelFile(file);
    setPanelHeaders(res.headers || []);
    // Fetch fields for the current SOT type
    const sotFields = await getSOTFields(sotType);
    setHRFields(sotFields.fields || []);
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
    // At least one SOT mapping must be filled
    const hasMapping = Object.values(keyMappings).some(km => km.panel && km.hr);
    if (!panelName || !hasMapping) {
      setMessage("Please fill all fields and select key mapping for at least one SOT.");
      return;
    }
    if (panelExists) {
      setMessage("Panel already exists");
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
      name: panelName,
      key_mapping,
      panel_headers: panelHeaders,
    };
    const res = await savePanelConfig(data);
    setMessage(res.message || "Saved!");
    getPanels().then(setPanels);
  };

  return (
    <div style={{ background: "#f4f6fb", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 600, color: "#495057" }}>Panel Name:</label>
        <input
          value={panelName}
          onChange={handlePanelNameChange}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: panelExists ? "1.5px solid #e74c3c" : "1.5px solid #ced4da",
            borderRadius: 4,
            marginTop: 6,
            outline: "none",
            fontSize: 15,
            background: panelExists ? "#fff6f6" : "#fff",
            transition: "border 0.2s"
          }}
        />
        {panelExists && (
          <div style={{ color: "#e74c3c", marginTop: 6, fontSize: 14 }}>Panel already exists</div>
        )}
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 600, color: "#495057" }}>Upload Panel File:</label>
        <input
          type="file"
          onChange={handleFileUpload}
          disabled={panelExists}
          style={{
            width: "100%",
            padding: "8px 0",
            marginTop: 6,
            fontSize: 15,
            background: panelExists ? "#f1f1f1" : "#fff"
          }}
        />
      </div>
      {panelHeaders.length > 0 && !panelExists && (
        <div style={{ marginBottom: 18 }}>
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
      )}
      <button
        onClick={handleSave}
        disabled={panelExists || hrFields.length === 0}
        style={{
          width: "100%",
          background: panelExists || hrFields.length === 0 ? "#e74c3c" : "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "10px 0",
          fontWeight: 600,
          fontSize: 16,
          cursor: panelExists || hrFields.length === 0 ? "not-allowed" : "pointer",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          transition: "background 0.2s"
        }}
      >
        Save
      </button>
      {message && <div style={{ marginTop: 14, color: message.includes("exist") ? "#e74c3c" : "#27ae60", fontWeight: 500 }}>{message}</div>}
    </div>
  );
} 