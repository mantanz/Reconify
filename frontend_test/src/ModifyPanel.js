import React, { useState, useEffect } from "react";
import { getPanels, getHRFields, modifyPanelConfig, getPanelHeaders, getSOTFields, getSOTList } from "./api";

export default function ModifyPanel() {
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [panelHeaders, setPanelHeaders] = useState([]);
  const [hrFields, setHRFields] = useState([]);
  const [sotType, setSotType] = useState("hr_data");
  const [keyMappings, setKeyMappings] = useState({});
  const [message, setMessage] = useState("");
  const [panelExists, setPanelExists] = useState(true);
  const [availableSOTs, setAvailableSOTs] = useState([]);

  useEffect(() => {
    getPanels().then(setPanels);
    // Fetch available SOTs
    getSOTList().then(data => {
      const sots = data.sots || [];
      setAvailableSOTs(sots);
      // Default to hr_data fields
      getSOTFields("hr_data").then(res => setHRFields(res.fields || []));
    }).catch(error => {
      console.error("Error fetching SOT list:", error);
      setAvailableSOTs([]);
      setMessage("Error loading available SOTs. Please check if the backend server is running.");
    });
  }, []);

  const handlePanelSelect = async (e) => {
    const panel = panels.find(p => p.name === e.target.value);
    setSelectedPanel(panel);
    if (panel) {
      try {
        const res = await getPanelHeaders(panel.name);
        setPanelHeaders(res.headers || []);
        // Dynamically build keyMappings for all SOTs in the config
        const mapping = panel.key_mapping || {};
        const newKeyMappings = {};
        Object.keys(mapping).forEach(sot => {
          const map = mapping[sot];
          newKeyMappings[sot] = map && Object.keys(map).length > 0
            ? { panel: Object.keys(map)[0] || "", hr: Object.values(map)[0] || "" }
            : { panel: "", hr: "" };
        });
        setKeyMappings(newKeyMappings);
        // Set default SOT type to first available
        const firstSot = Object.keys(mapping)[0] || "";
        setSotType(firstSot);
        // Fetch fields for the first SOT by default
        if (firstSot) {
          getSOTFields(firstSot).then(res => setHRFields(res.fields || []));
        } else {
          setHRFields([]);
        }
        setPanelExists(true);
        setMessage(""); // Clear any previous error messages
      } catch (error) {
        console.error("Error fetching panel headers:", error);
        setPanelHeaders([]);
        setKeyMappings({});
        setSotType("");
        setHRFields([]);
        setPanelExists(false);
        // Set a clear error message
        setMessage(`⚠️ Panel '${panel.name}' exists in configuration but has no database table. Please upload panel data first.`);
      }
    } else {
      setPanelHeaders([]);
      setKeyMappings({});
      setSotType("");
      setHRFields([]);
      setPanelExists(false);
      setMessage("");
    }
  };

  const handleSotTypeChange = async (e) => {
    const sot = e.target.value;
    setSotType(sot);
    // Initialize mapping if not present
    setKeyMappings(km => ({
      ...km,
      [sot]: km[sot] || { panel: "", hr: "" }
    }));
    // Fetch fields for the selected SOT
    try {
      const res = await getSOTFields(sot);
      setHRFields(res.fields || []);
      setMessage(""); // Clear any previous error messages
    } catch (error) {
      console.error(`Error fetching fields for SOT '${sot}':`, error);
      setHRFields([]);
      setMessage(`No fields found for SOT '${sot}'. Please upload SOT data first.`);
    }
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
    try {
      const res = await modifyPanelConfig(data);
      setMessage(res.message || "Updated!");
      getPanels().then(setPanels);
    } catch (error) {
      console.error("Error modifying panel config:", error);
      setMessage("Error updating panel configuration. Please try again.");
    }
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
      {selectedPanel && (
        <>
          {panelHeaders.length > 0 ? (
            <>
              {renderExistingMappings()}
              <div style={{ marginTop: 16, marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: "#495057" }}>Select SOT for Mapping:</label>
                <select
                  value={sotType}
                  onChange={handleSotTypeChange}
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #ced4da", borderRadius: 4, fontSize: 15, marginBottom: 10 }}
                >
                  {selectedPanel && selectedPanel.key_mapping
                    ? Object.keys(selectedPanel.key_mapping).map(sot => (
                        <option key={sot} value={sot}>
                          {sot === "hr_data" ? "HR Data" : 
                           sot === "service_users" ? "Service Users" :
                           sot === "internal_users" ? "Internal Users" :
                           sot === "thirdparty_users" ? "Third Party Users" :
                           sot.toUpperCase()}
                        </option>
                      ))
                    : null}
                </select>
                {hrFields.length === 0 ? (
                  <div style={{ color: "#e74c3c", marginTop: 10, fontWeight: 500 }}>
                    No fields found for this SOT. Please upload SOT data first.
                  </div>
                ) : (
                  <>
                    <label style={{ fontWeight: 600, color: "#495057" }}>Key Mapping for {sotType === "hr_data" ? "HR Data" : 
                      sotType === "service_users" ? "Service Users" :
                      sotType === "internal_users" ? "Internal Users" :
                      sotType === "thirdparty_users" ? "Third Party Users" :
                      sotType.toUpperCase()}:</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                      <select
                        value={keyMappings[sotType]?.panel || ""}
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
                        value={keyMappings[sotType]?.hr || ""}
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
          ) : (
            <div style={{ 
              background: "#fff3cd", 
              border: "1px solid #ffeaa7", 
              borderRadius: 6, 
              padding: 16, 
              marginTop: 16,
              color: "#856404"
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>⚠️ Panel Configuration Issue</div>
              <div>This panel exists in configuration but has no database table. To modify this panel, you need to:</div>
              <ol style={{ margin: "8px 0 0 20px", padding: 0 }}>
                <li>Go to the "Reconciliation" section</li>
                <li>Upload panel data for "{selectedPanel.name}"</li>
                <li>Then return here to modify the configuration</li>
              </ol>
            </div>
          )}
        </>
      )}
      {message && (
        <div style={{ 
          marginTop: 14, 
          color: message.includes("⚠️") || message.includes("Error") || message.includes("select") ? "#e74c3c" : "#27ae60", 
          fontWeight: 500,
          background: message.includes("⚠️") ? "#fff3cd" : "transparent",
          border: message.includes("⚠️") ? "1px solid #ffeaa7" : "none",
          borderRadius: message.includes("⚠️") ? 6 : 0,
          padding: message.includes("⚠️") ? 12 : 0
        }}>
          {message}
        </div>
      )}
    </div>
  );
} 