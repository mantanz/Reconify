import { useState, useEffect } from 'react';
import { 
  getPanels, 
  getSOTList, 
  savePanelConfig, 
  modifyPanelConfig, 
  deletePanelByName,
  uploadPanelFile,
  uploadPanelFileWithHistory,
  getPanelConfig,
  getSOTFields
} from '../utils/api';
import '../styles/tables.css';

export default function Config() {
  const [func, setFunc] = useState('');
  const [selectedPanel, setSelectedPanel] = useState('');
  const [newPanelName, setNewPanelName] = useState('');
  const [selectedMappings, setSelectedMappings] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [sotHeaderSelections, setSotHeaderSelections] = useState({});
  const [panelHeaderSelections, setPanelHeaderSelections] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [detectedPanelHeaders, setDetectedPanelHeaders] = useState([]);
  const [sotSelections, setSotSelections] = useState({});
  const [sotHeaderSelectionsAdd, setSotHeaderSelectionsAdd] = useState({});
  const [selectedPanelHeader, setSelectedPanelHeader] = useState('');
  const [selectedSot, setSelectedSot] = useState('');
  const [selectedSotHeader, setSelectedSotHeader] = useState('');
  const [addedMappings, setAddedMappings] = useState([]);
  
  // Real data from backend
  const [panels, setPanels] = useState([]);
  const [sots, setSots] = useState([]);
  const [sotFields, setSotFields] = useState({});
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load real data from backend
  useEffect(() => {
    loadConfigData();
  }, []);

  const loadConfigData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load panels, SOTs, and mappings from backend
      const [panelsData, sotsData] = await Promise.all([
        getPanels(),
        getSOTList()
      ]);

      setPanels(panelsData || []);
      // Handle the case where sotsData is wrapped in an object with 'sots' key
      const sotsArray = sotsData?.sots || sotsData || [];
      setSots(sotsArray);
      setMappings([]); // Mappings will be loaded per panel when needed
    } catch (err) {
      setError('Failed to load configuration data: ' + err.message);
      console.error('Error loading config data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSotFields = async (sotName) => {
    if (!sotName || sotFields[sotName]) return; // Already loaded
    
    try {
      const fieldsData = await getSOTFields(sotName);
      setSotFields(prev => ({
        ...prev,
        [sotName]: fieldsData?.fields || []
      }));
    } catch (err) {
      console.error(`Error loading SOT fields for ${sotName}:`, err);
    }
  };

  const loadPanelMappings = async (panelName) => {
    if (!panelName) return;
    
    try {
      setLoading(true);
      const panelConfig = await getPanelConfig(panelName);
      
      if (panelConfig && panelConfig.key_mapping) {
        // Convert backend key_mapping format to frontend mappings format
        const mappings = [];
        let id = 1;
        
        Object.entries(panelConfig.key_mapping).forEach(([sot, sotMapping]) => {
          Object.entries(sotMapping).forEach(([sotField, panelField]) => {
            mappings.push({
              id: id++,
              panel: panelName,
              panelField: panelField,
              sot: sot,
              sotField: sotField
            });
          });
        });
        
        setMappings(mappings);
      } else {
        setMappings([]);
      }
    } catch (err) {
      setError('Failed to load panel mappings: ' + err.message);
      console.error('Error loading panel mappings:', err);
    } finally {
      setLoading(false);
    }
  };



  // Filter mappings for selected panel
  const panelMappings = func === 'modify' || func === 'delete'
    ? mappings.filter(m => m.panel === selectedPanel)
    : [];

  // Unique SOTs for selected mappings
  const selectedSOTs = Array.from(new Set(
    panelMappings.filter(m => selectedMappings.includes(m.id)).map(m => m.sot)
  ));

  // Handlers
  const handleFuncChange = e => {
    const newFunc = e.target.value;
    setFunc(newFunc);
    setNewPanelName('');
    setSelectedMappings([]);
    setSelectAll(false);
    setSotHeaderSelections({});
    setPanelHeaderSelections({});
    setSubmitted(false);
    setUploadedFile(null);
    
    // If switching to modify/delete and a panel is already selected, load its mappings
    if ((newFunc === 'modify' || newFunc === 'delete') && selectedPanel) {
      loadPanelMappings(selectedPanel);
    } else {
      setSelectedPanel('');
      setMappings([]);
    }
  };

  const handlePanelChange = e => {
    const panelName = e.target.value;
    setSelectedPanel(panelName);
    setSelectedMappings([]);
    setSelectAll(false);
    setSotHeaderSelections({});
    setPanelHeaderSelections({});
    setSubmitted(false);
    setUploadedFile(null);
    
    // Load panel mappings if in modify or delete mode
    if ((func === 'modify' || func === 'delete') && panelName) {
      loadPanelMappings(panelName);
    }
  };

  const handleMappingSelect = async id => {
    setSelectedMappings(prev =>
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
    setSubmitted(false);
    
    // Load SOT fields for the selected mapping if in modify mode
    if (func === 'modify') {
      const selectedMapping = panelMappings.find(m => m.id === id);
      if (selectedMapping && selectedMapping.sot) {
        await loadSotFields(selectedMapping.sot);
      }
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMappings([]);
    } else {
      setSelectedMappings(panelMappings.map(m => m.id));
    }
    setSelectAll(!selectAll);
    setSubmitted(false);
  };

  const handleSotHeaderChange = (sot, val) => {
    console.log(`DEBUG: SOT Header changed - SOT: ${sot}, New Value: ${val}`);
    setSotHeaderSelections(prev => {
      const updated = { ...prev, [sot]: val };
      console.log('DEBUG: Updated sotHeaderSelections:', updated);
      return updated;
    });
    setSubmitted(false);
  };

  const handlePanelHeaderChange = (mappingId, value) => {
    console.log(`DEBUG: Panel Header changed - Mapping ID: ${mappingId}, New Value: ${value}`);
    setPanelHeaderSelections(prev => {
      const updated = { ...prev, [mappingId]: value };
      console.log('DEBUG: Updated panelHeaderSelections:', updated);
      return updated;
    });
    setSubmitted(false);
  };

  // Get panel headers from uploaded file via backend
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    setUploadedFile(file);
    setLoading(true);
    
    try {
      // Upload file to backend and get headers using the API function
      const data = await uploadPanelFile(file);
      
      // Extract headers from the response and convert to proper case
      const headers = data.headers || [];
      // Convert headers to proper case (first letter uppercase, rest lowercase)
      const formattedHeaders = headers.map(header => 
        header.charAt(0).toUpperCase() + header.slice(1).toLowerCase()
      );
      setDetectedPanelHeaders(formattedHeaders);
      setSelectedPanelHeader('');
      setSelectedSot('');
      setSelectedSotHeader('');
      setAddedMappings([]);
      
    } catch (err) {
      setError('Failed to process uploaded file: ' + err.message);
      console.error('Error uploading file:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-6xl mx-auto mt-8">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Panel Configuration
        </h2>
        
        {/* Loading and Error States */}
        {loading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-800">Loading configuration data...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <span className="text-red-800">{error}</span>
          </div>
        )}

        <form className="space-y-6">
                                {/* Function and Panel Name Row */}
                      <div className="flex items-end gap-8 mb-6">
                        <div className="flex items-center gap-3 flex-1">
                          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                            Function
                          </label>
                          <select
                            value={func}
                            onChange={handleFuncChange}
                            className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#00baf2] focus:outline-none flex-1 text-center"
                          >
                            <option value="">-- Select --</option>
                            <option value="add">C - Create</option>
                            <option value="modify">U - Update</option>
                            <option value="delete">D - Delete</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-3 flex-1">
                          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                            Panel Name
                          </label>
                          {func === 'add' ? (
                            <input
                              type="text"
                              value={newPanelName}
                              onChange={e => setNewPanelName(e.target.value)}
                              placeholder="Enter panel name"
                              className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#00baf2] focus:outline-none flex-1"
                            />
                          ) : (
                            <select
                              value={selectedPanel}
                              onChange={handlePanelChange}
                              className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#00baf2] focus:outline-none flex-1 text-center"
                            >
                              <option value="">-- Select Panel --</option>
                              {panels.map(panel => (
                                <option key={panel.id || panel.name} value={panel.name}>{panel.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Upload Document Row (only for add function) */}
                      {func === 'add' && (
                        <div className="mb-6">
                          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-[#00baf2] transition-colors duration-200">
                            <div className="flex items-center justify-center">
                              <input
                                type="file"
                                onChange={e => handleFileUpload(e.target.files[0])}
                                className="hidden"
                                id="file-upload"
                              />
                              <label
                                htmlFor="file-upload"
                                className="flex items-center gap-3 cursor-pointer text-gray-600 hover:text-[#00baf2] transition-colors duration-200"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span className="text-sm font-medium">
                                  {uploadedFile ? (
                                    <span className="text-green-600">✓ {uploadedFile.name}</span>
                                  ) : (
                                    "Click to browse or drag and drop files here"
                                  )}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

          

                                {/* Show mapping UI after file upload and headers detected - only for Create function */}
                      {func === 'add' && uploadedFile && detectedPanelHeaders.length > 0 && (
            <div className="mb-8">
              {/* Add mapping row */}
              <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Panel Header</label>
                  <select
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#00baf2] focus:outline-none"
                    value={selectedPanelHeader}
                    onChange={e => setSelectedPanelHeader(e.target.value)}
                  >
                    <option value="">-- Select Panel Header --</option>
                    {detectedPanelHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">SOT</label>
                  <select
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#00baf2] focus:outline-none"
                    value={selectedSot}
                    onChange={e => {
                      const sotName = e.target.value;
                      setSelectedSot(sotName);
                      setSelectedSotHeader('');
                      if (sotName) {
                        loadSotFields(sotName);
                      }
                    }}
                    disabled={!selectedPanelHeader}
                  >
                    <option value="">-- Select SOT --</option>
                    {sots.map(sot => (
                      <option key={sot} value={sot}>{sot}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">SOT Header</label>
                  <select
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#00baf2] focus:outline-none"
                    value={selectedSotHeader}
                    onChange={e => setSelectedSotHeader(e.target.value)}
                    disabled={!selectedSot}
                  >
                    <option value="">-- Select SOT Header --</option>
                    {sotFields[selectedSot]?.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="mt-6 ml-2 p-1 rounded-full bg-[#00baf2] hover:bg-[#00a4d6] text-white shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{ width: '28px', height: '28px' }}
                  disabled={!selectedPanelHeader || !selectedSot || !selectedSotHeader}
                  onClick={() => {
                    setAddedMappings(prev => [
                      ...prev,
                      { panelField: selectedPanelHeader, sot: selectedSot, sotField: selectedSotHeader }
                    ]);
                    setSelectedPanelHeader('');
                    setSelectedSot('');
                    setSelectedSotHeader('');
                  }}
                  title="Add Mapping"
                  aria-label="Add Mapping"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>
                                        {/* Mapping Table */}
                          <div className="table-container">
                            <table className="mapping-table">
                              <thead className="mapping-table-header">
                                <tr>
                                  <th className="mapping-table-th">Panel Field</th>
                                  <th className="mapping-table-th">SOT</th>
                                  <th className="mapping-table-th">SOT Field</th>
                                </tr>
                              </thead>
                              <tbody className="mapping-table-body">
                                {addedMappings.map((mapping, idx) => (
                                  <tr key={mapping.panelField + mapping.sot + mapping.sotField + idx} className="mapping-table-row">
                                    <td className="mapping-table-cell">{mapping.panelField}</td>
                                    <td className="mapping-table-cell">{mapping.sot}</td>
                                    <td className="mapping-table-cell">{mapping.sotField}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
          )}

          {/* Mapping Table for Modify/Delete */}
          {(func === 'modify' || func === 'delete') && selectedPanel && panelMappings.length > 0 && (
            <div className="mb-6">
              {func === 'delete' && (
                <div className="flex items-center mb-2">
                  <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="mr-2" />
                  <span className="text-sm font-medium">Select All</span>
                </div>
              )}
                                        <div className="table-container">
                                          <table className="mapping-table">
                            <thead className="mapping-table-header">
                              <tr>
                                <th className="mapping-table-cell-small">Select</th>
                                <th className="mapping-table-th">Panel Field</th>
                                <th className="mapping-table-th">SOT</th>
                                <th className="mapping-table-th">SOT Field</th>
                              </tr>
                            </thead>
                            <tbody className="mapping-table-body">
                              {panelMappings.map(m => (
                                <tr key={m.id} className="mapping-table-row">
                                  <td className="mapping-table-cell-small">
                                    <input
                                      type="checkbox"
                                      checked={selectedMappings.includes(m.id)}
                                      onChange={async () => {
                                        if (func === 'modify') {
                                          const newSelection = selectedMappings.includes(m.id) ? [] : [m.id];
                                          setSelectedMappings(newSelection);

                                          // Load SOT fields for the selected mapping
                                          if (newSelection.length > 0) {
                                            await loadSotFields(m.sot);
                                          }
                                        } else {
                                          handleMappingSelect(m.id);
                                        }
                                      }}
                                      disabled={func === 'modify' && selectedMappings.length === 1 && !selectedMappings.includes(m.id)}
                                    />
                                  </td>
                                  <td className="mapping-table-cell">{m.panelField}</td>
                                  <td className="mapping-table-cell">{m.sot}</td>
                                  <td className="mapping-table-cell">{m.sotField}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
            </div>
          )}

          {/* Dynamic Panel Header, SOT, and SOT Header dropdowns for selected mappings (only for modify) */}
          {func === 'modify' && selectedPanel && selectedMappings.length > 0 && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Panel header dropdowns on the left */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Panel Headers</label>
                {panelMappings
                  .filter(m => selectedMappings.includes(m.id))
                  .map(m => {
                    // Get all unique panel headers for the selected panel
                    const uniquePanelHeaders = Array.from(new Set(panelMappings.map(pm => pm.panelField)));
                    // Initial value: either from state or the mapping's panelField
                    const selectedValue = panelHeaderSelections[m.id] || m.panelField;
                    return (
                      <div key={m.id} className="mb-2">
                        <label className="block text-xs text-gray-500 mb-1">{selectedPanel}</label>
                        <select
                          value={selectedValue}
                          onChange={e => handlePanelHeaderChange(m.id, e.target.value)}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#00baf2] focus:outline-none"
                        >
                          {uniquePanelHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
              </div>
              
              {/* SOT dropdowns in the middle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SOT</label>
                {panelMappings
                  .filter(m => selectedMappings.includes(m.id))
                  .map(m => {
                    // Initial value: either from state or the mapping's sot
                    const selectedValue = sotSelections[m.id] || m.sot;
                    return (
                      <div key={m.id} className="mb-2">
                        <label className="block text-xs text-gray-500 mb-1">Source of Truth</label>
                        <select
                          value={selectedValue}
                          onChange={async (e) => {
                            const newSot = e.target.value;
                            setSotSelections(prev => ({ ...prev, [m.id]: newSot }));
                            // Load SOT fields for the newly selected SOT
                            if (newSot) {
                              await loadSotFields(newSot);
                            }
                            // Reset SOT header selection when SOT changes
                            setSotHeaderSelections(prev => ({ ...prev, [newSot]: '' }));
                          }}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#00baf2] focus:outline-none"
                        >
                          {sots.map(sot => (
                            <option key={sot} value={sot}>{sot}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
              </div>
              
              {/* SOT header dropdowns on the right */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SOT Headers</label>
                {panelMappings
                  .filter(m => selectedMappings.includes(m.id))
                  .map(m => {
                    // Get the current SOT (either selected or original)
                    const currentSot = sotSelections[m.id] || m.sot;
                    // Initial value: either from state or the mapping's sotField
                    const selectedValue = sotHeaderSelections[currentSot] || m.sotField;
                    return (
                      <div key={m.id} className="mb-2">
                        <label className="block text-xs text-gray-500 mb-1">{currentSot}</label>
                        <select
                          value={selectedValue}
                          onChange={e => handleSotHeaderChange(currentSot, e.target.value)}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#00baf2] focus:outline-none"
                        >
                          {sotFields[currentSot]?.map(h => (
                            <option key={h} value={h}>{h}</option>
                          )) || []}
                        </select>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}



          {/* Submit Button */}
          <div className="md:col-span-2">
            <ConfigSubmit
              func={func}
              newPanelName={newPanelName}
              uploadedFile={uploadedFile}
              addedMappings={addedMappings}
              selectedPanel={selectedPanel}
              selectedMappings={selectedMappings}
              detectedPanelHeaders={detectedPanelHeaders}
              panelMappings={panelMappings}
              sotHeaderSelections={sotHeaderSelections}
              panelHeaderSelections={panelHeaderSelections}
              sotSelections={sotSelections}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

// ConfigSubmit: Handles validation and submit for all config modes
function ConfigSubmit({ func, newPanelName, uploadedFile, addedMappings, selectedPanel, selectedMappings, detectedPanelHeaders, panelMappings, sotHeaderSelections, panelHeaderSelections, sotSelections }) {
  const [submitted, setSubmitted] = useState(false);
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset submitted and warning states when function changes
  useEffect(() => {
    setSubmitted(false);
    setWarning('');
  }, [func]);

  const validFuncs = ['add', 'modify', 'delete'];
  const handleSubmit = async e => {
    e.preventDefault();
    if (!func || !validFuncs.includes(func)) {
      setWarning('Please select a function before submitting.');
      setSubmitted(false);
      return;
    }

    try {
      setLoading(true);
      setWarning('');

      // Add
      if (func === 'add') {
        if (!newPanelName || !uploadedFile) {
          setWarning('Please enter a panel name and upload a document.');
          setSubmitted(false);
          return;
        }
        if (!addedMappings || addedMappings.length === 0) {
          setWarning('Please add at least one mapping before submitting.');
          setSubmitted(false);
          return;
        }

        // Save panel config first
        await savePanelConfig({
          name: newPanelName,
          key_mapping: addedMappings.reduce((acc, mapping) => {
            if (!acc[mapping.sot]) {
              acc[mapping.sot] = {};
            }
            acc[mapping.sot][mapping.panelField.toLowerCase()] = mapping.sotField.toLowerCase();
            return acc;
          }, {}),
          panel_headers: detectedPanelHeaders
        });
        
        // Upload file with history tracking
        await uploadPanelFileWithHistory(newPanelName, uploadedFile);
      }
      // Modify
      else if (func === 'modify') {
        if (!selectedPanel) {
          setWarning('Please select a panel.');
          setSubmitted(false);
          return;
        }
        if (!selectedMappings || selectedMappings.length !== 1) {
          setWarning('Please select exactly one mapping to modify.');
          setSubmitted(false);
          return;
        }

        // Get the selected mapping
        const selectedMapping = panelMappings.find(m => selectedMappings.includes(m.id));
        if (!selectedMapping) {
          setWarning('Selected mapping not found.');
          setSubmitted(false);
          return;
        }

        // Get the updated values from the dropdowns
        const updatedPanelField = panelHeaderSelections[selectedMapping.id] || selectedMapping.panelField;
        const updatedSot = sotSelections[selectedMapping.id] || selectedMapping.sot;
        const updatedSotField = sotHeaderSelections[updatedSot] || selectedMapping.sotField;

        console.log('DEBUG: Modify mapping values:');
        console.log('- selectedMapping:', selectedMapping);
        console.log('- panelHeaderSelections:', panelHeaderSelections);
        console.log('- sotSelections:', sotSelections);
        console.log('- sotHeaderSelections:', sotHeaderSelections);
        console.log('- updatedPanelField:', updatedPanelField);
        console.log('- updatedSot:', updatedSot);
        console.log('- updatedSotField:', updatedSotField);

        // Build the complete key_mapping for this panel with the updated values
        const allMappings = panelMappings.map(m => {
          if (m.id === selectedMapping.id) {
            // This is the mapping being modified
            return {
              panelField: updatedPanelField,
              sot: updatedSot,
              sotField: updatedSotField
            };
          } else {
            // Keep other mappings unchanged
            return {
              panelField: m.panelField,
              sot: m.sot,
              sotField: m.sotField
            };
          }
        });

        // Convert to backend format: { sot_name: { panel_field: sot_field } }
        const key_mapping = {};
        allMappings.forEach(mapping => {
          if (!key_mapping[mapping.sot]) {
            key_mapping[mapping.sot] = {};
          }
          key_mapping[mapping.sot][mapping.panelField.toLowerCase()] = mapping.sotField.toLowerCase();
        });

        console.log('DEBUG: Final payload to backend:');
        console.log('- allMappings:', allMappings);
        console.log('- key_mapping:', key_mapping);

        // Call modify API with complete updated configuration
        await modifyPanelConfig({
          name: selectedPanel,
          key_mapping: key_mapping
        });
      }
      // Delete
      else if (func === 'delete') {
        if (!selectedPanel) {
          setWarning('Please select a panel.');
          setSubmitted(false);
          return;
        }
        if (!selectedMappings || selectedMappings.length === 0) {
          setWarning('Please select at least one row to delete.');
          setSubmitted(false);
          return;
        }

        // Delete panel
        await deletePanelByName(selectedPanel);
      }

      setWarning('');
      setSubmitted(true);
    } catch (err) {
      setWarning('Operation failed: ' + err.message);
      setSubmitted(false);
      console.error('Config operation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Button disabled logic
  let isDisabled = false;
  if (!func || !validFuncs.includes(func)) {
    isDisabled = true;
  } else if (func === 'add') {
    isDisabled = !newPanelName || !uploadedFile || !addedMappings || addedMappings.length === 0;
  } else if (func === 'modify') {
    isDisabled = !selectedPanel || !selectedMappings || selectedMappings.length !== 1;
  } else if (func === 'delete') {
    isDisabled = !selectedPanel || !selectedMappings || selectedMappings.length === 0;
  }

  return (
    <>
      <div className="flex justify-center mt-8">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={isDisabled || loading}
          className="px-8 py-3 bg-[#00baf2] hover:bg-[#00a4d6] text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            'Submit'
          )}
        </button>
      </div>
      {warning && (
        <div className="text-red-600 text-center mt-2 font-medium">{warning}</div>
      )}
      {submitted && !warning && (
        <div className="text-green-600 text-center mt-2 font-medium">Submitted successfully</div>
      )}
    </>
  );
} 