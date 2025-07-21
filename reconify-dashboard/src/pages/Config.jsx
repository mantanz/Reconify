import { useState, useEffect } from 'react';
import { 
  getPanels, 
  getSOTList, 
  savePanelConfig, 
  modifyPanelConfig, 
  deletePanelByName,
  uploadPanelFile 
} from '../utils/api';

// Real data will be loaded from backend

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
    setFunc(e.target.value);
    setSelectedPanel('');
    setNewPanelName('');
    setSelectedMappings([]);
    setSelectAll(false);
    setSotHeaderSelections({});
    setPanelHeaderSelections({});
    setSubmitted(false);
    setUploadedFile(null);
  };
  const handlePanelChange = e => {
    setSelectedPanel(e.target.value);
    setSelectedMappings([]);
    setSelectAll(false);
    setSotHeaderSelections({});
    setPanelHeaderSelections({});
    setSubmitted(false);
    setUploadedFile(null);
  };
  const handleMappingSelect = id => {
    setSelectedMappings(prev =>
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
    setSubmitted(false);
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
    setSotHeaderSelections(prev => ({ ...prev, [sot]: val }));
    setSubmitted(false);
  };
  const handlePanelHeaderChange = (mappingId, value) => {
    setPanelHeaderSelections(prev => ({ ...prev, [mappingId]: value }));
    setSubmitted(false);
  };

  // Simulate backend header detection after file upload
  const handleFileUpload = (file) => {
    setUploadedFile(file);
    // Simulate async backend call
    setTimeout(() => {
      // Example: pretend backend found these headers in the uploaded file
      setDetectedPanelHeaders(['Email Id', 'Cust Name']);
      setSelectedPanelHeader('');
      setSelectedSot('');
      setSelectedSotHeader('');
      setAddedMappings([]);
    }, 500);
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow max-w-3xl mx-auto mt-10">
      <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Config</h2>
      
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

      {/* Function and Panel Row */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Function</label>
          <select value={func} onChange={handleFuncChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">-- Select --</option>
            <option value="add">Add</option>
            <option value="modify">Modify</option>
            <option value="delete">Delete</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Panel</label>
          {func === 'add' ? (
            <input
              type="text"
              value={newPanelName}
              onChange={e => setNewPanelName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter panel name"
            />
          ) : (
            <select value={selectedPanel} onChange={handlePanelChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Select Panel --</option>
              {panels.map(panel => (
                <option key={panel.id || panel.name} value={panel.name}>{panel.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* File upload for add function */}
      {func === 'add' && (
        <>
          <div className="mb-6 flex flex-col gap-2">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full">
              <label className="text-base font-medium text-gray-700 whitespace-nowrap md:mb-0 mb-2" htmlFor="upload-doc">Upload Document</label>
              <input
                id="upload-doc"
                type="file"
                onChange={e => handleFileUpload(e.target.files[0])}
                className="flex-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                style={{ maxWidth: '600px' }}
              />
            </div>
            {uploadedFile && (
              <div className="text-green-600 mt-1 text-center md:text-left">File selected: {uploadedFile.name}</div>
            )}
          </div>

          {/* Show mapping UI after headers detected */}
          {detectedPanelHeaders.length > 0 && (
            <div className="mb-8">
              {/* Add mapping row */}
              <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Panel Header</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedPanelHeader}
                    onChange={e => setSelectedPanelHeader(e.target.value)}
                  >
                    <option value="">-- Select Panel Header --</option>
                    {detectedPanelHeaders
                      .filter(h => !addedMappings.some(m => m.panelField === h))
                      .map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">SOT</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="mt-6 ml-2 p-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{ width: '28px', height: '28px' }}
                  disabled={
                    !selectedPanelHeader || !selectedSot || !selectedSotHeader ||
                    addedMappings.some(m => m.panelField === selectedPanelHeader)
                  }
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
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border rounded">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 border">Panel Field</th>
                      <th className="px-3 py-2 border">SOT</th>
                      <th className="px-3 py-2 border">SOT Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addedMappings.map((mapping, idx) => (
                      <tr key={mapping.panelField + mapping.sot + mapping.sotField + idx}>
                        <td className="px-3 py-2 border">{mapping.panelField}</td>
                        <td className="px-3 py-2 border">{mapping.sot}</td>
                        <td className="px-3 py-2 border">{mapping.sotField}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
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
          <table className="min-w-full text-sm border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-1 py-2 border w-8">Select</th>
                <th className="px-3 py-2 border">Panel Field</th>
                <th className="px-3 py-2 border">SOT</th>
                <th className="px-3 py-2 border">SOT Field</th>
              </tr>
            </thead>
            <tbody>
              {panelMappings.map(m => (
                <tr key={m.id}>
                  <td className="px-1 py-2 border text-center w-8">
                    <input
                      type="checkbox"
                      checked={selectedMappings.includes(m.id)}
                      onChange={() => {
                        if (func === 'modify') {
                          setSelectedMappings(selectedMappings.includes(m.id) ? [] : [m.id]);
                        } else {
                          handleMappingSelect(m.id);
                        }
                      }}
                      disabled={func === 'modify' && selectedMappings.length === 1 && !selectedMappings.includes(m.id)}
                    />
                  </td>
                  <td className="px-3 py-2 border">{m.panelField}</td>
                  <td className="px-3 py-2 border">{m.sot}</td>
                  <td className="px-3 py-2 border">{m.sotField}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dynamic Panel and SOT header dropdowns for selected mappings (only for modify) */}
      {func === 'modify' && selectedPanel && selectedMappings.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {uniquePanelHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
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
                const sot = STATIC_SOTS.find(s => s.name === m.sot);
                // Initial value: either from state or the mapping's sotField
                const selectedValue = sotHeaderSelections[m.sot] || m.sotField;
                return (
                  <div key={m.id} className="mb-2">
                    <label className="block text-xs text-gray-500 mb-1">{m.sot}</label>
                    <select
                      value={selectedValue}
                      onChange={e => handleSotHeaderChange(m.sot, e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {sot.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Submit and validation for all modes */}
      <ConfigSubmit
        func={func}
        newPanelName={newPanelName}
        uploadedFile={uploadedFile}
        addedMappings={addedMappings}
        selectedPanel={selectedPanel}
        selectedMappings={selectedMappings}
      />
    </div>
  );
}

// ConfigSubmit: Handles validation and submit for all config modes
function ConfigSubmit({ func, newPanelName, uploadedFile, addedMappings, selectedPanel, selectedMappings, onSuccess }) {
  const [submitted, setSubmitted] = useState(false);
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);

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

        // Upload file and save panel config
        await uploadPanelFile(uploadedFile);
        await savePanelConfig({
          name: newPanelName,
          mappings: addedMappings
        });
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

        // Modify panel config
        await modifyPanelConfig({
          panelName: selectedPanel,
          mappingId: selectedMappings[0]
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
      if (onSuccess) onSuccess();
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
      <button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md shadow mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        onClick={handleSubmit}
        disabled={isDisabled || loading}
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
      {warning && (
        <div className="text-red-600 text-center mt-2 font-medium">{warning}</div>
      )}
      {submitted && !warning && (
        <div className="text-green-600 text-center mt-2 font-medium">Submitted successfully</div>
      )}
    </>
  );
} 