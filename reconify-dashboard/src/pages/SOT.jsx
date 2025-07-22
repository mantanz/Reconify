import React, { useState, useEffect } from 'react';
import { FiUpload, FiRefreshCw } from 'react-icons/fi';
import { getSOTList, getSOTInfo, uploadSOTFile, getSOTUploads } from '../utils/api';
import { formatDateTime } from '../utils/dateTime';

export default function SOT() {
  const [sots, setSots] = useState([]);
  const [sotData, setSotData] = useState({});
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingSOT, setUploadingSOT] = useState(null);

  // Load SOT data on component mount
  useEffect(() => {
    loadSOTData();
  }, []);

  const loadSOTData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fixed SOTs in specific order with hr_data first
      const fixedSOTs = ['hr_data', 'service_users', 'internal_users', 'thirdparty_users'];
      setSots(fixedSOTs);

      // Load uploads data
      const uploadsData = await getSOTUploads();
      setUploads(uploadsData || []);

      // Load info for each fixed SOT
      const sotInfoMap = {};
      await Promise.all(
        fixedSOTs.map(async (sotName) => {
          try {
            const info = await getSOTInfo(sotName);
            sotInfoMap[sotName] = info;
          } catch (err) {
            console.warn(`Failed to load info for SOT ${sotName}:`, err);
            sotInfoMap[sotName] = {
              sot_name: sotName,
              row_count: 0,
              columns: [],
              sample_data: []
            };
          }
        })
      );

      setSotData(sotInfoMap);
    } catch (err) {
      setError('Failed to load SOT data: ' + err.message);
      console.error('Error loading SOT data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLastUpload = (sotName) => {
    // Find the most recent upload for this SOT
    const sotUploads = uploads.filter(upload => upload.sot_type === sotName);
    if (sotUploads.length === 0) return null;
    
    // Sort by timestamp descending and return the first (most recent)
    return sotUploads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  };

  const loadIndividualSOTData = async (sotName) => {
    try {
      // Load info for this specific SOT
      const [info, uploadsData] = await Promise.all([
        getSOTInfo(sotName),
        getSOTUploads()
      ]);
      
      // Update SOT data for this specific SOT
      setSotData(prev => ({
        ...prev,
        [sotName]: info
      }));
      
      // Update uploads list
      setUploads(uploadsData || []);
    } catch (err) {
      console.warn(`Failed to reload data for SOT ${sotName}:`, err);
    }
  };

  const handleUpload = async (sotName, file) => {
    if (!file) return;

    try {
      setUploadingSOT(sotName);
      setError('');

      // Upload the file
      const result = await uploadSOTFile(file, sotName);
      
      if (result.error) {
        setError(`Upload failed for ${sotName}: ${result.error}`);
      } else {
        // Reload only this SOT's data instead of full page reload
        await loadIndividualSOTData(sotName);
      }
    } catch (err) {
      setError(`Upload failed for ${sotName}: ${err.message}`);
      console.error('Error uploading SOT file:', err);
    } finally {
      setUploadingSOT(null);
    }
  };

  const handleFileChange = (sotName, event) => {
    const file = event.target.files[0];
    if (file) {
      handleUpload(sotName, file);
    }
    // Reset the input value so the same file can be uploaded again if needed
    event.target.value = '';
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <FiRefreshCw className="w-6 h-6 animate-spin text-[#00baf2]" />
            <span className="text-lg text-gray-600">Loading SOT data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Source of Truth Management
          </h1>
          <button
            onClick={loadSOTData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#00baf2] text-white rounded-lg shadow hover:bg-[#00a4d6] disabled:opacity-50 transition"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* SOT Table */}
        <div className="overflow-x-auto rounded-2xl shadow-lg bg-white">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="bg-[#53c2f1] text-white text-sm uppercase">
              <tr>
                <th className="px-6 py-4">SOT Name</th>
                <th className="px-6 py-4">#Rows</th>
                <th className="px-6 py-4">Last Refreshed</th>
                <th className="px-6 py-4">Uploaded By</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
                         <tbody className="divide-y divide-gray-200">
               {sots.map((sotName) => {
                  const info = sotData[sotName] || {};
                  const lastUpload = getLastUpload(sotName);
                  const isUploading = uploadingSOT === sotName;
                  
                  return (
                    <tr
                      key={sotName}
                      className="hover:bg-gray-50 transition duration-200"
                    >
                                             <td className="px-6 py-4 font-medium">{sotName}</td>
                       <td className="px-6 py-4">
                         {info.row_count !== undefined ? (info.row_count === 0 ? '0' : info.row_count.toLocaleString()) : 'N/A'}
                       </td>
                      <td className="px-6 py-4">
                        {lastUpload ? formatDateTime(lastUpload.timestamp) : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        {lastUpload ? lastUpload.uploaded_by : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          lastUpload?.status === 'uploaded' || lastUpload?.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : lastUpload?.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {lastUpload?.status || 'No uploads'}
                        </span>
                      </td>
                                             <td className="px-6 py-4 text-center">
                         <label className={`inline-flex items-center justify-center w-10 h-10 bg-[#00baf2] text-white rounded-lg shadow hover:bg-[#00a4d6] transition cursor-pointer ${
                           isUploading ? 'opacity-50 cursor-not-allowed' : ''
                         }`}>
                           {isUploading ? (
                             <FiRefreshCw className="w-5 h-5 animate-spin" />
                           ) : (
                             <FiUpload className="w-5 h-5" />
                           )}
                           <input
                             type="file"
                             className="hidden"
                             accept=".csv,.xlsx,.xls"
                             onChange={(e) => handleFileChange(sotName, e)}
                             disabled={isUploading}
                           />
                         </label>
                       </td>
                    </tr>
                                       );
                 })
               }
             </tbody>
          </table>
        </div>

        
      </div>
    </div>
  );
}
