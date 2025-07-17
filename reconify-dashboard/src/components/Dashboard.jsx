import { useState } from 'react';
import { Link } from 'react-router-dom';

// Dummy data to simulate uploaded documents
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
    completed: true,
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
    completed: true,
  },
    ];
  
function Progress({ percent }) {
    return (
    <div className="w-24">
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-primary h-2.5 rounded-full"
          style={{ width: `${percent}%` }}
        />
                </div>
      <span className="text-xs ml-1">{percent}%</span>
              </div>
  );
}

export default function Dashboard() {
  const [panel, setPanel] = useState('Panel');
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
      alert(`File \"${oversize.name}\" exceeds ${MAX_SIZE_MB} MB.`);
      return;
    }
    setFiles(Array.from(selected));
  }

  function handleFilesChange(e) {
    validateAndSet(e.target.files);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    validateAndSet(e.dataTransfer.files);
  }

  function handleUpload() {
    if (!files.length) return;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 16).replace('T', ' ');
    const newRows = files.map((file, idx) => ({
      userName: 'Current User',
      dateTime: dateStr,
      panelName: panel === 'Panel' ? 'N/A' : panel,
      docId: file.name,
      rows: Math.floor(Math.random() * 200) + 20,
      uploaded: 100,
      status: 'Ready to Recon',
      reconReady: true,
      completed: false,
    }));
    setRows((prev) => [...newRows, ...prev]);
    setFiles([]);
    // reset input value
    document.getElementById('dropzone-file').value = '';
  }

  function toggleComplete(index) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, completed: !row.completed } : row))
    );
  }

  function handleRecon(index) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              status: 'Recon Finished',
              reconReady: false,
            }
          : row
      )
    );
  }

  function handleCancel(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white p-8 rounded-lg shadow-sm">
        {/* Upload section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel selector */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Panel</label>
                <select
              value={panel}
              onChange={(e) => setPanel(e.target.value)}
              className="border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary rounded-md p-2"
                >
              <option>Panel</option>
                  <option>Panel 1</option>
                  <option>Panel 2</option>
              <option>Panel 3</option>
                </select>
              </div>

          {/* Drop zone */}
          <div className="lg:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Select File
            </label>
            <label
              htmlFor="dropzone-file"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${dragActive ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  className="w-8 h-8 mb-4 text-gray-500"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 16"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M1 13V3a2 2 0 0 1 2-2h3m8 0h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-2m6.5-11 4 4-4 4m4-4H9"
                  />
                </svg>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Upload Documents</span>
                </p>
                <p className="text-xs text-gray-500">
                  Drag and drop your files here, or <span className="underline">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Maximum 10 files, up to 50 MB each</p>
              </div>
              <input id="dropzone-file" type="file" multiple onChange={handleFilesChange} className="hidden" />
            </label>
          </div>
            </div>

        {/* Upload button */}
        <div className="flex justify-center mt-6">
          <button onClick={handleUpload} className="bg-primary text-white px-8 py-2 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" disabled={!files.length || panel === 'Panel'}>
                Upload
              </button>
            </div>

        {/* Table */}
            <div className="mt-10 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700">
                  <tr>
                <th className="px-4 py-3 font-medium">User Name</th>
                <th className="px-4 py-3 font-medium">DateTime</th>
                <th className="px-4 py-3 font-medium">Panel Name</th>
                <th className="px-4 py-3 font-medium">Rows</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row, idx) => (
                <tr key={idx} className="whitespace-nowrap">
                  <td className="px-4 py-3">{row.userName}</td>
                  <td className="px-4 py-3">{row.dateTime}</td>
                  <td className="px-4 py-3">
                    <Link to={`/documents/${row.docId}`} className="text-primary underline hover:text-primary-dark">
                      {row.panelName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.rows}</td>
                  <td className="px-4 py-3">
                    <Progress percent={row.uploaded} />
                      </td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                        <button
                        disabled={!row.reconReady}
                        onClick={() => handleRecon(idx)}
                        className={`px-3 py-1 rounded-md text-white text-xs ${row.reconReady ? 'bg-success hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                        Recon
                        </button>
                        <button
                        onClick={() => toggleComplete(idx)}
                        className={`px-3 py-1 rounded-md text-xs border inline-flex items-center gap-1 ${row.completed ? 'border-primary text-primary bg-primary/5' : 'border-gray-300 text-gray-500'}`}
                        >
                        <span className={`${row.completed ? 'opacity-100' : 'opacity-0'}`}>✓</span>
                        <span>Complete</span>
                        </button>
                      <button className="text-red-600 text-lg leading-none" onClick={() => handleCancel(idx)}>
                        ×
                        </button>
                    </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </div>
      </div>
    );
}
  