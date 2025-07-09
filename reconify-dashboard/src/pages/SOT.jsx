import { useState } from 'react';
import { FiUpload } from 'react-icons/fi';

const INITIAL_SOT_ROWS = [
  { id: 1, name: 'SOT 1', rows: 1500, lastRefreshed: '2025-07-04 12:00', uploadedBy: 'Admin' },
  { id: 2, name: 'SOT 2', rows: 980, lastRefreshed: '2025-07-04 09:30', uploadedBy: 'Alice' },
  { id: 3, name: 'SOT 3', rows: 2050, lastRefreshed: '2025-07-03 18:15', uploadedBy: 'Bob' },
];

function formatDateTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleString();
}

export default function SOT() {
  const [rows, setRows] = useState(INITIAL_SOT_ROWS);

  async function handleUpload(idx, e) {
    const file = e.target.files[0];
    if (!file) return;

    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sotId', rows[idx].id);

    // Simulate API call (replace with real endpoint)
    // const response = await fetch('/api/upload-sot', {
    //   method: 'POST',
    //   body: formData,
    // });
    // const data = await response.json();

    // Mock API response for now
    setTimeout(() => {
      const now = new Date();
      const mockRowCount = Math.floor(Math.random() * 2000) + 1;
      setRows(prev => prev.map((row, i) =>
        i === idx
          ? { ...row, lastRefreshed: now, rows: mockRowCount }
          : row
      ));
    }, 800);

    e.target.value = '';
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-12 py-6 mt-8">
        <div className="bg-white rounded-lg shadow-sm px-4 py-6 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Source of Truth</h2>
          <table className="min-w-full text-sm text-left border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">SOT</th>
                <th className="px-4 py-2 border">#Rows</th>
                <th className="px-4 py-2 border">Last Refreshed DateTime</th>
                <th className="px-4 py-2 border">Uploaded By</th>
                <th className="px-4 py-2 border text-center">Upload</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className="border-b">
                  <td className="px-4 py-2 border">{row.name}</td>
                  <td className="px-4 py-2 border">{row.rows}</td>
                  <td className="px-4 py-2 border">{formatDateTime(row.lastRefreshed)}</td>
                  <td className="px-4 py-2 border">{row.uploadedBy}</td>
                  <td className="px-4 py-2 border text-center">
                    <label className="inline-flex items-center justify-center w-8 h-8 rounded bg-primary text-white hover:bg-primary-dark cursor-pointer">
                      <FiUpload className="w-5 h-5" />
                      <input type="file" onChange={e => handleUpload(idx, e)} className="hidden" />
                    </label>
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