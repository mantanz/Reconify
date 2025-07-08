import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BsBinocularsFill, BsCheckCircle, BsCheckCircleFill } from 'react-icons/bs';
import { HiOutlineUpload } from 'react-icons/hi';
import { FiUpload } from 'react-icons/fi';
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
      completed: false,
    }));
    setRows((prev) => [...newRows, ...prev]);
    setFiles([]);
    document.getElementById('dropzone-file').value = '';
  }

  const toggleComplete = (index) => setRows((prev)=> prev.map((r,i)=> (i===index && !r.completed) ? {...r, completed: true} : r));
  const handleRecon = (index)=> setRows((prev)=> prev.map((r,i)=> i===index? {...r,status:'Recon Finished',reconReady:false} : r));
  const handleCancel=(index)=> setRows(prev=> prev.filter((_,i)=> i!==index));

  return (
    <div className="bg-gray-50 min-h-screen">
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
                  className={`flex items-center justify-center w-full md:w-4/5 h-10 border-2 border-dashed rounded-md cursor-pointer transition-colors text-sm gap-2 ${dragActive ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                >
                  <HiOutlineUpload className="text-gray-500 w-5 h-5" />
                  <span className="text-gray-600">Browse files</span>
                  <input id="dropzone-file" type="file" multiple onChange={handleFilesChange} className="hidden" />
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
          <div className="mt-10 overflow-x-auto">
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
                      <Tooltip label="Cancel">
                        <button onClick={()=>handleCancel(idx)} className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-red-600 hover:bg-gray-100">×</button>
                      </Tooltip>
                      <Tooltip label="Complete">
                        <button disabled={row.status!=='Recon Finished'} onClick={()=>toggleComplete(idx)} className={`w-8 h-8 flex items-center justify-center rounded-md ${row.status==='Recon Finished' ? (row.completed ? 'bg-green-600 text-white' : 'border border-green-600 text-green-600') : 'border border-gray-300 text-gray-400 cursor-not-allowed'}` }>
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
    </div>
  );
} 