import React, { useState, useEffect } from 'react';
import { getReconSummaries } from '../utils/api';
import { formatDateTime } from '../utils/dateTime';
import '../styles/tables.css';

export default function Reports() {
  const [reconSummaries, setReconSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReconSummaries();
  }, []);

  const loadReconSummaries = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Add cache busting timestamp to force fresh data
      const summaries = await getReconSummaries();
      console.log('Fresh data loaded from API:', summaries.slice(0, 3)); // Log first 3 records
      
      // Sort by date descending (newest first)
      const sortedSummaries = summaries.sort((a, b) => 
        new Date(b.start_date || b.upload_date || 0) - new Date(a.start_date || a.upload_date || 0)
      );
      setReconSummaries(sortedSummaries);
    } catch (err) {
      setError('Failed to load reconciliation reports: ' + err.message);
      console.error('Error loading recon summaries:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00baf2]"></div>
            <span className="text-lg text-gray-600">Loading reports...</span>
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
            Reconciliation Reports
          </h1>
          <button
            onClick={loadReconSummaries}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#00baf2] text-white rounded-lg shadow hover:bg-[#00a4d6] disabled:opacity-50 transition"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Reports Table */}
        {reconSummaries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-500 text-lg">No reconciliation reports found</div>
            <p className="text-gray-400 mt-2">Reconciliation reports will appear here after running the reconciliation process.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="table-container">
              <table className="data-table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header th">Recon ID</th>
                    <th className="table-header th">Panel Name</th>
                    <th className="table-header th">Status</th>
                    <th className="table-header th">Date</th>
                    <th className="table-header th">Total Users</th>
                    <th className="table-header th">Matched</th>
                    <th className="table-header th">Found Active</th>
                    <th className="table-header th">Not Found</th>
                    <th className="table-header th">Performed By</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {reconSummaries.map((summary, idx) => (
                    <tr key={summary.recon_id || idx} className="table-row">
                      <td className="table-cell font-mono text-sm">
                        {summary.recon_id || 'N/A'}
                      </td>
                      <td className="table-cell font-medium">
                        {summary.panelname || summary.panel_name || 'N/A'}
                      </td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          summary.status === 'complete' 
                            ? 'bg-green-100 text-green-800' 
                            : summary.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {summary.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="table-cell">
                        {formatDateTime(summary.start_date || summary.upload_date)}
                      </td>
                      <td className="table-cell">
                        {summary.summary?.total_panel_users?.toLocaleString() || '0'}
                      </td>
                      <td className="table-cell">
                        {summary.summary?.matched?.toLocaleString() || '0'}
                      </td>
                      <td className="table-cell">
                        {summary.summary?.found_active?.toLocaleString() || '0'}
                      </td>
                      <td className="table-cell">
                        {summary.summary?.not_found?.toLocaleString() || '0'}
                      </td>
                      <td className="table-cell">
                        {summary.performed_by || 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {reconSummaries.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-gray-900">
                {reconSummaries.length}
              </div>
              <div className="text-gray-600">Total Reports</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-green-600">
                {reconSummaries.filter(s => s.status === 'complete').length}
              </div>
              <div className="text-gray-600">Successful</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-red-600">
                {reconSummaries.filter(s => s.status === 'failed').length}
              </div>
              <div className="text-gray-600">Failed</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-blue-600">
                {reconSummaries.reduce((sum, s) => sum + (s.summary?.total_panel_users || 0), 0).toLocaleString()}
              </div>
              <div className="text-gray-600">Total Users Processed</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 