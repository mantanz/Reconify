import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BsBinocularsFill, BsCheckCircle, BsCheckCircleFill } from 'react-icons/bs';
import { HiOutlineUpload } from 'react-icons/hi';
import { FiUpload, FiSettings } from 'react-icons/fi';
import Tooltip from '../components/Tooltip.jsx';

// contents copied from Dashboard with modifications
// Dummy data ...
const initialRows = [
  {
    userName: 'John Doe',
    dateTime: '2025-07-04 14:00',
    panelName: 'Panel 1',
    docId: 'DOC123',
    rows: 120,
    uploaded: 70,   
    status: 'Processing',
    reconReady: false,
    recategoriseReady: false,
    completed: false,
  },
  {
    userName: 'John Doe',
    dateTime: '2025-07-04 14:00',
    panelName: 'Panel 2',
    docId: 'DOC456',
    rows: 200,
    uploaded: 100,
    status: 'Ready to Recon',
    reconReady: true,
    recategoriseReady: false,
    completed: false,
  },
  {
    userName: 'John Doe',
    dateTime: '2025-07-04 14:00',
    panelName: 'Panel 3',
    docId: 'DOC789',
    rows: 90,
    uploaded: 100,
    status: 'Recon Finished',
    reconReady: false,
    recategoriseReady: true,
    completed: false,
  },
];

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
  const [rows, setRows] = useState(initialRows);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [recategoriseModalOpen, setRecategoriseModalOpen] = useState(false);
  const [recategoriseFiles, setRecategoriseFiles] = useState([]);
  const [recategoriseDragActive, setRecategoriseDragActive] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);

  const MAX_FILES = 10;
  const MAX_SIZE_MB = 50;

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

  function handleUpload() {
    if (!files.length) return;
    if (panel === ' -- Select -- ') {
      alert('Please select a panel before uploading.');
      return;
    }
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 16).replace('T', ' ');
    const newRows = files.map((file) => ({
      userName: 'Current User',
      dateTime: dateStr,
      panelName: panel,
      docId: file.name,
      rows: Math.floor(Math.random() * 200) + 20,
      uploaded: 100,
      status: 'Ready to Recon',
      reconReady: true,
      recategoriseReady: false,
      completed: false,
    }));
    setRows((prev) => [...newRows, ...prev]);
    setFiles([]);
    document.getElementById('dropzone-file').value = '';
  }

  const toggleComplete = (index) => setRows((prev)=> prev.map((r,i)=> (i===index && !r.completed) ? {...r, completed: true} : r));
  const handleRecon = (index) => {
    // Start recon process immediately
    setRows((prev)=> prev.map((r,i)=> i===index? {
      ...r,
      status:'Recon Finished',
      reconReady: false,
      recategoriseReady: true
    } : r));
  };
  
  const handleRecategorise = (index) => {
    // Open recategorise modal
    setSelectedRowIndex(index);
    setRecategoriseModalOpen(true);
    setRecategoriseFiles([]);
  };
  
  const handleRecategoriseUpload = () => {
    if (!recategoriseFiles.length) return;
    
    // Process recategorise upload
    setRows((prev)=> prev.map((r,i)=> i===selectedRowIndex? {
      ...r,
      status:'Recategorised',
      reconReady: false,
      recategoriseReady: false
    } : r));
    
    // Close modal
    setRecategoriseModalOpen(false);
    setRecategoriseFiles([]);
    setRecategoriseDragActive(false);
    setSelectedRowIndex(null);
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
          {/* Upload section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-16 gap-y-6">
            {/* Panel selector inline */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Panel</span>
              <select value={panel} onChange={(e)=>setPanel(e.target.value)} className="border border-gray-300 bg-white rounded-md p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary flex-1">
                <option> -- Select -- </option>
                <option>Panel 1</option>
                <option>Panel 2</option>
                <option>Panel 3</option>
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
          <div className="mt-10 overflow-x-auto max-h-[60vh] overflow-y-auto rounded-md border border-gray-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Panel Name</th>
                  <th className="px-4 py-3 font-medium">DateTime</th>
                  <th className="px-4 py-3 font-medium">Author</th>
                  <th className="px-4 py-3 font-medium">#Rows</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((row,idx)=>(
                  <tr key={idx} className="whitespace-nowrap">
                    <td className="px-4 py-3"><Link to={`/documents/${row.docId}`} className="text-primary underline hover:text-primary-dark">{row.panelName}</Link></td>
                    <td className="px-4 py-3">{row.dateTime}</td>
                    <td className="px-4 py-3">{row.userName}</td>
                    <td className="px-4 py-3">{row.rows}</td>
                    <td className="px-4 py-3"><Progress percent={row.uploaded} /></td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3"><div className="flex items-center space-x-2">
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