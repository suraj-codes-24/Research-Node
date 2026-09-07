import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Database, Share2, Upload, MessageSquare, Server, CheckCircle, XCircle, AlertCircle, Cpu, HardDrive, Sparkles, BookOpen, PieChart as PieChartIcon } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import './Dashboard.css';

const Dashboard = () => {
  const { currentSessionId } = useSession();
  const [stats, setStats] = useState({
    papersCount: 0,
    graphNodes: 0,
    graphEdges: 0,
    nodesData: [],
    edgesData: []
  });
  const [papers, setPapers] = useState([]);
  const [health, setHealth] = useState(null);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentSessionId) {
        setStats({
          papersCount: 0,
          graphNodes: 0,
          graphEdges: 0,
          nodesData: [],
          edgesData: []
        });
        setPapers([]);
        setLoading(false);
        return;
      }

      try {
        const queryParam = `?session_id=${currentSessionId}`;
        const [papersRes, graphRes] = await Promise.all([
          axios.get(`/api/papers${queryParam}`),
          axios.get(`/api/graph${queryParam}`)
        ]);
        
        setStats({
          papersCount: papersRes.data.count || 0,
          graphNodes: graphRes.data.nodes?.length || 0,
          graphEdges: graphRes.data.edges?.length || 0,
          nodesData: graphRes.data.nodes || [],
          edgesData: graphRes.data.edges || []
        });
        setPapers(papersRes.data.papers || []);
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
  }, [currentSessionId]);

  const getStatusIcon = (status) => {
    if (status === 'connected' || status === 'running') return <CheckCircle size={16} color="#10b981" />;
    if (status === 'disconnected') return <XCircle size={16} color="#ef4444" />;
    return <AlertCircle size={16} color="#f59e0b" />;
  };

  const getEntityDistribution = () => {
    const counts = {};
    stats.nodesData.forEach(n => {
      const label = n.label || (n.data && n.data.label) || 'Unknown';
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getTopConnectedEntities = () => {
    const connections = {};
    stats.edgesData.forEach(e => {
      const source = e.source || (e.data && e.data.source);
      const target = e.target || (e.data && e.data.target);
      if (source) connections[source] = (connections[source] || 0) + 1;
      if (target) connections[target] = (connections[target] || 0) + 1;
    });
    
    return Object.entries(connections)
      .map(([id, count]) => {
        const node = stats.nodesData.find(n => (n.id || (n.data && n.data.id)) === id);
        const name = node ? (node.name || (node.properties && node.properties.name) || (node.data && node.data.name) || id) : id;
        return { name, connections: count };
      })
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 5);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#f97316', '#64748b'];

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

      {/* Analytics Charts */}
      {stats.nodesData.length > 0 && (
        <div className="analytics-section" style={{ marginTop: '2rem' }}>
          <h2><PieChartIcon size={20} color="var(--primary)" style={{marginRight: '8px'}} /> Graph Analytics</h2>
          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            
            {/* Entity Distribution Pie Chart */}
            <div className="glass-card" style={{ padding: '1.5rem', height: '350px' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Entity Distribution</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getEntityDistribution()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getEntityDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.1)" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top Connected Entities Bar Chart */}
            <div className="glass-card" style={{ padding: '1.5rem', height: '350px' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Top Connected Entities</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getTopConnectedEntities()} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="connections" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {getTopConnectedEntities().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      )}

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



      {/* Auto-Generated Insights */}
      {papers.length > 0 && (
        <div className="insights-section" style={{ marginTop: '2rem' }}>
          <h2><Sparkles size={20} color="var(--primary)" style={{marginRight: '8px'}} /> Auto-Generated Insights</h2>
          <div className="insights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            {papers.map(p => (
              <div key={p.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)', lineHeight: '1.4' }}>
                  <BookOpen size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  {p.title.replace(/_/g, ' ').replace('.pdf', '')}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', flex: 1 }}>
                  {p.summary || "No summary available."}
                </p>
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{p.chunks_count || 0} vector chunks</span>
                  <span>{(p.size_mb || 0)} MB</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions-section" style={{ marginTop: '3rem' }}>
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
