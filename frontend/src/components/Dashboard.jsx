import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, Database, Share2, Upload, MessageSquare, Server, CheckCircle, XCircle, AlertCircle, Cpu, HardDrive } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    papersCount: 0,
    graphNodes: 0,
    graphEdges: 0,
  });
  const [health, setHealth] = useState(null);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [papersRes, graphRes] = await Promise.all([
          axios.get('/api/papers'),
          axios.get('/api/graph')
        ]);
        
        setStats({
          papersCount: papersRes.data.count || 0,
          graphNodes: graphRes.data.nodes?.length || 0,
          graphEdges: graphRes.data.edges?.length || 0,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchHealth = async () => {
      try {
        const res = await axios.get('/api/health/detailed');
        setHealth(res.data);
      } catch (error) {
        console.error("Failed to fetch health", error);
      }
    };

    const fetchFeedback = async () => {
      try {
        const res = await axios.get('/api/feedback/stats');
        setFeedbackStats(res.data);
      } catch (error) {
        console.error("Failed to fetch feedback stats", error);
      }
    };

    fetchStats();
    fetchHealth();
    fetchFeedback();
  }, []);

  const getStatusIcon = (status) => {
    if (status === 'connected' || status === 'running') return <CheckCircle size={16} color="#10b981" />;
    if (status === 'disconnected') return <XCircle size={16} color="#ef4444" />;
    return <AlertCircle size={16} color="#f59e0b" />;
  };

  return (
    <div className="dashboard-container">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your GraphRAG Knowledge Base</p>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper paper-icon">
            <FileText size={28} />
          </div>
          <div className="stat-info">
            <h3>{loading ? '...' : stats.papersCount}</h3>
            <p>Papers Uploaded</p>
          </div>
        </div>
        
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper node-icon">
            <Database size={28} />
          </div>
          <div className="stat-info">
            <h3>{loading ? '...' : stats.graphNodes}</h3>
            <p>Knowledge Entities</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper edge-icon">
            <Share2 size={28} />
          </div>
          <div className="stat-info">
            <h3>{loading ? '...' : stats.graphEdges}</h3>
            <p>Relationships Extracted</p>
          </div>
        </div>
      </div>

      {/* System Health Panel */}
      {health && (
        <div className="health-section">
          <h2><Server size={20} /> System Status</h2>
          <div className="health-grid">
            {/* Ollama */}
            <div className="glass-card health-card">
              <div className="health-header">
                {getStatusIcon(health.services?.ollama?.status)}
                <span className="health-name"><Cpu size={16} /> Ollama LLM</span>
              </div>
              <div className="health-details">
                <span>Model: {health.services?.ollama?.model || 'N/A'}</span>
                <span className={`health-status ${health.services?.ollama?.status}`}>
                  {health.services?.ollama?.status}
                </span>
              </div>
            </div>

            {/* Neo4j */}
            <div className="glass-card health-card">
              <div className="health-header">
                {getStatusIcon(health.services?.neo4j?.status)}
                <span className="health-name"><Database size={16} /> Neo4j Graph</span>
              </div>
              <div className="health-details">
                <span>{health.services?.neo4j?.node_count || 0} nodes</span>
                <span className={`health-status ${health.services?.neo4j?.status}`}>
                  {health.services?.neo4j?.status}
                </span>
              </div>
            </div>

            {/* Qdrant */}
            <div className="glass-card health-card">
              <div className="health-header">
                {getStatusIcon(health.services?.qdrant?.status)}
                <span className="health-name"><HardDrive size={16} /> Qdrant Vectors</span>
              </div>
              <div className="health-details">
                <span>{health.services?.qdrant?.vectors_count || 0} vectors</span>
                <span className={`health-status ${health.services?.qdrant?.status}`}>
                  {health.services?.qdrant?.status}
                </span>
              </div>
            </div>

            {/* Backend */}
            <div className="glass-card health-card">
              <div className="health-header">
                {getStatusIcon(health.services?.backend?.status)}
                <span className="health-name"><Server size={16} /> Backend API</span>
              </div>
              <div className="health-details">
                <span>v{health.services?.backend?.version || '?'}</span>
                <span className={`health-status ${health.services?.backend?.status}`}>
                  {health.services?.backend?.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Stats */}
      {feedbackStats && feedbackStats.total > 0 && (
        <div className="feedback-stats-section">
          <h2>User Feedback</h2>
          <div className="glass-card feedback-stats-card">
            <div className="feedback-stat">
              <span className="feedback-stat-number">{feedbackStats.total}</span>
              <span className="feedback-stat-label">Total Ratings</span>
            </div>
            <div className="feedback-stat">
              <span className="feedback-stat-number" style={{color: '#10b981'}}>{feedbackStats.satisfaction_rate}%</span>
              <span className="feedback-stat-label">Satisfaction</span>
            </div>
            <div className="feedback-stat">
              <span className="feedback-stat-number" style={{color: '#10b981'}}>{feedbackStats.helpful}</span>
              <span className="feedback-stat-label">Helpful</span>
            </div>
            <div className="feedback-stat">
              <span className="feedback-stat-number" style={{color: '#ef4444'}}>{feedbackStats.incorrect}</span>
              <span className="feedback-stat-label">Incorrect</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <div className="glass-card action-card" onClick={() => navigate('/upload')}>
            <div className="action-icon">
              <Upload size={32} color="var(--primary)" />
            </div>
            <h3>Upload New Paper</h3>
            <p>Extract text, chunk, embed, and build graph nodes automatically.</p>
            <button className="btn btn-primary mt-3">Go to Upload</button>
          </div>

          <div className="glass-card action-card" onClick={() => navigate('/chat')}>
            <div className="action-icon">
              <MessageSquare size={32} color="var(--accent)" />
            </div>
            <h3>Query GraphRAG</h3>
            <p>Ask complex questions across your entire document repository.</p>
            <button className="btn btn-primary mt-3" style={{ background: 'var(--accent)' }}>Start Chat</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
