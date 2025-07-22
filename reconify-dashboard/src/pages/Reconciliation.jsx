import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BsBinocularsFill, BsCheckCircle, BsCheckCircleFill } from 'react-icons/bs';
import { HiOutlineUpload } from 'react-icons/hi';
import { FiUpload, FiSettings } from 'react-icons/fi';
import Tooltip from '../components/Tooltip.jsx';
import { 
  getPanels, 
  uploadPanelFile, 
  uploadPanelFileWithHistory,
  categorizeUsers,
  reconcilePanelWithHR, 
  recategorizeUsers, 
  getAllReconHistory,
  getReconSummaries 
} from '../utils/api';
import { formatDateTime } from '../utils/dateTime';
import '../styles/tables.css';

// Real data structure for reconciliation history

function Progress({ percent }) {
  return (
    <div className="w-24">
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs ml-1">{percent}%</span>
    </div>
  );
}

export default function Reconciliation() {
  const [panel, setPanel] = useState(' -- Select -- ');
  const [rows, setRows] = useState([]);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [recategoriseModalOpen, setRecategoriseModalOpen] = useState(false);
  const [recategoriseFiles, setRecategoriseFiles] = useState([]);
  const [recategoriseDragActive, setRecategoriseDragActive] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availablePanels, setAvailablePanels] = useState([]);

  const MAX_FILES = 10;
  const MAX_SIZE_MB = 50;

  // Load real data from backend
  useEffect(() => {
    loadReconciliationData();
    loadAvailablePanels();
  }, []);

  const loadReconciliationData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load reconciliation history and summaries
      const [historyData, summariesData] = await Promise.all([
        getAllReconHistory(),
        getReconSummaries()
      ]);

      // Combine and format the data
      const formattedRows = historyData.map(item => ({
        userName: item.uploadedby || item.uploaded_by || 'Unknown',
        dateTime: item.timestamp || item.upload_date || new Date().toISOString(),
        panelName: item.panelname || item.panel_name || 'Unknown Panel',
        docId: item.docid || item.id || `DOC${Math.random().toString(36).substr(2, 9)}`,
        rows: item.total_records || item.row_count || 0,
        uploaded: 100, // Assuming uploaded files are complete
        status: item.status || 'Ready to Recon',
        reconReady: item.status === 'Ready to Recon',
        recategoriseReady: item.status === 'Recon Finished',
        completed: item.status === 'Completed',
        reconId: item.recon_id
      }));

      setRows(formattedRows);
    } catch (err) {
      setError('Failed to load reconciliation data: ' + err.message);
      console.error('Error loading reconciliation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePanels = async () => {
    try {
      const panelsData = await getPanels();
      setAvailablePanels(panelsData.map(p => p.name));
    } catch (err) {
      console.error('Error loading panels:', err);
    }
  };

  function validateAndSet(selected) {
    if (!selected?.length) return;
    if (selected.length > MAX_FILES) {
      alert(`Please select no more than ${MAX_FILES} files.`);
      return;
    }
    const oversize = Array.from(selected).find((f) => f.size / (1024 * 1024) > MAX_SIZE_MB);
    if (oversize) {
      alert(`File "${oversize.name}" exceeds ${MAX_SIZE_MB} MB.`);
      return;
    }
    setFiles(Array.from(selected));
  }

  function handleFilesChange(e) {
    validateAndSet(e.target.files);
  }
  function handleDragOver(e) { e.preventDefault(); setDragActive(true);}  
  function handleDragLeave(e) { e.preventDefault(); setDragActive(false);}  
  function handleDrop(e) { e.preventDefault(); setDragActive(false); validateAndSet(e.dataTransfer.files);}

  // Recategorise file handling
  function validateAndSetRecategorise(selected) {
    if (!selected?.length) return;
    if (selected.length > MAX_FILES) {
      alert(`Please select no more than ${MAX_FILES} files.`);
      return;
    }
    const oversize = Array.from(selected).find((f) => f.size / (1024 * 1024) > MAX_SIZE_MB);
    if (oversize) {
      alert(`File "${oversize.name}" exceeds ${MAX_SIZE_MB} MB.`);
      return;
    }
    setRecategoriseFiles(Array.from(selected));
  }

  function handleRecategoriseFilesChange(e) {
    validateAndSetRecategorise(e.target.files);
  }
  function handleRecategoriseDragOver(e) { e.preventDefault(); setRecategoriseDragActive(true);}  
  function handleRecategoriseDragLeave(e) { e.preventDefault(); setRecategoriseDragActive(false);}  
  function handleRecategoriseDrop(e) { e.preventDefault(); setRecategoriseDragActive(false); validateAndSetRecategorise(e.dataTransfer.files);}  

  const handleUpload = async () => {
    if (!files.length) return;
    if (panel === ' -- Select -- ') {
      alert('Please select a panel before uploading.');
      return;
    }

    try {
      setLoading(true);
      
      // Upload each file to the backend with history tracking
      for (const file of files) {
        await uploadPanelFileWithHistory(panel, file);
      }

      // Reload the data to show the new uploads
      await loadReconciliationData();
      
      setFiles([]);
      document.getElementById('dropzone-file').value = '';
      
      alert('Files uploaded successfully!');
    } catch (err) {
      setError('Failed to upload files: ' + err.message);
      console.error('Error uploading files:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = (index) => setRows((prev)=> prev.map((r,i)=> (i===index && !r.completed) ? {...r, completed: true} : r));
  const handleRecon = async (index) => {
    const row = rows[index];
    if (!row) return;

    try {
      setLoading(true);
      
      // Step 1: Categorize users first
      await categorizeUsers(row.panelName);
      
      // Step 2: Call backend reconciliation API
      await reconcilePanelWithHR(row.panelName);
      
      // Reload data to get updated status
      await loadReconciliationData();
      
    } catch (err) {
      setError('Failed to start reconciliation: ' + err.message);
      console.error('Error starting reconciliation:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRecategorise = (index) => {
    // Open recategorise modal
    setSelectedRowIndex(index);
    setRecategoriseModalOpen(true);
    setRecategoriseFiles([]);
  };
  
  const handleRecategoriseUpload = async () => {
    if (!recategoriseFiles.length) return;
    
    const row = rows[selectedRowIndex];
    if (!row) return;

    try {
      setLoading(true);
      
      // Upload recategorisation file to backend
      await recategorizeUsers(row.panelName, recategoriseFiles[0]);
      
      // Reload data to get updated status
      await loadReconciliationData();
      
      // Close modal
      setRecategoriseModalOpen(false);
      setRecategoriseFiles([]);
      setRecategoriseDragActive(false);
      setSelectedRowIndex(null);
      
    } catch (err) {
      setError('Failed to recategorise: ' + err.message);
      console.error('Error recategorising:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRecategoriseCancel = () => {
    setRecategoriseModalOpen(false);
    setRecategoriseFiles([]);
    setRecategoriseDragActive(false);
    setSelectedRowIndex(null);
  };
  
  // Handle escape key to close modal
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && recategoriseModalOpen) {
      handleRecategoriseCancel();
    }
  };
  const handleCancel=(index)=> setRows(prev=> prev.filter((_,i)=> i!==index));

  return (
    <div className="bg-gray-50 min-h-screen pt-14">
      {/* Constrained content container */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-12 py-6">
        <div className="w-full bg-white px-4 py-6 sm:px-6 lg:px-8 rounded-lg shadow-sm">
          {/* Loading and Error States */}
          {loading && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-blue-800">Loading...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <span className="text-red-800">{error}</span>
            </div>
          )}
          {/* Upload section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-16 gap-y-6">
            {/* Panel selector inline */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Panel</span>
              <select value={panel} onChange={(e)=>setPanel(e.target.value)} className="border border-gray-300 bg-white rounded-md p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary flex-1">
                <option> -- Select -- </option>
                {availablePanels.map((panelName) => (
                  <option key={panelName} value={panelName}>{panelName}</option>
                ))}
              </select>
            </div>

            {/* File selector inline */}
            <div className="lg:col-span-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">File</span>
              <div className="flex items-center gap-2 flex-1">
                <label
                  htmlFor="dropzone-file"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex items-center justify-center w-full md:w-4/5 h-10 border-2 border-dashed rounded-md cursor-pointer transition-colors text-sm gap-2 ${dragActive ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'} ${panel === ' -- Select -- ' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <HiOutlineUpload className="text-gray-500 w-5 h-5" />
                  <span className="text-gray-600">Browse files</span>
                  <input id="dropzone-file" type="file" multiple onChange={handleFilesChange} className="hidden" disabled={panel === ' -- Select -- '} />
                </label>
                {/* Upload icon button */}
                <button
                  onClick={handleUpload}
                  disabled={!files.length || panel===' -- Select --'}
                  className="w-10 h-10 flex items-center justify-center bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none disabled:opacity-50"
                >
                  <FiUpload className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          {/* Reserved line for file selection message, indented to align with file input */}
          <div className="h-5 mt-1 flex">
            <div className="flex-1"></div>
            <div className="w-full md:w-4/5">
              {files.length > 0 && (
                <span className="text-green-600 text-sm font-medium ml-2">File Selected Successfully</span>
              )}
            </div>
          </div>


          {/* Table */}
          <div className="table-container mt-10 max-h-[60vh] overflow-y-auto">
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="table-header th">Panel Name</th>
                  <th className="table-header th">DateTime</th>
                  <th className="table-header th">Author</th>
                  <th className="table-header th">#Rows</th>
                  <th className="table-header th">Uploaded</th>
                  <th className="table-header th">Status</th>
                  <th className="table-header th">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {rows.map((row,idx)=>(
                  <tr key={idx} className="table-row whitespace-nowrap">
                    <td className="table-cell"><Link to={`/documents/${row.docId}`} className="text-primary underline hover:text-primary-dark">{row.panelName}</Link></td>
                    <td className="table-cell">{formatDateTime(row.dateTime)}</td>
                    <td className="table-cell">{row.userName}</td>
                    <td className="table-cell">{row.rows}</td>
                    <td className="table-cell"><Progress percent={row.uploaded} /></td>
                    <td className="table-cell">{row.status}</td>
                    <td className="table-cell"><div className="flex items-center space-x-2">
                      <Tooltip label="Recon">
                        <button disabled={!row.reconReady} onClick={()=>handleRecon(idx)} className={`w-8 h-8 flex items-center justify-center rounded-md ${row.reconReady?'bg-primary text-white hover:bg-primary-dark':'bg-gray-400 text-white cursor-not-allowed'}`}>
                          <BsBinocularsFill className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip label="Recategorise">
                        <button 
                          disabled={!row.recategoriseReady} 
                          onClick={()=>handleRecategorise(idx)} 
                          className={`w-8 h-8 flex items-center justify-center rounded-md ${
                            row.recategoriseReady 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-gray-400 text-white cursor-not-allowed'
                          }`}
                        >
                          <FiSettings className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip label="Cancel">
                        <button onClick={()=>handleCancel(idx)} className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-red-600 hover:bg-gray-100">×</button>
                      </Tooltip>
                      <Tooltip label="Complete">
                        <button disabled={row.status!=='Recategorised'} onClick={()=>toggleComplete(idx)} className={`w-8 h-8 flex items-center justify-center rounded-md ${row.status==='Recategorised' ? (row.completed ? 'bg-green-600 text-white' : 'border border-green-600 text-green-600') : 'border border-gray-300 text-gray-400 cursor-not-allowed'}` }>
                          {row.completed ? <BsCheckCircleFill className="w-4 h-4"/> : <BsCheckCircle className="w-4 h-4"/>}
                        </button>
                      </Tooltip>
                    </div></td>
                  </tr>
                ))}
              </tbody></table>
          </div>
        </div>
      </div>

      {/* Recategorise Modal */}
      {recategoriseModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50" onKeyDown={handleKeyDown} tabIndex={0}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recategorise Document</h3>
              <button
                onClick={handleRecategoriseCancel}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Upload a new document to recategorise the data for <strong>{rows[selectedRowIndex]?.panelName}</strong>
              </p>
              
              <div className="space-y-3">
                <label
                  htmlFor="recategorise-dropzone-file"
                  onDragOver={handleRecategoriseDragOver}
                  onDragLeave={handleRecategoriseDragLeave}
                  onDrop={handleRecategoriseDrop}
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    recategoriseDragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <HiOutlineUpload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">CSV, Excel files up to 50MB</p>
                  <input 
                    id="recategorise-dropzone-file" 
                    type="file" 
                    multiple 
                    onChange={handleRecategoriseFilesChange} 
                    className="hidden" 
                  />
                </label>
                
                {recategoriseFiles.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-800 font-medium">
                      {recategoriseFiles.length} file(s) selected
                    </p>
                    <ul className="text-xs text-green-700 mt-1">
                      {recategoriseFiles.map((file, idx) => (
                        <li key={idx}>• {file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleRecategoriseCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleRecategoriseUpload}
                disabled={!recategoriseFiles.length}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload & Recategorise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 