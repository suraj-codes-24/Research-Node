import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import './Agents.css';

const Agents = () => {
  const [activeTab, setActiveTab] = useState('literature');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runAgent = async (endpoint, payload = null) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      let res;
      if (payload) {
        res = await axios.post(`/api/agents/${endpoint}`, payload);
      } else {
        res = await axios.post(`/api/agents/${endpoint}`);
      }
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to run the ${endpoint} agent.`);
    } finally {
      setLoading(false);
    }
  };

  const renderLiteratureResults = () => {
    if (!results || !results.related_papers) return null;
    return (
      <div className="agent-result fade-in">
        <h3>Relationship Summary</h3>
        <p className="summary-text">{results.relationship_summary}</p>
        
        <div className="two-col-grid">
          <div className="result-card">
            <h4>Related Papers</h4>
            <ul>
              {results.related_papers.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          
          <div className="result-card">
            <h4>Suggested Reading Order</h4>
            <ol>
              {results.suggested_reading_order?.map((item, i) => (
                <li key={i}>
                  <strong>{item.paper}</strong>
                  <p>{item.reason}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  };

  const renderContradictionResults = () => {
    if (!results) return null;
    if (!results.contradictions || results.contradictions.length === 0) {
      return (
        <div className="agent-result fade-in empty-state">
          <div className="empty-icon"><Sparkles size={40} color="var(--success)" /></div>
          <h3>No Contradictions Found</h3>
          <p>The models and papers in your knowledge graph do not appear to have conflicting claims.</p>
        </div>
      );
    }
    
    return (
      <div className="agent-result fade-in">
        <h3>Detected Contradictions</h3>
        <div className="contradiction-list">
          {results.contradictions.map((c, i) => (
            <div key={i} className={`conflict-card severity-${c.severity?.toLowerCase()}`}>
              <div className="conflict-header">
                <span className="badge">Severity: {c.severity}</span>
              </div>
              <p className="explanation">{c.explanation}</p>
              <div className="claim-comparison">
                <div className="claim-box">
                  <strong>{c.paper_a}</strong>
                  <p>{c.claim_a}</p>
                </div>
                <div className="vs-badge">VS</div>
                <div className="claim-box">
                  <strong>{c.paper_b}</strong>
                  <p>{c.claim_b}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderExperimentResults = () => {
    if (!results || !results.suggestions) return null;
    return (
      <div className="agent-result fade-in">
        <h3>Novel Experiment Suggestions</h3>
        <div className="experiment-list">
          {results.suggestions.map((exp, i) => (
            <div key={i} className="experiment-card">
              <div className="exp-header">
                <h4>{exp.experiment}</h4>
                <span className="badge score-badge">Novelty: {exp.novelty_score}/10</span>
              </div>
              <p className="rationale"><strong>Rationale:</strong> {exp.rationale}</p>
              
              <div className="exp-meta">
                <div>
                  <strong>Required Resources:</strong>
                  <ul>{exp.required_resources?.map((r, j) => <li key={j}>{r}</li>)}</ul>
                </div>
                <div>
                  <strong>Based On:</strong>
                  <ul>{exp.based_on?.map((b, j) => <li key={j}>{b}</li>)}</ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="agents-container">
      <header className="page-header">
        <h1>Autonomous Agents</h1>
        <p>Run advanced reasoning tasks over your knowledge graph.</p>
      </header>

      <div className="agent-tabs">
        <button 
          className={`tab-btn ${activeTab === 'literature' ? 'active' : ''}`}
          onClick={() => { setActiveTab('literature'); setResults(null); setError(null); }}
        >
          <Sparkles size={18} /> Literature Discovery
        </button>
        <button 
          className={`tab-btn ${activeTab === 'contradiction' ? 'active' : ''}`}
          onClick={() => { setActiveTab('contradiction'); setResults(null); setError(null); }}
        >
          <AlertTriangle size={18} /> Contradiction Detection
        </button>
        <button 
          className={`tab-btn ${activeTab === 'experiment' ? 'active' : ''}`}
          onClick={() => { setActiveTab('experiment'); setResults(null); setError(null); }}
        >
          <Lightbulb size={18} /> Experiment Suggestion
        </button>
      </div>

      <div className="glass-card agent-workspace">
        {activeTab === 'literature' && (
          <div className="agent-controls">
            <h3>Literature Discovery Agent</h3>
            <p>Input a topic to synthesize a reading order based on related papers in the vector store and graph.</p>
            <div className="input-group">
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Graph Neural Networks" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <button 
                className="btn btn-primary" 
                onClick={() => runAgent('literature', { topic })}
                disabled={loading || !topic.trim()}
              >
                {loading ? <Loader2 size={18} className="spin" /> : 'Run Agent'}
              </button>
            </div>
            {renderLiteratureResults()}
          </div>
        )}

        {activeTab === 'contradiction' && (
          <div className="agent-controls">
            <h3>Contradiction Detection Agent</h3>
            <p>Scans the graph for papers evaluating the same models or tasks to find conflicting claims.</p>
            <button 
              className="btn btn-primary mt-2" 
              onClick={() => runAgent('contradiction')}
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="spin" /> : 'Run Global Scan'}
            </button>
            {renderContradictionResults()}
          </div>
        )}

        {activeTab === 'experiment' && (
          <div className="agent-controls">
            <h3>Experiment Suggestion Agent</h3>
            <p>Analyzes limitations and future work sections to brainstorm novel experiments.</p>
            <button 
              className="btn btn-primary mt-2" 
              style={{ background: 'var(--accent)' }}
              onClick={() => runAgent('experiment')}
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="spin" /> : 'Brainstorm Experiments'}
            </button>
            {renderExperimentResults()}
          </div>
        )}

        {error && (
          <div className="error-message fade-in mt-3">
            <AlertTriangle size={20} />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Agents;
