import React, { useState, useEffect } from "react";
import { 
  getPanels, 
  savePanelConfig, 
  modifyPanelConfig, 
  deletePanelByName,
  uploadPanelFile,
  getPanelHeaders,
  getSOTFields,
  getSOTList 
} from "../../services/api";
import "../../styles/tables.css";

export default function Config() {
  const [selectedFunction, setSelectedFunction] = useState("");
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [panelName, setPanelName] = useState("");
  const [panelFile, setPanelFile] = useState(null);
  const [panelHeaders, setPanelHeaders] = useState([]);
  const [availableSOTs, setAvailableSOTs] = useState([]);
  const [hrFields, setHRFields] = useState([]);
  const [keyMappings, setKeyMappings] = useState({});
  const [mappingRows, setMappingRows] = useState([]);
  const [currentMapping, setCurrentMapping] = useState({ panelField: "", sot: "", sotField: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const panelsData = await getPanels();
      setPanels(panelsData);
      
      const sotData = await getSOTList();
      const sots = sotData.sots || [];
      setAvailableSOTs(sots);
      
      // Initialize key mappings
      const initialMappings = {};
      sots.forEach(sot => {
        initialMappings[sot] = { panel: "", hr: "" };
      });
      setKeyMappings(initialMappings);
      
      // SOT fields will be loaded dynamically when user selects SOT
    } catch (error) {
      setMessage("Error loading initial data. Please check if the backend server is running.");
    }
  };

  const handleFunctionChange = (functionCode) => {
    setSelectedFunction(functionCode);
    resetForm();
  };

  const resetForm = () => {
    setSelectedPanel(null);
    setPanelName("");
    setPanelFile(null);
    setPanelHeaders([]);
    setMessage("");
    setShowConfirmDelete(false);
    setMappingRows([]);
    setCurrentMapping({ panelField: "", sot: "", sotField: "" });
    // Reset key mappings
    const initialMappings = {};
    availableSOTs.forEach(sot => {
      initialMappings[sot] = { panel: "", hr: "" };
    });
    setKeyMappings(initialMappings);
  };

  const handlePanelSelect = async (panelNameStr) => {
    if (selectedFunction === "C") {
      setPanelName(panelNameStr);
      return;
    }

    const panel = panels.find(p => p.name === panelNameStr);
    setSelectedPanel(panel);
    
    if (panel && selectedFunction === "U") {
      try {
        const res = await getPanelHeaders(panel.name);
        setPanelHeaders(res.headers || []);
        
        // Load existing mappings
        const mapping = panel.key_mapping || {};
        const rows = [];
        Object.entries(mapping).forEach(([sot, fieldMapping]) => {
          Object.entries(fieldMapping).forEach(([panelField, sotField]) => {
            rows.push({
              id: Date.now() + Math.random(),
              panelField,
              sot,
              sotField
            });
          });
        });
        setMappingRows(rows);
      } catch (error) {
        setMessage(`Error loading panel '${panel.name}'. Please upload panel data first.`);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    setPanelFile(file);
    
    if (file && selectedFunction === "C") {
      try {
        const res = await uploadPanelFile(file);
        setPanelHeaders(res.headers || []);
        setMessage("");
      } catch (error) {
        setMessage("Error processing file. Please check the file format.");
      }
    }
  };

  const handleCurrentMappingChange = async (field, value) => {
    setCurrentMapping(prev => ({ ...prev, [field]: value }));
    
    // If SOT changes, load its fields
    if (field === "sot" && value) {
      try {
        const res = await getSOTFields(value);
        setHRFields(res.fields || []);
        setMessage("");
      } catch (error) {
        setHRFields([]);
        setMessage(`No fields found for SOT '${value}'. Please upload SOT data first.`);
      }
    }
  };

  const addMappingRow = () => {
    if (currentMapping.panelField && currentMapping.sot && currentMapping.sotField) {
      const newRow = { ...currentMapping, id: Date.now() };
      setMappingRows(prev => [...prev, newRow]);
      setCurrentMapping({ panelField: "", sot: "", sotField: "" });
      setHRFields([]); // Clear SOT fields
    } else {
      setMessage("Please select all fields before adding the mapping.");
    }
  };

  const removeMappingRow = (id) => {
    setMappingRows(prev => prev.filter(row => row.id !== id));
  };



  const handleSubmit = async () => {
    if (!selectedFunction) {
      setMessage("Please select a function.");
      return;
    }

    setLoading(true);
    
    try {
      if (selectedFunction === "C") {
        await handleCreate();
      } else if (selectedFunction === "U") {
        await handleUpdate();
      } else if (selectedFunction === "D") {
        await handleDelete();
      }
    } catch (error) {
      setMessage(`Error: ${error.message || "Operation failed"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!panelName.trim()) {
      setMessage("Please enter a panel name.");
      return;
    }
    
    if (panels.some(p => p.name.toLowerCase() === panelName.toLowerCase())) {
      setMessage("Panel with this name already exists.");
      return;
    }

    if (mappingRows.length === 0) {
      setMessage("Please add at least one SOT mapping.");
      return;
    }

    const key_mapping = {};
    mappingRows.forEach(row => {
      if (!key_mapping[row.sot]) {
        key_mapping[row.sot] = {};
      }
      key_mapping[row.sot][row.panelField] = row.sotField;
    });

    const data = {
      name: panelName,
      key_mapping,
      panel_headers: panelHeaders,
    };

    const res = await savePanelConfig(data);
    setMessage("Panel created successfully!");
    await loadInitialData();
    resetForm();
  };

  const handleUpdate = async () => {
    if (!selectedPanel) {
      setMessage("Please select a panel to update.");
      return;
    }

    if (mappingRows.length === 0) {
      setMessage("Please add at least one SOT mapping.");
      return;
    }

    const key_mapping = {};
    mappingRows.forEach(row => {
      if (!key_mapping[row.sot]) {
        key_mapping[row.sot] = {};
      }
      key_mapping[row.sot][row.panelField] = row.sotField;
    });

    const data = {
      name: selectedPanel.name,
      key_mapping
    };

    const res = await modifyPanelConfig(data);
    setMessage("Panel updated successfully!");
    await loadInitialData();
  };

  const handleDelete = async () => {
    if (!selectedPanel) {
      setMessage("Please select a panel to delete.");
      return;
    }

    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      return;
    }

    const res = await deletePanelByName(selectedPanel.name);
    setMessage("Panel deleted successfully!");
    await loadInitialData();
    resetForm();
  };



  const showMappingSection = selectedFunction && selectedFunction !== "D" && 
    ((selectedFunction === "C" && panelName && panelHeaders.length > 0) ||
     (selectedFunction === "U" && selectedPanel && panelHeaders.length > 0));

  return (
    <div style={{
      maxWidth: 1300,
      margin: "40px auto",
      background: "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
      borderRadius: 12,
      boxShadow: "0 20px 60px rgba(0, 123, 255, 0.1), 0 8px 32px rgba(0, 123, 255, 0.05)",
      padding: 28,
      border: "1px solid #e8ecff"
    }}>
      <h2 style={{
        textAlign: "center",
        color: "#002e6e",
        marginBottom: 24,
        fontSize: 24,
        fontWeight: 600,
        background: "linear-gradient(135deg, #002e6e 0%, #0056b3 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text"
      }}>
        Panel Configuration
      </h2>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 48,
        marginBottom: 32,
        flexWrap: "wrap"
      }}>
        {/* Function Section */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={{
            color: "#002e6e",
            fontWeight: 600,
            fontSize: 16,
            width: "110px",
            textAlign: "left",
            display: "inline-block",
            marginRight: "12px"
          }}>
            Function
          </label>
          <div style={{ position: "relative" }}>
            <select
              value={selectedFunction}
              onChange={(e) => handleFunctionChange(e.target.value)}
              style={{
                margin: 0,
                padding: "16px 20px",
                border: "2px solid #e8ecff",
                borderRadius: 12,
                fontSize: 16,
                backgroundColor: "#fff",
                color: selectedFunction ? "#002e6e" : "#6c757d",
                cursor: "pointer",
                outline: "none",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 12px rgba(0, 123, 255, 0.08)",
                appearance: "none",
                minWidth: "400px"
              }}
            >
              <option value="">-- Select --</option>
              <option value="C">C - Create</option> 
              <option value="U">U - Update</option>
              <option value="D">D - Delete</option>
            </select>
            <div style={{
              position: "absolute",
              right: "24px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "#6c757d"
            }}>
              ▼
            </div>
          </div>
        </div>

        {/* Panel Name Section */}
        {selectedFunction && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <label style={{
              color: "#002e6e",
              fontWeight: 600,
              fontSize: 16,
              width: "110px",
              textAlign: "left",
              display: "inline-block",
              marginRight: "12px"
            }}>
              Panel Name
            </label>
            
            {selectedFunction === "C" ? (
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={panelName}
                onChange={(e) => handlePanelSelect(e.target.value)}
                placeholder="Enter panel name"
                style={{
                  margin: 0,
                  padding: "16px 20px",
                  border: "2px solid #e8ecff",
                  borderRadius: 12,
                  fontSize: 16,
                  backgroundColor: "#fff",
                  color: "#002e6e",
                  outline: "none",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(0, 123, 255, 0.08)",
                  minWidth: "400px"
                }}
              />
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <select
                value={selectedPanel?.name || ""}
                onChange={(e) => handlePanelSelect(e.target.value)}
                style={{
                  margin: 0,
                  padding: "16px 20px",
                  border: "2px solid #e8ecff",
                  borderRadius: 12,
                  fontSize: 16,
                  backgroundColor: "#fff",
                  color: selectedPanel ? "#002e6e" : "#6c757d",
                  cursor: "pointer",
                  outline: "none",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(0, 123, 255, 0.08)",
                  appearance: "none",
                  minWidth: "400px"
                }}
              >
                <option value="">-- Select Panel --</option>
                {panels.map(panel => (
                  <option key={panel.name} value={panel.name}>
                    {panel.name}
                  </option>
                ))}
              </select>
              <div style={{
                position: "absolute",
                right: "24px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "#6c757d"
              }}>
                ▼
              </div>
            </div>
          )}
          </div>
        )}
      </div>

      {/* File Upload Section - Only for Create */}
      {selectedFunction === "C" && (
        <div style={{
          marginBottom: 24,
          padding: 16,
          border: panelFile ? "2px solid #28a745" : "2px dashed #e8ecff",
          borderRadius: 12,
          textAlign: "center",
          backgroundColor: panelFile ? "#f8fff9" : "#fafbff"
        }}>
          {panelFile ? (
            <div>
              <div style={{ 
                fontSize: 18, 
                marginBottom: 6, 
                color: "#28a745" 
              }}>
                ✓
              </div>
              <div style={{ 
                fontWeight: 600, 
                color: "#28a745",
                fontSize: 14
              }}>
                {panelFile.name}
              </div>
              <button
                onClick={() => {
                  setPanelFile(null);
                  setPanelHeaders([]);
                  setMappingRows([]);
                }}
                style={{
                  marginTop: 8,
                  padding: "4px 8px",
                  background: "transparent",
                  border: "1px solid #6c757d",
                  borderRadius: 4,
                  color: "#6c757d",
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: "none" }}
                id="panel-file-upload"
              />
              <label
                htmlFor="panel-file-upload"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#6c757d",
                  fontSize: 16,
                  gap: 12
                }}
              >
                <div style={{ 
                  fontSize: 32, 
                  color: "#00b4d8" 
                }}>
                  📤
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
                    Click to browse or drag and drop files here
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Supported formats: CSV, XLSX, XLS
                  </div>
                </div>
              </label>
            </>
          )}
        </div>
      )}

      {/* SOT Mapping Section */}
      {showMappingSection && (
        <div style={{ marginBottom: 32 }}>
          {/* Mapping Input Row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr auto",
            gap: 16,
            marginBottom: 24,
            alignItems: "end"
          }}>
            <div>
              <label style={{
                display: "block",
                marginBottom: 8,
                color: "#495057",
                fontWeight: 600,
                fontSize: 14
              }}>
                Panel Header
              </label>
              <select
                value={currentMapping.panelField}
                onChange={(e) => handleCurrentMappingChange("panelField", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e9ecef",
                  borderRadius: 8,
                  fontSize: 14,
                  backgroundColor: "#fff",
                  color: "#495057",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="">-- Select Panel Header --</option>
                {panelHeaders.map(header => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: "block",
                marginBottom: 8,
                color: "#495057",
                fontWeight: 600,
                fontSize: 14
              }}>
                SOT
              </label>
              <select
                value={currentMapping.sot}
                onChange={(e) => handleCurrentMappingChange("sot", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e9ecef",
                  borderRadius: 8,
                  fontSize: 14,
                  backgroundColor: "#fff",
                  color: "#495057",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="">-- Select SOT --</option>
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
            </div>

            <div>
              <label style={{
                display: "block",
                marginBottom: 8,
                color: "#495057",
                fontWeight: 600,
                fontSize: 14
              }}>
                SOT Header
              </label>
              <select
                value={currentMapping.sotField}
                onChange={(e) => handleCurrentMappingChange("sotField", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e9ecef",
                  borderRadius: 8,
                  fontSize: 14,
                  backgroundColor: "#fff",
                  color: "#495057",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="">-- Select SOT Header --</option>
                {hrFields.map(field => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={addMappingRow}
              style={{
                width: "48px",
                height: "48px",
                background: "#00baf2",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                fontSize: "24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0, 186, 242, 0.3)",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.1)";
                e.target.style.boxShadow = "0 8px 20px rgba(0, 186, 242, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 4px 12px rgba(0, 186, 242, 0.3)";
              }}
            >
              +
            </button>
          </div>

          {/* Mapping Table */}
          {mappingRows.length > 0 && (
            <div className="table-container">
              <table className="data-table">
                <thead className="table-header">
                  <tr>
                    <th>PANEL FIELD</th>
                    <th>SOT</th>
                    <th>SOT FIELD</th>
                    <th className="table-header-action"></th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {mappingRows.map(row => (
                    <tr key={row.id} className="table-row">
                      <td className="table-cell">{row.panelField}</td>
                      <td className="table-cell">
                        {row.sot === "hr_data" ? "hr_data" : 
                         row.sot === "service_users" ? "service_users" :
                         row.sot === "internal_users" ? "internal_users" :
                         row.sot === "thirdparty_users" ? "thirdparty_users" :
                         row.sot}
                      </td>
                      <td className="table-cell">{row.sotField}</td>
                      <td className="table-cell-action">
                        <button
                          onClick={() => removeMappingRow(row.id)}
                          style={{
                            background: "transparent",
                            color: "#dc3545",
                            border: "none",
                            padding: "0",
                            borderRadius: "50%",
                            fontSize: "16px",
                            cursor: "pointer",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background-color 0.2s",
                            margin: "0 auto",
                            lineHeight: "1"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#fecaca";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      {selectedFunction === "D" && selectedPanel && (
        <div style={{
          marginBottom: 32,
          padding: 24,
          backgroundColor: "#fff3cd",
          border: "1px solid #ffeaa7",
          borderRadius: 12,
          color: "#856404"
        }}>
          <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
            ⚠️ Delete Panel: {selectedPanel.name}
          </h4>
          <p style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.5 }}>
            This action will permanently delete the panel configuration. This cannot be undone.
          </p>
          {showConfirmDelete && (
            <div style={{
              padding: 16,
              backgroundColor: "#f8d7da",
              border: "1px solid #f5c6cb",
              borderRadius: 8,
              color: "#721c24",
              marginBottom: 16
            }}>
              <strong>Are you sure you want to delete this panel?</strong>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      {selectedFunction && (
        <div style={{ textAlign: "center", marginBottom: 24 }}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: "16px 48px",
            background: loading ? "#adb5bd" : 
                       selectedFunction === "D" ? "#dc3545" : "#00baf2",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 16px rgba(0, 186, 242, 0.3)",
            minWidth: 160
          }}
        >
          {loading ? "Processing..." : 
           selectedFunction === "D" && showConfirmDelete ? "Confirm Delete" :
           selectedFunction === "C" ? "Create Panel" :
           selectedFunction === "U" ? "Update Panel" :
           "Delete Panel"}
        </button>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div style={{
          padding: 16,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          textAlign: "center",
          background: message.includes("Error") || message.includes("failed") ? 
                     "#fdf2f2" : "#eafaf1",
          color: message.includes("Error") || message.includes("failed") ? 
                 "#991b1b" : "#145a32",
          border: `1px solid ${message.includes("Error") || message.includes("failed") ? 
                                "#fecaca" : "#bbf7d0"}`
        }}>
          {message}
        </div>
      )}
    </div>
  );
} 