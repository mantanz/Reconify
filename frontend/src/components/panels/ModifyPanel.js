import React, { useState, useEffect } from "react";
import { getPanels, getHRFields, modifyPanelConfig, getPanelHeaders, getSOTFields, getSOTList } from "../../utils/api";

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
  const [hasModifications, setHasModifications] = useState(false);
  const [originalMappings, setOriginalMappings] = useState({});

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
        setOriginalMappings(newKeyMappings); // Store original mappings
        setHasModifications(false); // Reset modification state
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
        setOriginalMappings({});
        setHasModifications(false);
        setSotType("");
        setHRFields([]);
        setPanelExists(false);
        // Set a clear error message
        setMessage(`⚠️ Panel '${panel.name}' exists in configuration but has no database table. Please upload panel data first.`);
      }
    } else {
      setPanelHeaders([]);
      setKeyMappings({});
      setOriginalMappings({});
      setHasModifications(false);
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
    setKeyMappings(km => {
      const newMappings = {
        ...km,
        [sotType]: {
          ...km[sotType],
          [field]: value
        }
      };
      
      // Check if mappings have been modified compared to original
      const hasChanges = Object.keys(newMappings).some(sot => {
        const current = newMappings[sot];
        const original = originalMappings[sot];
        return !original || current.panel !== original.panel || current.hr !== original.hr;
      });
      
      setHasModifications(hasChanges);
      return newMappings;
    });
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
      setOriginalMappings(keyMappings); // Update original mappings to current state
      setHasModifications(false); // Reset modification state
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
          Current Mappings:
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(mapping).map(([sot, map], idx) => {
            const hasMapping = Object.entries(map).length > 0;
            const sotDisplayName = sot === "hr_data" ? "HR Data" : 
              sot === "service_users" ? "Service Users" :
              sot === "internal_users" ? "Internal Users" :
              sot === "thirdparty_users" ? "Third Party Users" :
              sot.toUpperCase();
            
            return (
              <div key={sot + idx} style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: hasMapping ? "#e8f5e8" : "#fff3cd",
                borderRadius: 6,
                border: `1px solid ${hasMapping ? "#c3e6c3" : "#ffeaa7"}`
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: hasMapping ? "#28a745" : "#ffc107"
                }}></div>
                <span style={{
                  fontWeight: 500,
                  color: "#343a40",
                  fontSize: 13,
                  minWidth: 120
                }}>
                  {sotDisplayName}:
                </span>
                <span style={{
                  color: hasMapping ? "#28a745" : "#856404",
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  {hasMapping 
                    ? Object.entries(map).map(([panelField, hrField]) => `${panelField} → ${hrField}`).join(", ")
                    : "No mapping configured"
                  }
                </span>
              </div>
            );
          })}
        </div>
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
          
          {panelExists ? (
            <>
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
                        value={keyMappings[sotType]?.panel || ""}
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
                        value={keyMappings[sotType]?.hr || ""}
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
              
              {/* Mapping Status Summary */}
              {availableSOTs.length > 0 && hasModifications && (
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
                    Updated Mapping Status:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {availableSOTs.map(sot => {
                      const mapping = keyMappings[sot];
                      const originalMapping = originalMappings[sot];
                      const isComplete = mapping && mapping.panel && mapping.hr;
                      const hasChanged = !originalMapping || 
                        mapping.panel !== originalMapping.panel || 
                        mapping.hr !== originalMapping.hr;
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
                          background: hasChanged ? "#e8f5e8" : "#f8f9fa",
                          borderRadius: 6,
                          border: `1px solid ${hasChanged ? "#c3e6c3" : "#e9ecef"}`
                        }}>
                          <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: hasChanged ? "#28a745" : "#6c757d"
                          }}></div>
                          <span style={{
                            fontWeight: 500,
                            color: "#343a40",
                            fontSize: 13,
                            minWidth: 120
                          }}>
                            {sotDisplayName}:
                          </span>
                          <span style={{
                            color: hasChanged ? "#28a745" : "#6c757d",
                            fontSize: 12,
                            fontWeight: 500
                          }}>
                            {isComplete 
                              ? `${mapping.panel} → ${mapping.hr}`
                              : mapping && (mapping.panel || mapping.hr)
                                ? `${mapping.panel || "Not selected"} → ${mapping.hr || "Not selected"}`
                                : "Mapping incomplete"
                            }
                            {hasChanged && (
                              <span style={{ 
                                marginLeft: 8, 
                                fontSize: 11, 
                                color: "#28a745",
                                fontStyle: "italic"
                              }}>
                                (modified)
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {Object.values(keyMappings).some(km => km.panel && km.hr) && (
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
                      At least one mapping is complete. You can save the changes.
                    </div>
                  )}
                </div>
              )}
              
              <button
                style={{
                  width: "100%",
                  background: !hasModifications ? "#adb5bd" : "#6c5ce7",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "14px 32px",
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: !hasModifications ? "not-allowed" : "pointer",
                  boxShadow: !hasModifications ? "none" : "0 2px 8px rgba(108, 92, 231, 0.3)",
                  transition: "all 0.2s ease"
                }}
                onClick={handleSave}
                disabled={!hasModifications}
                onMouseEnter={(e) => {
                  if (hasModifications) {
                    e.target.style.background = "#5a4fd8";
                    e.target.style.boxShadow = "0 4px 12px rgba(108, 92, 231, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasModifications) {
                    e.target.style.background = "#6c5ce7";
                    e.target.style.boxShadow = "0 2px 8px rgba(108, 92, 231, 0.3)";
                  }
                }}
              >
                Save Changes
              </button>

              {message && (
                <div style={{ 
                  marginTop: 16, 
                  padding: 12, 
                  borderRadius: 6, 
                  background: message.includes("⚠️") || message.includes("Error") || message.includes("select") ? "#fdf2f2" : "#eafaf1",
                  color: message.includes("⚠️") || message.includes("Error") || message.includes("select") ? "#991b1b" : "#145a32", 
                  fontWeight: 500,
                  fontSize: 14,
                  border: `1px solid ${message.includes("⚠️") || message.includes("Error") || message.includes("select") ? "#fecaca" : "#bbf7d0"}`
                }}>
                  {message}
                </div>
              )}
            </>
          ) : (
            <div style={{ 
              background: "#fff3cd", 
              border: "1px solid #ffeaa7", 
              borderRadius: 8, 
              padding: 16, 
              marginTop: 16,
              color: "#856404"
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>⚠️ Panel Configuration Issue</div>
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>This panel exists in configuration but has no database table. To modify this panel, you need to:</div>
              <ol style={{ margin: "8px 0 0 20px", padding: 0, fontSize: 14, lineHeight: 1.5 }}>
                <li>Go to the "Reconciliation" section</li>
                <li>Upload panel data for "{selectedPanel.name}"</li>
                <li>Then return here to modify the configuration</li>
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
} 