import React, { useState, useEffect } from "react";
import { uploadPanelFile, getHRFields, savePanelConfig, getPanels, getSOTFields, getSOTList } from "../../services/api";

export default function AddPanel() {
  const [panelName, setPanelName] = useState("");
  const [panelFile, setPanelFile] = useState(null);
  const [panelHeaders, setPanelHeaders] = useState([]);
  const [hrFields, setHRFields] = useState([]);
  const [sotType, setSotType] = useState("hr_data");
  const [keyMappings, setKeyMappings] = useState({});
  const [message, setMessage] = useState("");
  const [panels, setPanels] = useState([]);
  const [panelExists, setPanelExists] = useState(false);
  const [availableSOTs, setAvailableSOTs] = useState([]);

  useEffect(() => {
    getPanels().then(setPanels);
    // Fetch available SOTs
    getSOTList().then(data => {
      const sots = data.sots || [];
      setAvailableSOTs(sots);
      // Initialize keyMappings dynamically based on available SOTs
      const initialMappings = {};
      sots.forEach(sot => {
        initialMappings[sot] = { panel: "", hr: "" };
      });
      setKeyMappings(initialMappings);
      // Default to first available SOT or hr_data
      if (sots.length > 0) {
        setSotType(sots[0]);
        getSOTFields(sots[0]).then(res => setHRFields(res.fields || []));
      } else {
        // Fallback to hr_data if no SOTs available
        getSOTFields("hr_data").then(res => setHRFields(res.fields || []));
      }
    }).catch(error => {
      console.error("Error fetching SOT list:", error);
      setAvailableSOTs([]);
      setKeyMappings({});
      setMessage("Error loading available SOTs. Please check if the backend server is running.");
    });
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
    // Reset keyMappings to initial state
    const initialMappings = {};
    availableSOTs.forEach(sot => {
      initialMappings[sot] = { panel: "", hr: "" };
    });
    setKeyMappings(initialMappings);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    setPanelFile(file);
    try {
      const res = await uploadPanelFile(file);
      setPanelHeaders(res.headers || []);
      // Fetch fields for the current SOT type
      const sotFields = await getSOTFields(sotType);
      setHRFields(sotFields.fields || []);
      setMessage(""); // Clear any previous error messages
    } catch (error) {
      console.error("Error uploading file:", error);
      setPanelHeaders([]);
      setHRFields([]);
      setMessage("Error uploading file. Please check the file format and try again.");
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
    // Build key_mapping object for config - only include SOTs with actual mappings
    const key_mapping = {};
    Object.entries(keyMappings).forEach(([sot, km]) => {
      if (km.panel && km.hr) {
        key_mapping[sot] = { [km.panel]: km.hr };
      }
      // Don't include empty mappings
    });
    const data = {
      name: panelName,
      key_mapping,
      panel_headers: panelHeaders,
    };
    try {
      const res = await savePanelConfig(data);
      setMessage(res.message || "Saved!");
      getPanels().then(setPanels);
    } catch (error) {
      console.error("Error saving panel config:", error);
      setMessage("Error saving panel configuration. Please try again.");
    }
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
          Panel Name:
        </label>
        <input
          type="text"
          placeholder="Enter panel name"
          value={panelName}
          onChange={handlePanelNameChange}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: panelExists ? "2px solid #e74c3c" : "2px solid #e9ecef",
            borderRadius: 8,
            outline: "none",
            fontSize: 14,
            background: panelExists ? "#fff6f6" : "#fff",
            color: "#343a40",
            transition: "all 0.2s ease"
          }}
        />
        {panelExists && (
          <div style={{ 
            color: "#e74c3c", 
            marginTop: 6, 
            fontSize: 12,
            fontWeight: 500 
          }}>
            ⚠️ Panel already exists
          </div>
        )}
      </div>
      
      <div style={{ marginBottom: 20 }}>
        <label style={{ 
          display: "block", 
          marginBottom: 8, 
          color: "#343a40", 
          fontWeight: 500, 
          fontSize: 14 
        }}>
          Upload Panel File:
        </label>
        <input
          type="file"
          accept=".csv, .xlsx, .xls, .xlsb"
          onChange={handleFileUpload}
          disabled={panelExists}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "2px solid #e9ecef",
            borderRadius: 8,
            fontSize: 14,
            background: panelExists ? "#f8f9fa" : "#fff",
            color: "#6c757d",
            cursor: panelExists ? "not-allowed" : "pointer",
            transition: "all 0.2s ease"
          }}
        />
      </div>
      
      {panelHeaders.length > 0 && !panelExists && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: "block", 
            marginBottom: 8, 
            color: "#343a40", 
            fontWeight: 500, 
            fontSize: 14 
          }}>
            Select SOT for Mapping:
          </label>
          <select
            value={sotType}
            onChange={handleSotTypeChange}
            style={{ 
              width: "100%", 
              padding: "12px 16px", 
              border: "2px solid #e9ecef", 
              borderRadius: 8, 
              fontSize: 14, 
              marginBottom: 16,
              background: "#fff",
              color: "#343a40",
              cursor: "pointer",
              outline: "none",
              transition: "all 0.2s ease"
            }}
          >
            {availableSOTs.map(sot => (
              <option key={sot} value={sot}>
                {sot === "hr_data" ? "HR Data" : 
                 sot === "service_users" ? "Service Users" :
                 sot === "internal_users" ? "Internal Users" :
                 sot === "thirdparty_users" ? "Third Party Users" :
                 sot.toUpperCase()}
              </option>
            ))}
          </select>
          
          {hrFields.length === 0 ? (
            <div style={{ 
              color: "#e74c3c", 
              padding: 12,
              background: "#fdf2f2",
              borderRadius: 6,
              fontSize: 14, 
              fontWeight: 500,
              border: "1px solid #fecaca"
            }}>
              ⚠️ No fields found for this SOT. Please upload SOT data first.
            </div>
          ) : (
            <>
              <label style={{ 
                display: "block", 
                marginBottom: 8, 
                color: "#343a40", 
                fontWeight: 500, 
                fontSize: 14 
              }}>
                Key Mapping for {sotType === "hr_data" ? "HR Data" : 
                  sotType === "service_users" ? "Service Users" :
                  sotType === "internal_users" ? "Internal Users" :
                  sotType === "thirdparty_users" ? "Third Party Users" :
                  sotType.toUpperCase()}:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <select
                  value={keyMappings[sotType].panel}
                  onChange={e => handleKeyMappingChange("panel", e.target.value)}
                  style={{ 
                    flex: 1, 
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
                  <option value="">Select panel field</option>
                  {panelHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span style={{ 
                  fontWeight: 600, 
                  color: "#6c757d",
                  fontSize: 16 
                }}>→</span>
                <select
                  value={keyMappings[sotType].hr}
                  onChange={e => handleKeyMappingChange("hr", e.target.value)}
                  style={{ 
                    flex: 1, 
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
          background: panelExists || hrFields.length === 0 ? "#adb5bd" : "#6c5ce7",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "14px 32px",
          fontWeight: 600,
          fontSize: 16,
          cursor: panelExists || hrFields.length === 0 ? "not-allowed" : "pointer",
          boxShadow: panelExists || hrFields.length === 0 ? "none" : "0 2px 8px rgba(108, 92, 231, 0.3)",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => {
          if (!panelExists && hrFields.length > 0) {
            e.target.style.background = "#5a4fd8";
            e.target.style.boxShadow = "0 4px 12px rgba(108, 92, 231, 0.4)";
          }
        }}
        onMouseLeave={(e) => {
          if (!panelExists && hrFields.length > 0) {
            e.target.style.background = "#6c5ce7";
            e.target.style.boxShadow = "0 2px 8px rgba(108, 92, 231, 0.3)";
          }
        }}
      >
        Save Panel
      </button>

      {message && (
        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          borderRadius: 6, 
          background: message.includes("exist") || message.includes("Error") ? "#fdf2f2" : "#eafaf1",
          color: message.includes("exist") || message.includes("Error") ? "#991b1b" : "#145a32", 
          fontWeight: 500,
          fontSize: 14,
          border: `1px solid ${message.includes("exist") || message.includes("Error") ? "#fecaca" : "#bbf7d0"}`
        }}>
          {message}
        </div>
      )}
    </div>
  );
} 