import React, { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, File, CheckCircle, AlertCircle, Loader, Sparkles } from 'lucide-react';
import './Upload.css';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
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
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    if (selectedFile.type !== 'application/pdf') {
      setStatus('error');
      setMessage('Only PDF files are supported.');
      return;
    }
    
    if (selectedFile.size > 50 * 1024 * 1024) {
      setStatus('error');
      setMessage('File exceeds 50MB limit.');
      return;
    }

    setFile(selectedFile);
    setStatus('idle');
    setMessage('');
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setMessage('Uploading and processing paper. This involves chunking, embedding, and knowledge graph extraction (may take a minute)...');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload-paper', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setStatus('success');
      setResult(response.data);
      setMessage('Upload complete! The paper has been processed into the vector store and knowledge graph.');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage(error.response?.data?.detail || 'An error occurred during upload.');
    }
  };

  return (
    <div className="upload-container">
      <header className="page-header">
        <h1>Upload Paper</h1>
        <p>Add scientific literature to your GraphRAG Knowledge Base.</p>
      </header>

      <div className="upload-content">
        <div 
          className={`glass-card drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="application/pdf"
            className="hidden-input"
          />
          
          {file ? (
            <div className="file-info">
              <div className="file-icon">
                <File size={48} color="var(--primary)" />
              </div>
              <h3>{file.name}</h3>
              <p>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              
              {status === 'idle' && (
                <div className="upload-actions">
                  <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); handleUpload(); }}>
                    Process Document
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="drop-prompt">
              <div className="upload-icon-wrapper">
                <UploadCloud size={48} />
              </div>
              <h3>Drag & Drop your PDF here</h3>
              <p>or click to browse files (Max 50MB)</p>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        {status !== 'idle' && (
          <div className={`glass-card status-card ${status}`}>
            <div className="status-icon">
              {status === 'uploading' && <Loader size={24} className="spin" />}
              {status === 'success' && <CheckCircle size={24} color="var(--success)" />}
              {status === 'error' && <AlertCircle size={24} color="var(--danger)" />}
            </div>
            <div className="status-message">
              <h4>
                {status === 'uploading' && 'Processing Document...'}
                {status === 'success' && 'Success!'}
                {status === 'error' && 'Upload Failed'}
              </h4>
              <p>{message}</p>
              
              {status === 'success' && result && (
                <div className="result-details">
                  <div className="upload-metadata">
                    <span className="badge">Chunks created: {result.chunks_count}</span>
                  </div>
                  
                  {result.summary && (
                    <div className="auto-summary-box">
                      <h5><Sparkles size={14} /> AI Paper Summary</h5>
                      <div className="summary-content">
                        {result.summary.split('\n').map((line, i) => {
                          if (!line.trim()) return null;
                          const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                          return (
                            <p key={i} dangerouslySetInnerHTML={{ __html: formattedLine }} />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button className="btn btn-secondary mt-3" onClick={() => setFile(null)}>Upload Another</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
