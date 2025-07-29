import React, { useState, useEffect } from "react";
import { getPanels, getAllReconHistory, categorizeUsers, reconcilePanelWithHR, recategorizeUsers } from "../../services/api";
import { parseISTTimestamp, fetchWithAuth } from "../../utils/utils";
import { validateMultipleFiles, validateSingleFile } from "../../utils/fileValidation";
import { FiUpload, FiSettings, FiX } from 'react-icons/fi';
import { HiOutlineUpload } from 'react-icons/hi';
import { BsBinocularsFill, BsCheckCircle, BsCheckCircleFill, BsCheck2All } from 'react-icons/bs';
import "../../styles/tables.css";



// Progress component for upload percentage
function Progress({ percent }) {
  return (
    <div style={{ width: '96px' }}>
      <div style={{ 
        width: '100%', 
        backgroundColor: '#e5e7eb', 
        borderRadius: '9999px', 
        height: '10px',
        overflow: 'hidden'
      }}>
        <div 
          style={{ 
            backgroundColor: '#00baf2', 
            height: '10px', 
            borderRadius: '9999px',
            width: `${percent}%`,
            transition: 'width 0.3s ease'
          }} 
        />
      </div>
      <span style={{ fontSize: '12px', marginLeft: '4px' }}>{percent}%</span>
    </div>
  );
}

// Tooltip component
function Tooltip({ label, children }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} title={label}>
      {children}
    </div>
  );
}

export default function Reconciliation() {
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(" -- Select -- ");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [reconResults, setReconResults] = useState({});
  const [loading, setLoading] = useState({});
  const [currentStep, setCurrentStep] = useState({});
  const [recategorizationFile, setRecategorizationFile] = useState(null);
  const [recategorizationLoading, setRecategorizationLoading] = useState({});
  const [recategorizationCompleted, setRecategorizationCompleted] = useState({});
  const [recategorizationCancelled, setRecategorizationCancelled] = useState({});
  const [showRecategorization, setShowRecategorization] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [recategoriseDragActive, setRecategoriseDragActive] = useState(false);
  const [backgroundProcesses, setBackgroundProcesses] = useState(new Set());

  const MAX_FILES = 10;
  const MAX_SIZE_MB = 50;

  // Note: localStorage loading moved to after history is loaded

  // Save recategorization state to localStorage whenever it changes
  useEffect(() => {
    console.log('Saving completed state to localStorage:', recategorizationCompleted);
    localStorage.setItem('recategorizationCompleted', JSON.stringify(recategorizationCompleted));
  }, [recategorizationCompleted]);

  useEffect(() => {
    console.log('Saving cancelled state to localStorage:', recategorizationCancelled);
    localStorage.setItem('recategorizationCancelled', JSON.stringify(recategorizationCancelled));
  }, [recategorizationCancelled]);

  useEffect(() => {
    getPanels().then(setPanels);
    getAllReconHistory().then(setHistory);
  }, []);

  // Load persistent recategorization state from localStorage AFTER history is loaded
  useEffect(() => {
    if (history.length > 0) {
      const savedCompleted = localStorage.getItem('recategorizationCompleted');
      const savedCancelled = localStorage.getItem('recategorizationCancelled');
      
      console.log('Loading from localStorage after history loaded:', { savedCompleted, savedCancelled });
      
      if (savedCompleted) {
        const parsed = JSON.parse(savedCompleted);
        console.log('Parsed completed state:', parsed);
        setRecategorizationCompleted(parsed);
      }
      if (savedCancelled) {
        const parsed = JSON.parse(savedCancelled);
        console.log('Parsed cancelled state:', parsed);
        setRecategorizationCancelled(parsed);
      }
    }
  }, [history]);

  // Debug: Log state changes
  useEffect(() => {
    console.log('Recategorization State:', {
      completed: recategorizationCompleted,
      cancelled: recategorizationCancelled,
      loading: recategorizationLoading,
      backgroundProcesses: Array.from(backgroundProcesses)
    });
    
    // Debug: Log history items and their states
    if (history.length > 0) {
      console.log('History Items with States:', history.map((item, idx) => ({
        index: idx,
        panelname: item.panelname,
        docid: item.docid,
        doc_id: item.doc_id,
        reconId: item.docid || item.doc_id,
        isComplete: isRecategorizationComplete(item),
        isCancelled: isRecategorizationCancelled(item),
        isInProgress: isRecategorizationInProgress(item)
      })));
    }
  }, [recategorizationCompleted, recategorizationCancelled, recategorizationLoading, backgroundProcesses, history]);

  const handlePanelChange = (e) => {
    setSelectedPanel(e.target.value);
    setResult(null);
    setError("");
    setFiles([]);
  };

  // File validation and handling
  function validateAndSet(selected) {
    if (!selected?.length) return;
    
    const validation = validateMultipleFiles(selected, MAX_FILES);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }
    
    setFiles(validation.validFiles);
  }

  function handleFilesChange(e) {
    validateAndSet(e.target.files);
  }

  function handleDragOver(e) { 
    e.preventDefault(); 
    setDragActive(true);
  }

  function handleDragLeave(e) { 
    e.preventDefault(); 
    setDragActive(false);
  }

  function handleDrop(e) { 
    e.preventDefault(); 
    setDragActive(false); 
    validateAndSet(e.dataTransfer.files);
  }

  // Recategorization file handling
  function validateAndSetRecategorise(selected) {
    if (!selected?.length) return;
    
    const file = selected[0]; // Take only first file
    const validation = validateSingleFile(file);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    setRecategorizationFile(file);
  }

  function handleRecategoriseFilesChange(e) {
    validateAndSetRecategorise(e.target.files);
  }

  function handleRecategoriseDragOver(e) { 
    e.preventDefault(); 
    setRecategoriseDragActive(true);
  }

  function handleRecategoriseDragLeave(e) { 
    e.preventDefault(); 
    setRecategoriseDragActive(false);
  }

  function handleRecategoriseDrop(e) { 
    e.preventDefault(); 
    setRecategoriseDragActive(false); 
    validateAndSetRecategorise(e.dataTransfer.files);
    }

  const handleUpload = async () => {
    if (!files.length) return;
    if (selectedPanel === " -- Select -- ") {
      alert('Please select a panel before uploading.');
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);
    
    try {
    const formData = new FormData();
    formData.append("panel_name", selectedPanel);
      formData.append("file", files[0]); // Upload first file

      const res = await fetchWithAuth("http://127.0.0.1:8000/recon/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
      if (data.error) setError(data.error);
      
      // Reload history
      getAllReconHistory().then(setHistory);
      
      // Clear files
      setFiles([]);
      document.getElementById('dropzone-file').value = '';
      
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleReconcile = async (index) => {
    const upload = history[index];
    if (!upload) return;

    const uploadId = upload.docid || upload.doc_id;
    setLoading(l => ({ ...l, [uploadId]: true }));
    setCurrentStep(s => ({ ...s, [uploadId]: "Starting..." }));
    
    try {
      // Step 1: Categorize users
      setCurrentStep(s => ({ ...s, [uploadId]: "Categorizing users..." }));
      const categorizationResult = await categorizeUsers(upload.panelname);
      
      // Step 2: Reconcile with HR data
      setCurrentStep(s => ({ ...s, [uploadId]: "Reconciling with HR..." }));
      const reconciliationResult = await reconcilePanelWithHR(upload.panelname);
      
      // Store both results
      setReconResults(r => ({ 
        ...r, 
        [uploadId]: { 
          "categorization": categorizationResult,
          "hr_data": reconciliationResult 
        } 
      }));
      
      setCurrentStep(s => ({ ...s, [uploadId]: "Completed" }));
      
      // Update the history to reflect the completed status
      setHistory(prevHistory => 
        prevHistory.map(item => 
          (item.docid || item.doc_id) === uploadId 
            ? { ...item, status: "complete" }
            : item
        )
      );
    } catch (error) {
      console.error("Process failed:", error);
      setCurrentStep(s => ({ ...s, [uploadId]: "Failed" }));
      
      // Update the history to reflect the failed status
      setHistory(prevHistory => 
        prevHistory.map(item => 
          (item.docid || item.doc_id) === uploadId 
            ? { ...item, status: "failed" }
            : item
        )
      );
      
      alert("Process failed. Please check the console for details.");
    } finally {
      setLoading(l => ({ ...l, [uploadId]: false }));
    }
  };

  const handleRecategorise = (index) => {
    setSelectedRowIndex(index);
    setShowRecategorization(true);
    setRecategorizationFile(null);
  };

  const handleRecategoriseUpload = async () => {
    if (!recategorizationFile) {
      alert("Please select a recategorization file first.");
      return;
    }

    const upload = history[selectedRowIndex];
    if (!upload) return;

    const reconId = upload.docid || upload.doc_id;
    
    // Add to background processes
    setBackgroundProcesses(prev => new Set([...prev, reconId]));
    setRecategorizationLoading(l => ({ ...l, [reconId]: true }));
    
    // Clear cancelled state if it was previously cancelled
    setRecategorizationCancelled(c => ({ ...c, [reconId]: false }));
    
    // Start background process
    const processRecategorization = async () => {
      try {
        const result = await recategorizeUsers(upload.panelname, recategorizationFile);
        
        // Only show alert if modal is still open
        if (showRecategorization && selectedRowIndex !== null) {
          alert(`Recategorization completed!\n\nSummary:\n- Total users: ${result.summary.total_panel_users}\n- Matched: ${result.summary.matched}\n- Not found: ${result.summary.not_found}\n- Errors: ${result.summary.errors}`);
        }
        
        // Mark recategorization as completed for this upload
        console.log('Marking recategorization as completed for:', reconId);
        setRecategorizationCompleted(c => {
          const newState = { ...c, [reconId]: true };
          console.log('New completed state:', newState);
          return newState;
        });
        
        // Clear the file and hide recategorization interface
        setRecategorizationFile(null);
        setShowRecategorization(false);
        setSelectedRowIndex(null);
        
        // Reload history but preserve our state
        getAllReconHistory().then(newHistory => {
          setHistory(newHistory);
          // Ensure our completion state persists
          setRecategorizationCompleted(prev => {
            const finalState = { ...prev, [reconId]: true };
            console.log('Final completed state after history reload:', finalState);
            return finalState;
          });
        });
        
      } catch (error) {
        console.error("Recategorization failed:", error);
        
        // Only show alert if modal is still open
        if (showRecategorization && selectedRowIndex !== null) {
          alert(`Recategorization failed: ${error.message || "Unknown error"}`);
        }
      } finally {
        setRecategorizationLoading(l => ({ ...l, [reconId]: false }));
        setBackgroundProcesses(prev => {
          const newSet = new Set(prev);
          newSet.delete(reconId);
          return newSet;
        });
      }
    };

    // Start the background process
    processRecategorization();
  };

  const handleRecategoriseCancel = () => {
    setShowRecategorization(false);
    setRecategorizationFile(null);
    setRecategoriseDragActive(false);
    setSelectedRowIndex(null);
  };

  const handleCancelRecategorization = (index) => {
    const upload = history[index];
    if (!upload) return;

    const reconId = upload.docid || upload.doc_id;
    
    // Mark as cancelled
    setRecategorizationCancelled(c => ({ ...c, [reconId]: true }));
    
    // Remove from background processes
    setBackgroundProcesses(prev => {
      const newSet = new Set(prev);
      newSet.delete(reconId);
      return newSet;
    });
    
    // Stop loading state
    setRecategorizationLoading(l => ({ ...l, [reconId]: false }));
    
    // Close modal if open
    if (showRecategorization && selectedRowIndex === index) {
      setShowRecategorization(false);
      setRecategorizationFile(null);
      setRecategoriseDragActive(false);
      setSelectedRowIndex(null);
    }
  };

  // Handle escape key to close modal
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && showRecategorization) {
      handleRecategoriseCancel();
    }
  };

  const getStatusColor = (status) => {
    if (!status) return "#6c757d";
    const statusLower = status.toLowerCase();
    if (statusLower === "complete" || statusLower === "uploaded" || statusLower === "ready to recon" || statusLower === "recon finished") return "#27ae60";
    if (statusLower === "failed") return "#e74c3c";
    return "#6c757d";
  };

  const getDisplayStatus = (item) => {
    if (!item.status) return "Unknown";
    const statusLower = item.status.toLowerCase();
    if (statusLower === "failed") return "Failed";
    if (statusLower === "complete") return "Recon Finished";
    if (statusLower === "uploaded") return "Ready to Recon";
    return item.status;
  };

  const canStartReconciliation = (item) => {
    return item.status && item.status.toLowerCase() === "uploaded";
  };

  const isReconciliationComplete = (item) => {
    return item.status && (item.status.toLowerCase() === "complete" || item.status.toLowerCase() === "completed");
  };

  const canRecategorize = (item) => {
    return item.status && item.status.toLowerCase() === "complete";
  };

  const isRecategorizationComplete = (item) => {
    const reconId = item.docid || item.doc_id;
    return recategorizationCompleted[reconId] === true;
  };

  const isRecategorizationCancelled = (item) => {
    const reconId = item.docid || item.doc_id;
    return recategorizationCancelled[reconId] === true;
  };

  const isRecategorizationInProgress = (item) => {
    const reconId = item.docid || item.doc_id;
    return recategorizationLoading[reconId] === true || backgroundProcesses.has(reconId);
  };

  const isEntireProcessComplete = (item) => {
    return item.status && (item.status.toLowerCase() === "recategorised" || item.status.toLowerCase() === "completed") || isRecategorizationComplete(item);
  };
      
  const isAlreadyMarkedComplete = (item) => {
    return item.status && item.status.toLowerCase() === "completed";
  };

  const handleCancel = (index) => {
    setHistory(prev => prev.filter((_, i) => i !== index));
  };

  const handleMarkCompleted = (index) => {
    const upload = history[index];
    if (!upload) return;

    // Update the status to completed
    setHistory(prevHistory => 
      prevHistory.map((item, i) => 
        i === index 
          ? { ...item, status: "completed" }
          : item
      )
    );
    
    alert(`Process marked as completed for ${upload.panelname}`);
  };

  return (
    <div style={{ backgroundColor: '#f0f4ff', minHeight: '100vh', paddingTop: '56px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 12px 24px 12px' }}>
    <div style={{ 
          width: '100%', 
          backgroundColor: 'white', 
          padding: '24px', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
    }}>
          
          {/* Loading and Error States */}
          {(uploading || Object.values(loading).some(l => l)) && (
      <div style={{ 
              marginBottom: '16px', 
              padding: '16px', 
              backgroundColor: '#eff6ff', 
              border: '1px solid #dbeafe', 
              borderRadius: '6px' 
      }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ 
                  animation: 'spin 1s linear infinite',
                  borderRadius: '50%',
                  height: '16px',
                  width: '16px',
                  borderTop: '2px solid #2563eb',
                  borderRight: '2px solid transparent',
                  marginRight: '8px'
                }}></div>
                <span style={{ color: '#1e40af' }}>
                  {uploading ? 'Uploading...' : 'Processing...'}
                </span>
              </div>
            </div>
          )}
          
          {error && (
        <div style={{ 
              marginBottom: '16px', 
              padding: '16px', 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '6px' 
        }}>
              <span style={{ color: '#991b1b' }}>{error}</span>
            </div>
          )}

          {/* Upload section */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 2fr',
            gap: '64px 16px',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            {/* Panel selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151',
                whiteSpace: 'nowrap' 
              }}>
                Panel
              </span>
              <select
                value={selectedPanel}
                onChange={handlePanelChange}
                style={{
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  padding: '8px',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  outline: 'none',
                  flex: 1
                }}
              >
                <option> -- Select -- </option>
                {panels.map((panel) => (
                  <option key={panel.name} value={panel.name}>{panel.name}</option>
                ))}
              </select>
            </div>

            {/* File selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151',
                whiteSpace: 'nowrap' 
              }}>
                File
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <label
                  htmlFor="dropzone-file"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
              style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '40px',
                    border: files.length > 0 ? '2px solid #059669' : 
                            dragActive ? '2px dashed #00baf2' : '2px dashed #d1d5db',
                    borderRadius: '6px',
                    cursor: selectedPanel === ' -- Select -- ' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    gap: '8px',
                    backgroundColor: files.length > 0 ? 'rgba(5, 150, 105, 0.05)' :
                                   dragActive ? 'rgba(0, 186, 242, 0.1)' : '#f9fafb',
                    opacity: selectedPanel === ' -- Select -- ' ? 0.5 : 1
              }}
            >
                  <HiOutlineUpload style={{ 
                    color: files.length > 0 ? '#059669' : '#6b7280', 
                    width: '20px', 
                    height: '20px' 
                  }} />
              <span style={{ 
                    color: files.length > 0 ? '#059669' : '#4b5563',
                    fontWeight: files.length > 0 ? '500' : 'normal'
              }}>
                    {files.length > 0 ? files[0].name : 'Browse files'}
              </span>
              <input
                    id="dropzone-file" 
                type="file"
                    multiple 
                    accept=".xlsx,.csv,.xlsb,.xls"
                    onChange={handleFilesChange} 
                    style={{ display: 'none' }} 
                    disabled={selectedPanel === ' -- Select -- '} 
              />
                </label>

                {/* Upload button */}
            <button
                  onClick={handleUpload}
                  disabled={!files.length || selectedPanel === ' -- Select -- ' || uploading}
              style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#00baf2',
                    color: 'white',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: (!files.length || selectedPanel === ' -- Select -- ' || uploading) ? 'not-allowed' : 'pointer',
                    opacity: (!files.length || selectedPanel === ' -- Select -- ' || uploading) ? 0.5 : 1
                  }}
                >
                  <FiUpload style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
            </div>
        </div>
        




          {/* Table */}
          <div className="table-container" style={{ marginTop: '40px', maxHeight: '60vh', overflowY: 'auto' }}>
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Panel Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>DateTime</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Author</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>#Rows</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Uploaded</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Actions</th>
                  </tr>
              </thead>
              <tbody className="table-body">
                {history.map((item, idx) => (
                  <tr key={idx} className="table-row" style={{ whiteSpace: 'nowrap' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500', color: '#343a40' }}>
                          {item.panelname}
                        </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#495057' }}>
                      {parseISTTimestamp(item.timestamp)}
                        </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#495057' }}>
                      {item.uploadedby}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#495057' }}>
                          <span style={{ 
                        background: '#e3f2fd', 
                        color: '#1976d2', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontWeight: '600',
                        fontSize: '12px'
                          }}>
                            {item.total_records}
                          </span>
                        </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#495057' }}>
                      <Progress percent={100} />
                        </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                          <span style={{ 
                            color: getStatusColor(item.status), 
                        fontWeight: '600',
                        padding: '4px 8px',
                        borderRadius: '4px',
                            background: item.status === "complete" || item.status === "uploaded" ? "#e8f5e8" : 
                                       item.status === "failed" ? "#ffeaea" : "#f8f9fa"
                          }}>
                            {getDisplayStatus(item)}
                          </span>
                        </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Reconciliation Button */}
                        <Tooltip label={
                                loading[item.docid || item.doc_id] ? 
                                `Processing: ${currentStep[item.docid || item.doc_id] || "Starting..."}` :
                                canStartReconciliation(item) ? "Start Reconciliation" :
                          isReconciliationComplete(item) ? "Reconciliation Completed" :
                                "Reconciliation Not Available"
                        }>
                          <button
                            onClick={() => handleReconcile(idx)}
                            disabled={loading[item.docid || item.doc_id] || (!canStartReconciliation(item) && !isReconciliationComplete(item)) || isReconciliationComplete(item)}
                            style={{
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              borderRadius: '6px',
                              background: canStartReconciliation(item) ? '#00baf2' : 
                                         isReconciliationComplete(item) ? '#059669' : '#6c757d',
                              color: '#fff',
                              fontSize: '14px',
                              cursor: (loading[item.docid || item.doc_id] || (!canStartReconciliation(item) && !isReconciliationComplete(item)) || isReconciliationComplete(item)) ? 'not-allowed' : 'default',
                              transition: 'all 0.2s ease',
                              opacity: (canStartReconciliation(item) || isReconciliationComplete(item)) ? 1 : 0.6
                            }}
                              onMouseEnter={(e) => {
                                if (!loading[item.docid || item.doc_id] && canStartReconciliation(item) && !isReconciliationComplete(item)) {
                                  e.target.style.transform = "scale(1.1)";
                                  e.target.style.boxShadow = "0 2px 8px rgba(0,123,255,0.3)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "scale(1)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              {loading[item.docid || item.doc_id] ? "⏳" : 
                             isReconciliationComplete(item) ? <BsCheckCircleFill style={{ width: '16px', height: '16px', display: 'block' }} /> :
                             <BsBinocularsFill style={{ width: '16px', height: '16px' }} />}
                            </button>
                        </Tooltip>
                            
                            {/* Recategorization Button */}
                        <Tooltip label={
                          isRecategorizationComplete(item) ? "Recategorization Completed" :
                          isRecategorizationCancelled(item) ? "Recategorization Cancelled" :
                          isRecategorizationInProgress(item) ? "Processing Recategorization..." :
                          "Recategorise"
                        }>
                            <button
                            onClick={() => handleRecategorise(idx)}
                            disabled={!canRecategorize(item) || isRecategorizationInProgress(item) || isRecategorizationComplete(item) || isRecategorizationCancelled(item)}
                              style={{
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              borderRadius: '6px',
                              background: isRecategorizationComplete(item) ? '#059669' : 
                                         isRecategorizationCancelled(item) ? '#dc2626' :
                                         canRecategorize(item) ? '#2563eb' : '#6c757d',
                              color: '#fff',
                              fontSize: '14px',
                              cursor: (canRecategorize(item) && !isRecategorizationInProgress(item) && !isRecategorizationComplete(item) && !isRecategorizationCancelled(item)) ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s ease',
                              opacity: (canRecategorize(item) || isRecategorizationComplete(item) || isRecategorizationCancelled(item)) ? 1 : 0.6
                            }}
                            onMouseEnter={(e) => {
                              if (canRecategorize(item) && !isRecategorizationInProgress(item) && !isRecategorizationComplete(item) && !isRecategorizationCancelled(item)) {
                                e.target.style.transform = "scale(1.1)";
                                e.target.style.boxShadow = "0 2px 8px rgba(37,99,235,0.3)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = "scale(1)";
                              e.target.style.boxShadow = "none";
                            }}
                          >
                            {isRecategorizationInProgress(item) ? "⏳" : 
                             isRecategorizationComplete(item) ? <BsCheckCircleFill style={{ width: '16px', height: '16px', display: 'block' }} /> :
                             isRecategorizationCancelled(item) ? "×" :
                             <FiSettings style={{ width: '16px', height: '16px' }} />}
                          </button>
                        </Tooltip>
                        
                                                {/* Cancel Button */}
                        <Tooltip label={isRecategorizationInProgress(item) ? "Cancel Recategorization" : "Cancel"}>
                          <button 
                            onClick={isRecategorizationInProgress(item) ? () => handleCancelRecategorization(idx) : () => handleCancel(idx)} 
                            style={{
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              background: 'white',
                              color: '#dc2626',
                              fontSize: '18px',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                              onMouseEnter={(e) => {
                              e.target.style.backgroundColor = "#f3f4f6";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = "white";
                            }}
                          >
                            ×
                          </button>
                        </Tooltip>
                        
                        {/* Complete Process Button */}
                        <Tooltip label={
                          isAlreadyMarkedComplete(item) ? "Process Completed" : 
                          isEntireProcessComplete(item) ? "Mark as Completed" : 
                          "Complete Process (Available after Recategorization)"
                        }>
                          <button
                            onClick={() => handleMarkCompleted(idx)}
                            disabled={!isEntireProcessComplete(item) || isAlreadyMarkedComplete(item)}
                            style={{
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              borderRadius: '6px',
                              background: isAlreadyMarkedComplete(item) ? '#16a34a' : 
                                         isEntireProcessComplete(item) ? '#00baf2' : '#6c757d',
                              color: '#fff',
                              fontSize: '14px',
                              cursor: (isEntireProcessComplete(item) && !isAlreadyMarkedComplete(item)) ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s ease',
                              opacity: (isEntireProcessComplete(item) || isAlreadyMarkedComplete(item)) ? 1 : 0.6
                            }}
                            onMouseEnter={(e) => {
                              if (isEntireProcessComplete(item) && !isAlreadyMarkedComplete(item)) {
                                  e.target.style.transform = "scale(1.1)";
                                e.target.style.boxShadow = "0 2px 8px rgba(0,186,242,0.3)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "scale(1)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                            <BsCheck2All style={{ width: '16px', height: '16px' }} />
                            </button>
                        </Tooltip>
                          </div>
                        </td>
                      </tr>
                ))}
              </tbody>
            </table>
          </div>
                                  </div>
                                </div>
                                
      {/* Recategorise Modal */}
      {showRecategorization && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backdropFilter: 'blur(4px)', 
            backgroundColor: 'rgba(255, 255, 255, 0.3)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 50 
          }} 
          onKeyDown={handleKeyDown} 
          tabIndex={0}
        >
                                <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
            maxWidth: '448px', 
            width: '100%', 
            margin: '16px', 
            padding: '24px' 
                                }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>Recategorise Document</h3>
              <button
                onClick={handleRecategoriseCancel}
                style={{
                  color: '#9ca3af',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.target.style.color = '#4b5563'}
                onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
              >
                ×
              </button>
                                  </div>
            
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '12px' }}>
                Upload a new document to recategorise the data for <strong>{history[selectedRowIndex]?.panelname}</strong>
              </p>
              
              <div style={{ marginBottom: '12px' }}>
                <label
                  htmlFor="recategorise-dropzone-file"
                  onDragOver={handleRecategoriseDragOver}
                  onDragLeave={handleRecategoriseDragLeave}
                  onDrop={handleRecategoriseDrop}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '128px',
                    border: `2px dashed ${recategoriseDragActive ? '#2563eb' : '#d1d5db'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'colors 0.2s',
                    backgroundColor: recategoriseDragActive ? '#eff6ff' : '#f9fafb'
                  }}
                  onMouseEnter={(e) => {
                    if (!recategoriseDragActive) {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!recategoriseDragActive) {
                      e.target.style.backgroundColor = '#f9fafb';
                    }
                  }}
                >
                  <HiOutlineUpload style={{ width: '32px', height: '32px', color: '#9ca3af', marginBottom: '8px' }} />
                  <p style={{ fontSize: '14px', color: '#4b5563', margin: 0 }}>
                    <span style={{ fontWeight: '500' }}>Click to upload</span> or drag and drop
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', margin: 0 }}>Excel (.xlsx, .xls, .xlsb) or CSV files up to 50MB</p>
                  <input 
                    id="recategorise-dropzone-file" 
                    type="file" 
                    accept=".xlsx,.csv,.xlsb,.xls"
                    onChange={handleRecategoriseFilesChange} 
                    style={{ display: 'none' }} 
                  />
                </label>
                
                {recategorizationFile && (
                            <div style={{ 
                    backgroundColor: '#f0fdf4', 
                    border: '1px solid #bbf7d0', 
                    borderRadius: '6px', 
                    padding: '12px',
                    marginTop: '12px'
                              }}>
                    <p style={{ fontSize: '14px', color: '#166534', fontWeight: '500', margin: 0 }}>
                      File selected
                    </p>
                    <p style={{ fontSize: '12px', color: '#15803d', marginTop: '4px', margin: 0 }}>
                      • {recategorizationFile.name}
                    </p>
                  </div>
                )}
                                  </div>
                                </div>
                                
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleRecategoriseCancel}
                                    style={{
                                      flex: 1,
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                                    }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                Cancel
              </button>
                                  <button
                                onClick={handleRecategoriseUpload}
                disabled={!recategorizationFile || isRecategorizationInProgress(history[selectedRowIndex])}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (!recategorizationFile || isRecategorizationInProgress(history[selectedRowIndex])) ? 'not-allowed' : 'pointer',
                  opacity: (!recategorizationFile || isRecategorizationInProgress(history[selectedRowIndex])) ? 0.5 : 1,
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  if (recategorizationFile && !isRecategorizationInProgress(history[selectedRowIndex])) {
                    e.target.style.backgroundColor = '#1d4ed8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (recategorizationFile && !isRecategorizationInProgress(history[selectedRowIndex])) {
                    e.target.style.backgroundColor = '#2563eb';
                  }
                }}
              >
                {isRecategorizationInProgress(history[selectedRowIndex]) ? "Processing..." : "Upload & Recategorise"}
                                  </button>
                                </div>
                              </div>
                            </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 