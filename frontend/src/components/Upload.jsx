import React, { useState, useRef } from 'react';
import axios from 'axios';
import { FileText, File, CheckCircle, AlertCircle, Loader, Sparkles, X } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import './Upload.css';

const UploadPage = () => {
  const { currentSessionId } = useSession();
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // idle, uploading, success, error, partial_success
  const [status, setStatus] = useState('idle'); 
  const [message, setMessage] = useState('');
  const [results, setResults] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(Array.from(e.target.files));
    }
  };

  const validateAndAddFiles = (selectedFiles) => {
    // Filter PDFs and size
    const validFiles = selectedFiles.filter(f => f.type === 'application/pdf' && f.size <= 50 * 1024 * 1024);
    
    if (validFiles.length < selectedFiles.length) {
      alert("Some files were skipped because they are not PDFs or exceed 50MB.");
    }
    
    setFiles(prev => {
      const combined = [...prev, ...validFiles];
      if (combined.length > 10) {
        alert("You can only upload a maximum of 10 papers at once.");
        return combined.slice(0, 10);
      }
      return combined;
    });
    
    setStatus('idle');
    setMessage('');
    setResults([]);
    setUploadProgress(0);
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    if (!currentSessionId) {
      setStatus('error');
      setMessage('Please create or select a workspace session first from the sidebar.');
      return;
    }

    setStatus('uploading');
    setResults([]);
    let successCount = 0;
    let newResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(i + 1);
      setMessage(`Processing paper ${i + 1} of ${files.length}: ${file.name}...`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', currentSessionId);

      try {
        const response = await axios.post('/api/upload-paper', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        newResults.push({ file: file.name, success: true, data: response.data });
        successCount++;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        newResults.push({ 
          file: file.name, 
          success: false, 
          error: error.response?.data?.detail || 'An error occurred during upload.'
        });
      }
      // Update results dynamically so user sees them appear
      setResults([...newResults]);
    }

    if (successCount === files.length) {
      setStatus('success');
      setMessage('All papers uploaded and processed successfully!');
    } else if (successCount > 0) {
      setStatus('partial_success');
      setMessage(`${successCount} out of ${files.length} papers processed successfully.`);
    } else {
      setStatus('error');
      setMessage('All uploads failed.');
    }
  };

  return (
    <div className="upload-container">
      <header className="page-header">
        <h1>Upload Papers</h1>
        <p>Add scientific literature to your GraphRAG Knowledge Base (up to 10 at once).</p>
      </header>

      <div className="upload-content">
        <div 
          className={`glass-card drop-zone ${isDragging ? 'dragging' : ''} ${files.length > 0 ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => status === 'idle' && files.length === 0 && fileInputRef.current.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="application/pdf"
            multiple
            className="hidden-input"
          />
          
          {files.length > 0 ? (
            <div className="files-list-container">
              <h3>Selected Papers ({files.length}/10)</h3>
              <ul className="selected-files-list">
                {files.map((f, i) => (
                  <li key={i} className="selected-file-item">
                    <File size={20} color="var(--primary)" />
                    <span className="file-name" title={f.name}>{f.name}</span>
                    <span className="file-size">{(f.size / (1024 * 1024)).toFixed(2)} MB</span>
                    {status === 'idle' && (
                      <button className="remove-file-btn" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>
                        <X size={18} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              
              {status === 'idle' && (
                <div className="upload-actions">
                  {files.length < 10 && (
                    <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>
                      Add More
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setFiles([]); }}>
                    Clear All
                  </button>
                  <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); handleUpload(); }}>
                    Process {files.length} {files.length === 1 ? 'Document' : 'Documents'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="drop-prompt">
              <div className="upload-icon-wrapper">
                <FileText size={56} strokeWidth={1.5} />
              </div>
              <h3>Drag & Drop your PDFs here</h3>
              <p>or click to browse files (Max 10 files, 50MB each)</p>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        {status !== 'idle' && (
          <div className={`glass-card status-card ${status}`}>
            <div className="status-icon">
              {status === 'uploading' && <Loader size={24} className="spin" />}
              {status === 'success' && <CheckCircle size={24} color="var(--success)" />}
              {status === 'partial_success' && <AlertCircle size={24} color="var(--warning)" />}
              {status === 'error' && <AlertCircle size={24} color="var(--danger)" />}
            </div>
            <div className="status-message" style={{ width: '100%' }}>
              <h4>
                {status === 'uploading' && `Processing Document ${uploadProgress} of ${files.length}...`}
                {status === 'success' && 'Success!'}
                {status === 'partial_success' && 'Partial Success'}
                {status === 'error' && 'Upload Failed'}
              </h4>
              <p>{message}</p>
              
              {results.length > 0 && (
                <div className="results-list">
                  {results.map((res, i) => (
                    <div key={i} className={`result-item ${res.success ? 'success' : 'error'}`}>
                      <div className="result-item-header">
                        <strong>{res.file}</strong>
                        {res.success ? (
                          <span className="badge">Chunks: {res.data.chunks_count}</span>
                        ) : (
                          <span className="error-text">{res.error}</span>
                        )}
                      </div>
                      
                      {res.success && res.data.summary && (
                        <div className="auto-summary-box compact">
                          <h5><Sparkles size={14} /> Summary</h5>
                          <div className="summary-content">
                            {res.data.summary.split('\n').map((line, j) => {
                              if (!line.trim()) return null;
                              const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                              return <p key={j} dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(status === 'success' || status === 'error' || status === 'partial_success') && (
                <button className="btn btn-secondary mt-3" onClick={() => { setFiles([]); setStatus('idle'); setResults([]); }}>
                  Upload More Papers
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
