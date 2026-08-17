import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, MessageSquare, Network } from 'lucide-react';
import Dashboard from './components/Dashboard';
import UploadPage from './components/Upload';
import Chat from './components/Chat';
import Graph from './components/Graph';
import Agents from './components/Agents';

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Sidebar Navigation */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <Network size={24} color="#3b82f6" />
            <span>ResearchNode</span>
          </div>
          
          <nav>
            <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <LayoutDashboard size={20} />
              Dashboard
            </NavLink>
            <NavLink to="/upload" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <Upload size={20} />
              Upload Paper
            </NavLink>
            <NavLink to="/chat" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <MessageSquare size={20} />
              GraphRAG Chat
            </NavLink>
            <NavLink to="/graph" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <Network size={20} />
              Knowledge Graph
            </NavLink>
            <NavLink to="/agents" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <MessageSquare size={20} />
              AI Agents
            </NavLink>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/graph" element={<Graph />} />
            <Route path="/agents" element={<Agents />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
