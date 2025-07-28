import React, { useState, useEffect } from "react";
import { uploadPanelFile, getHRFields, savePanelConfig, getPanels, getSOTFields, getSOTList } from "../../utils/api";
import { MAX_FILE_SIZE } from '../../utils/constants';

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

  // Function to check if all mappings are complete
  const areAllMappingsComplete = () => {
    if (availableSOTs.length === 0) return false;
    if (!panelName.trim()) return false;
    if (panelHeaders.length === 0) return false;
    
    return availableSOTs.every(sot => {
      const mapping = keyMappings[sot];
      return mapping && mapping.panel && mapping.hr;
    });
  };

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
    
    // File size validation
    if (file && file.size > MAX_FILE_SIZE) {
      const sizeInMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
      setMessage(`File size exceeds the maximum limit of ${sizeInMB}MB. Please choose a smaller file.`);
      e.target.value = '';
      return;
    }
    
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
    // Check if all mappings are complete
    if (!areAllMappingsComplete()) {
      setMessage("Please fill all fields and select key mapping for all SOTs.");
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
      background: "#fff", 
      borderRadius: 12, 
      padding: 24,
      marginBottom: 0,
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      border: "1px solid #e9ecef"
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
            transition: "all 0.2s ease",
            boxSizing: "border-box"
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
            transition: "all 0.2s ease",
            boxSizing: "border-box"
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
      
      {/* Mapping Status Summary */}
      {panelHeaders.length > 0 && availableSOTs.length > 0 && (
        <div style={{ 
          marginBottom: 20,
          padding: 16,
          background: "#f8f9fa",
          borderRadius: 8,
          border: "1px solid #e9ecef"
        }}>
          <div style={{ 
            marginBottom: 12,
            fontWeight: 600,
            color: "#343a40",
            fontSize: 14
          }}>
            Mapping Status:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {availableSOTs.map(sot => {
              const mapping = keyMappings[sot];
              const isComplete = mapping && mapping.panel && mapping.hr;
              const sotDisplayName = sot === "hr_data" ? "HR Data" : 
                sot === "service_users" ? "Service Users" :
                sot === "internal_users" ? "Internal Users" :
                sot === "thirdparty_users" ? "Third Party Users" :
                sot.toUpperCase();
              
              return (
                <div key={sot} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  background: isComplete ? "#e8f5e8" : "#fff3cd",
                  borderRadius: 6,
                  border: `1px solid ${isComplete ? "#c3e6c3" : "#ffeaa7"}`
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: isComplete ? "#28a745" : "#ffc107"
                  }}></div>
                  <span style={{
                    fontWeight: 500,
                    color: "#343a40",
                    fontSize: 13
                  }}>
                    {sotDisplayName}:
                  </span>
                  <span style={{
                    color: isComplete ? "#28a745" : "#856404",
                    fontSize: 12,
                    fontWeight: 500
                  }}>
                    {isComplete 
                      ? `${mapping.panel} → ${mapping.hr}`
                      : "Mapping incomplete"
                    }
                  </span>
                </div>
              );
            })}
          </div>
          {areAllMappingsComplete() && (
            <div style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "#d4edda",
              borderRadius: 6,
              border: "1px solid #c3e6c3",
              color: "#155724",
              fontSize: 12,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}>
              <span>✓</span>
              All mappings complete! You can now save the panel.
            </div>
          )}
        </div>
      )}
      
      <button
        onClick={handleSave}
        disabled={panelExists || !areAllMappingsComplete()}
        style={{
          width: "100%",
          background: panelExists || !areAllMappingsComplete() ? "#adb5bd" : "#6c5ce7",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "14px 32px",
          fontWeight: 600,
          fontSize: 16,
          cursor: panelExists || !areAllMappingsComplete() ? "not-allowed" : "pointer",
          boxShadow: panelExists || !areAllMappingsComplete() ? "none" : "0 2px 8px rgba(108, 92, 231, 0.3)",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => {
          if (!panelExists && areAllMappingsComplete()) {
            e.target.style.background = "#5a4fd8";
            e.target.style.boxShadow = "0 4px 12px rgba(108, 92, 231, 0.4)";
          }
        }}
        onMouseLeave={(e) => {
          if (!panelExists && areAllMappingsComplete()) {
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