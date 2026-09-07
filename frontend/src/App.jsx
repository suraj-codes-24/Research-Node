import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, MessageSquare, Network, Layers, Plus, Folder, Trash2, Edit2, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Search, Pin, PinOff, ChevronDown, ChevronRight } from 'lucide-react';
import Dashboard from './components/Dashboard';
import UploadPage from './components/Upload';
import Chat from './components/Chat';
import Graph from './components/Graph';
import Agents from './components/Agents';
import Compare from './components/Compare';
import { SessionProvider, useSession } from './context/SessionContext';

function AppContent() {
  const location = useLocation();
  const { sessionsList, currentSessionId, switchSession, createNewSession, deleteSession, renameSession, togglePinSession } = useSession();
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [hoveredSessionId, setHoveredSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
  const [isRecentsExpanded, setIsRecentsExpanded] = useState(true);

  const filteredSessions = sessionsList.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const pinnedSessions = filteredSessions.filter(s => s.is_pinned);
  const recentSessions = filteredSessions.filter(s => !s.is_pinned);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this session?")) {
      deleteSession(id);
    }
  };

  const handleEditClick = (e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleRenameSubmit = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (editTitle.trim()) {
      await renameSession(id, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handlePinToggle = async (e, session) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (!session.is_pinned && sessionsList.filter(s => s.is_pinned).length >= 3) {
      alert("You can only pin up to 3 workspaces.");
      return;
    }
    await togglePinSession(session.id, session.is_pinned);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const renderSessionRow = (s) => (
    <div 
      key={s.id} 
      className={`workspace-item ${s.id === currentSessionId ? 'active' : ''}`}
      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%' }}
      onMouseEnter={() => setHoveredSessionId(s.id)}
      onMouseLeave={() => setHoveredSessionId(null)}
    >
      {editingSessionId === s.id ? (
        <form onSubmit={(e) => handleRenameSubmit(e, s.id)} style={{ display: 'flex', flex: 1, gap: '0.25rem', alignItems: 'center' }}>
          <input 
            type="text" 
            value={editTitle} 
            onChange={(e) => setEditTitle(e.target.value)} 
            autoFocus 
            onBlur={() => setEditingSessionId(null)}
            style={{ flex: 1, background: '#111827', color: 'white', border: '1px solid #3b82f6', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} 
          />
        </form>
      ) : (
        <button 
          onClick={() => switchSession(s.id)}
          className="workspace-btn"
          style={{ 
            justifyContent: isSidebarOpen ? 'flex-start' : 'center'
          }}
          title={!isSidebarOpen ? s.title : undefined}
        >
          {isSidebarOpen && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{s.title}</span>}
          {!isSidebarOpen && s.is_pinned && <Pin size={10} style={{ position: 'absolute', top: 2, right: 2, color: '#9ca3af' }} />}
        </button>
      )}
      
      {editingSessionId !== s.id && isSidebarOpen && (hoveredSessionId === s.id || activeMenuId === s.id) && (
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); handlePinToggle(e, s); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.25rem'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'white'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#9ca3af'; }}
            title={s.is_pinned ? "Unpin" : "Pin"}
          >
            {s.is_pinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuId(activeMenuId === s.id ? null : s.id);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.25rem'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'white'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#9ca3af'; }}
            title="More Options"
          >
            <MoreHorizontal size={16} />
          </button>
          
          {activeMenuId === s.id && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '0.25rem',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              padding: '0.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.125rem',
              zIndex: 50,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              minWidth: '100px'
            }}>
              <button
                onClick={(e) => {
                  setActiveMenuId(null);
                  handleEditClick(e, s);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#d1d5db',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = 'white'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d1d5db'; }}
              >
                <Edit2 size={12} />
                Rename
              </button>
              <button
                onClick={(e) => {
                  setActiveMenuId(null);
                  handleDelete(e, s.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div style={{ position: 'sticky', top: 0, background: 'rgba(15, 17, 21, 0.95)', zIndex: 10, paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div className="sidebar-logo" style={{ justifyContent: isSidebarOpen ? 'space-between' : 'center', padding: isSidebarOpen ? '1.25rem 1rem 0.5rem 1rem' : '1.25rem 0.75rem 0.5rem 0.75rem' }}>
            {isSidebarOpen && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>ResearchNode</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {isSidebarOpen && (
                <button 
                  onClick={() => {
                    setIsSearchVisible(!isSearchVisible);
                    if (isSearchVisible) setSearchQuery("");
                  }} 
                  style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                  title="Search Workspaces"
                >
                  <Search size={18} />
                </button>
              )}
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
              >
                {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: isSidebarOpen ? '0 1rem' : '0 0.75rem' }}>
            {isSidebarOpen && isSearchVisible && (
              <input 
                type="text" 
                placeholder="Search workspaces..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{ 
                  width: '100%', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  color: 'white', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '0.5rem', 
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            )}

            <button 
              onClick={createNewSession} 
              className="nav-link new-workspace-btn" 
              style={{ 
                width: '100%', 
                cursor: 'pointer', 
                justifyContent: isSidebarOpen ? 'flex-start' : 'center', 
                padding: isSidebarOpen ? '0.75rem 1rem' : '0.75rem 0', 
                margin: 0
              }} 
              title={!isSidebarOpen ? "New Workspace" : undefined}
            >
              <Plus size={20} style={{ flexShrink: 0 }} />
              {isSidebarOpen && <span>New Workspace</span>}
            </button>
          </div>
        </div>
        
        <div className="sidebar-scrollable" style={{ display: 'flex', flexDirection: 'column', padding: isSidebarOpen ? '0.5rem 1rem 1.5rem 1rem' : '0.5rem 0.75rem 1.5rem 0.75rem', gap: '1rem' }}>
          
          <nav style={{ display: 'flex', flexDirection: 'column' }}>
            <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} style={{ justifyContent: isSidebarOpen ? 'flex-start' : 'center', padding: isSidebarOpen ? '0.75rem 1rem' : '0.75rem 0' }} title={!isSidebarOpen ? "Dashboard" : undefined}>
              <LayoutDashboard size={20} style={{ flexShrink: 0 }} />
              {isSidebarOpen && <span>Dashboard</span>}
            </NavLink>
            <NavLink to="/upload" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} style={{ justifyContent: isSidebarOpen ? 'flex-start' : 'center', padding: isSidebarOpen ? '0.75rem 1rem' : '0.75rem 0' }} title={!isSidebarOpen ? "Upload Paper" : undefined}>
              <Upload size={20} style={{ flexShrink: 0 }} />
              {isSidebarOpen && <span>Upload Paper</span>}
            </NavLink>
            <NavLink to="/chat" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} style={{ justifyContent: isSidebarOpen ? 'flex-start' : 'center', padding: isSidebarOpen ? '0.75rem 1rem' : '0.75rem 0' }} title={!isSidebarOpen ? "GraphRAG Chat" : undefined}>
              <MessageSquare size={20} style={{ flexShrink: 0 }} />
              {isSidebarOpen && <span>GraphRAG Chat</span>}
            </NavLink>
            <NavLink to="/graph" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} style={{ justifyContent: isSidebarOpen ? 'flex-start' : 'center', padding: isSidebarOpen ? '0.75rem 1rem' : '0.75rem 0' }} title={!isSidebarOpen ? "Knowledge Graph" : undefined}>
              <Network size={20} style={{ flexShrink: 0 }} />
              {isSidebarOpen && <span>Knowledge Graph</span>}
            </NavLink>
            <NavLink to="/compare" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} style={{ justifyContent: isSidebarOpen ? 'flex-start' : 'center', padding: isSidebarOpen ? '0.75rem 1rem' : '0.75rem 0' }} title={!isSidebarOpen ? "Compare" : undefined}>
              <Layers size={20} style={{ flexShrink: 0 }} />
              {isSidebarOpen && <span>Compare</span>}
            </NavLink>
            <NavLink to="/agents" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} style={{ justifyContent: isSidebarOpen ? 'flex-start' : 'center', padding: isSidebarOpen ? '0.75rem 1rem' : '0.75rem 0' }} title={!isSidebarOpen ? "AI Agents" : undefined}>
              <MessageSquare size={20} style={{ flexShrink: 0 }} />
              {isSidebarOpen && <span>AI Agents</span>}
            </NavLink>
          </nav>
          
          {(pinnedSessions.length > 0 || recentSessions.length > 0) && isSidebarOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pinnedSessions.length > 0 && (
                <div>
                  <div 
                    onClick={() => setIsPinnedExpanded(!isPinnedExpanded)}
                    style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600', padding: '0.25rem 0.5rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', userSelect: 'none', width: 'fit-content' }}
                  >
                    <span>Pinned</span>
                    {isPinnedExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </div>
                  {isPinnedExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {pinnedSessions.map(renderSessionRow)}
                    </div>
                  )}
                </div>
              )}
              
              {recentSessions.length > 0 && (
                <div>
                  <div 
                    onClick={() => setIsRecentsExpanded(!isRecentsExpanded)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem', padding: '0.25rem 0.5rem', cursor: 'pointer', userSelect: 'none', width: 'fit-content' }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600' }}>Recents</div>
                    {isRecentsExpanded ? <ChevronDown size={12} color="#9ca3af" /> : <ChevronRight size={12} color="#9ca3af" />}
                  </div>
                  
                  {isRecentsExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {recentSessions.map(renderSessionRow)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" style={{ position: 'relative' }}>
        <div key={location.pathname} className="fade-in" style={{ height: '100%' }}>
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/graph" element={<Graph />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/agents" element={<Agents />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <SessionProvider>
        <AppContent />
      </SessionProvider>
    </Router>
  );
}

export default App;
