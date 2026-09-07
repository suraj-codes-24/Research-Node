import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, Loader2, FileText, CheckSquare, Square } from 'lucide-react';
import './Compare.css';

const Compare = () => {
  const [papers, setPapers] = useState([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const res = await axios.get('/api/papers');
      setPapers(res.data.papers);
    } catch (err) {
      console.error("Failed to load papers", err);
      setError("Failed to load papers.");
    }
  };

  const togglePaper = (id) => {
    setSelectedPaperIds(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= 3) {
        alert("You can compare up to 3 papers at a time.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selectedPaperIds.length < 2) return;
    setLoading(true);
    setError(null);
    setComparisonData(null);
    
    try {
      const idsStr = selectedPaperIds.join(',');
      const res = await axios.get(`/api/compare?papers=${idsStr}`);
      setComparisonData(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to generate comparison. Ensure papers are fully processed.");
    } finally {
      setLoading(false);
    }
  };

  const renderEntityBadge = (entity, i) => {
    const types = {
      model: 'bg-emerald-500',
      method: 'bg-amber-500',
      dataset: 'bg-orange-500',
      task: 'bg-purple-500',
      author: 'bg-slate-500'
    };
    const bgClass = types[entity.label.toLowerCase()] || 'bg-slate-400';
    return (
      <span className={`compare-badge ${bgClass}`} key={entity.name + i}>
        <span className="badge-type">{entity.label}</span>
        {entity.name}
      </span>
    );
  };

  return (
    <div className="compare-container">
      <header className="page-header">
        <h1>Multi-Paper Comparison</h1>
        <p>Select 2 or 3 papers to visualize their shared and distinct methodologies.</p>
      </header>

      <div className="compare-workspace">
        <div className="glass-card paper-selector">
          <h3>Select Papers</h3>
          <p className="subtitle">Choose up to 3 papers</p>
          
          <div className="paper-list">
            {papers.map(p => (
              <div 
                key={p.paper_id} 
                className={`paper-option ${selectedPaperIds.includes(p.paper_id) ? 'selected' : ''}`}
                onClick={() => togglePaper(p.paper_id)}
              >
                {selectedPaperIds.includes(p.paper_id) ? 
                  <CheckSquare size={18} className="text-primary" /> : 
                  <Square size={18} className="text-muted" />
                }
                <FileText size={16} />
                <span className="paper-title" title={p.title}>{p.title}</span>
              </div>
            ))}
            {papers.length === 0 && <p className="text-muted">No papers uploaded yet.</p>}
          </div>

          <button 
            className="btn btn-primary mt-4 w-100" 
            onClick={handleCompare}
            disabled={selectedPaperIds.length < 2 || loading}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <Layers size={16} />}
            Generate Comparison
          </button>
          {error && <p className="text-error mt-2 text-sm">{error}</p>}
        </div>

        <div className="glass-card compare-results">
          {loading ? (
            <div className="centered-loader">
              <Loader2 size={40} className="spin text-primary" />
              <p>Analyzing knowledge graph connections...</p>
            </div>
          ) : !comparisonData ? (
            <div className="empty-state">
              <Layers size={48} className="text-muted mb-3" opacity={0.3} />
              <h3>No Comparison Data</h3>
              <p>Select papers from the list and click Generate to see the intersection of their knowledge graphs.</p>
            </div>
          ) : (
            <div className="venn-grid fade-in">
              <div className="shared-section glass-card">
                <div className="venn-header bg-primary-transparent">
                  <h3 className="text-primary">Shared by All Selected Papers</h3>
                  <p>Intersection ({comparisonData.shared.length} entities)</p>
                </div>
                <div className="entity-cloud">
                  {comparisonData.shared.length > 0 ? (
                    comparisonData.shared.map((e, i) => renderEntityBadge(e, i))
                  ) : (
                    <p className="text-muted text-center w-100 py-3">No shared models, methods, or datasets found.</p>
                  )}
                </div>
              </div>

              <div className="distinct-columns">
                {selectedPaperIds.map(pid => {
                  const paper = papers.find(p => p.paper_id === pid);
                  const distinctEntities = comparisonData.distinct[pid] || [];
                  return (
                    <div className="distinct-col glass-card" key={pid}>
                      <div className="venn-header bg-surface">
                        <h4 title={paper?.title}>{paper?.title}</h4>
                        <p>Unique ({distinctEntities.length} entities)</p>
                      </div>
                      <div className="entity-cloud small">
                        {distinctEntities.length > 0 ? (
                          distinctEntities.map((e, i) => renderEntityBadge(e, i))
                        ) : (
                          <p className="text-muted text-sm text-center w-100 py-2">No unique entities identified.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Compare;
