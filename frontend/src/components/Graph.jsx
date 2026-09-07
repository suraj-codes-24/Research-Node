import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import cytoscape from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';
import cola from 'cytoscape-cola';
cytoscape.use(cola);
import { Network, Loader2, AlertCircle, Sparkles, MessageSquare, Download, Filter, Maximize, Focus, RefreshCw, ChevronDown, ChevronUp, Menu, X, ZoomIn, ZoomOut, Play, Pause, Save, BookOpen, Search, AlignLeft, Edit3, Target } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import './Graph.css';

const Graph = () => {
  const { currentSessionId } = useSession();
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictedLinks, setPredictedLinks] = useState([]);
  const [nodeFilters, setNodeFilters] = useState({
    Paper: true, Model: true, Dataset: true, Method: true, Task: true, Author: true, Entity: true
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [isLivePhysics, setIsLivePhysics] = useState(true);

  // New states for Node Details Interactive Sidebar
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'context', 'notes'
  const [enrichmentData, setEnrichmentData] = useState({ loading: false, data: null, error: null });
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const cyRef = useRef(null);
  const layoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (currentSessionId) {
      fetchGraphData();
    } else {
      setElements([]);
      setError("Please create or select a workspace session to view its Knowledge Graph.");
      setLoading(false);
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (selectedNode && currentSessionId) {
      setActiveTab('details');
      fetchEnrichmentData(selectedNode.name, selectedNode.label);
      fetchNodeNote(selectedNode.name);
    } else {
      setEnrichmentData({ loading: false, data: null, error: null });
      setNoteText('');
      setFocusMode(false);
      if (cyRef.current) {
        cyRef.current.elements().removeClass('hidden-node');
      }
    }
  }, [selectedNode?.id, currentSessionId]);

  const fetchEnrichmentData = async (name, type) => {
    setEnrichmentData({ loading: true, data: null, error: null });
    try {
      const res = await axios.get(`/api/nodes/${currentSessionId}/${encodeURIComponent(name)}/enrich?node_type=${type}`);
      setEnrichmentData({ loading: false, data: res.data, error: null });
    } catch (err) {
      setEnrichmentData({ loading: false, data: null, error: 'Failed to fetch context.' });
    }
  };

  const fetchNodeNote = async (name) => {
    try {
      const res = await axios.get(`/api/nodes/${currentSessionId}/${encodeURIComponent(name)}/annotation`);
      setNoteText(res.data.note || '');
    } catch (err) {
      console.error(err);
    }
  };

  const saveNodeNote = async () => {
    if (!selectedNode || !currentSessionId) return;
    setIsSavingNote(true);
    try {
      await axios.post(`/api/nodes/${currentSessionId}/${encodeURIComponent(selectedNode.name)}/annotation`, { note: noteText });
    } catch (err) {
      alert("Failed to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleToggleFocusMode = () => {
    if (!cyRef.current || !selectedNode) return;
    const newFocusMode = !focusMode;
    setFocusMode(newFocusMode);
    
    if (newFocusMode) {
      const node = cyRef.current.getElementById(selectedNode.id);
      const neighborhood = node.neighborhood().add(node);
      cyRef.current.elements().difference(neighborhood).addClass('hidden-node');
      cyRef.current.animate({ fit: { eles: neighborhood, padding: 50 } }, { duration: 500 });
    } else {
      cyRef.current.elements().removeClass('hidden-node');
      cyRef.current.animate({ fit: { padding: 50 } }, { duration: 500 });
    }
  };


  const fetchGraphData = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParam = currentSessionId ? `?session_id=${currentSessionId}` : '';
      const response = await axios.get(`/api/graph${queryParam}`);
      
      const { nodes, edges, message } = response.data;
      
      if (!nodes || nodes.length === 0) {
        setError(message || "Graph is empty.");
        setLoading(false);
        return;
      }

      // Calculate degrees for dynamic sizing
      const degreeMap = {};
      nodes.forEach(n => degreeMap[n.id.toString()] = 0);
      edges.forEach(e => {
        if(degreeMap[e.source.toString()] !== undefined) degreeMap[e.source.toString()]++;
        if(degreeMap[e.target.toString()] !== undefined) degreeMap[e.target.toString()]++;
      });

      const TYPE_COLORS = {
        Paper: '#3b82f6',   // Neon Blue
        Model: '#10b981',   // Neon Green
        Dataset: '#f59e0b', // Neon Orange
        Task: '#8b5cf6',    // Neon Purple
        Method: '#ec4899',  // Neon Pink
        Author: '#94a3b8',  // Slate
        Entity: '#06b6d4'   // Cyan
      };

      // Convert backend format to Cytoscape format
      const cyElements = [];
      
      nodes.forEach(node => {
        const id = node.id.toString();
        const degree = degreeMap[id] || 0;
        const baseColor = TYPE_COLORS[node.label] || '#94a3b8';
        
        // Dynamic sizing based on degree (min 15px, max 70px)
        const size = Math.max(15, Math.min(70, 15 + (degree * 6)));
        
        cyElements.push({
          data: {
            ...node.props,
            id: id,
            label: node.label,
            name: node.props.title || node.props.name || 'Unknown',
            color: baseColor,
            size: size,
            degree: degree
          }
        });
      });

      edges.forEach(e => {
        const srcNode = nodes.find(n => n.id.toString() === e.source.toString());
        const srcColor = srcNode ? (TYPE_COLORS[srcNode.label] || '#94a3b8') : '#94a3b8';
        cyElements.push({
          data: {
            ...e,
            id: `edge-${e.source}-${e.target}`,
            source: e.source.toString(),
            target: e.target.toString(),
            edgeColor: srcColor
          }
        });
      });

      setElements(cyElements);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to load graph data.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportImage = () => {
    if (cyRef.current) {
      const png64 = cyRef.current.png({ output: 'blob', bg: '#020617', full: true });
      const url = URL.createObjectURL(png64);
      const a = document.createElement('a');
      a.href = url;
      a.download = `graph_export.png`;
      a.click();
    }
  };

  const toggleFilter = (type) => {
    setNodeFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const visibleNodeIds = new Set(
    elements
      .filter(el => !el.data.source && nodeFilters[el.data.label] !== false)
      .map(el => el.data.id)
  );

  const filteredElements = elements.filter(el => {
    if (el.data.source) {
      return visibleNodeIds.has(el.data.source) && visibleNodeIds.has(el.data.target);
    }
    return nodeFilters[el.data.label] !== false;
  });

  const layoutConfig = React.useMemo(() => {
    if (isLivePhysics) {
      return {
        name: 'cola',
        animate: true,
        refresh: 2,
        maxSimulationTime: 0,
        ungrabifyWhileSimulating: false,
        fit: false, 
        padding: 50,
        randomize: false,
        nodeSpacing: 30,
        edgeLength: 100,
        infinite: true 
      };
    } else {
      return {
        name: 'cose',
        animate: true,
        animationDuration: 1000,
        animationEasing: 'ease-out-quint',
        randomize: false,
        nodeRepulsion: 15000,
        idealEdgeLength: 120,
        edgeElasticity: 90,
        padding: 50,
        gravity: 0.3,
        fit: false
      };
    }
  }, [isLivePhysics]);

  useEffect(() => {
    // Context-Aware Chat Highlights: if a 'highlightTarget' URL param is present,
    // zoom to that node and highlight its neighborhood once the graph loads.
    if (cyRef.current && !loading && elements.length > 0) {
      const params = new URLSearchParams(location.search);
      const highlightTarget = params.get('highlightTarget');
      
      if (highlightTarget) {
        const matches = cyRef.current.nodes().filter(n => n.data('name') === highlightTarget);
        if (matches.length > 0) {
          const node = matches[0];
          const neighborhood = node.neighborhood().add(node);
          
          cyRef.current.elements().removeClass('faded highlighted');
          cyRef.current.elements().addClass('faded');
          neighborhood.removeClass('faded').addClass('highlighted');
          
          cyRef.current.animate({
            fit: { eles: neighborhood, padding: 50 }
          }, { duration: 500 });
          
          setSelectedNode(node.data());
        }
      }
    }
  }, [loading, elements, location.search]);


  // CSS Stylesheet for Cytoscape
  const cyStylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'width': 'data(size)',
        'height': 'data(size)',
        'label': 'data(name)',
        'font-family': 'Inter, sans-serif',
        'font-size': '10px',
        'color': '#e2e8f0',
        'text-valign': 'bottom',
        'text-margin-y': 6,
        'min-zoomed-font-size': 8, // Automatically hides labels when zoomed out too far
        'shape': 'ellipse',
        'border-width': 1,
        'border-color': 'rgba(255,255,255,0.3)',
        'opacity': 1,
        'shadow-blur': 10,
        'shadow-color': 'data(color)',
        'shadow-opacity': 0.5,
        'transition-property': 'background-color, width, height, shadow-blur, shadow-opacity',
        'transition-duration': '0.3s'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 1,
        'line-color': 'data(edgeColor)',
        'target-arrow-shape': 'none',
        'curve-style': 'bezier',
        'opacity': 0.4,
        'transition-property': 'line-color, width, opacity',
        'transition-duration': '0.3s'
      }
    },
    {
      selector: 'node.hover-active',
      style: {
        'text-opacity': 1,
        'border-width': 3,
        'border-color': '#ffffff',
        'shadow-blur': 30,
        'shadow-opacity': 1,
        'z-index': 100
      }
    },
    {
      selector: 'node.hover-neighbor',
      style: {
        'opacity': 1,
        'text-opacity': 1,
        'shadow-blur': 15,
        'shadow-color': 'data(color)',
        'shadow-opacity': 0.6,
        'border-color': 'data(color)',
        'z-index': 99
      }
    },
    {
      selector: 'edge.hover-active',
      style: {
        'width': 2.5,
        'opacity': 0.9,
        'line-color': 'data(edgeColor)',
        'shadow-blur': 10,
        'shadow-color': 'data(edgeColor)',
        'shadow-opacity': 0.8,
        'z-index': 99
      }
    },
    {
      selector: 'node.faded, edge.faded',
      style: {
        'opacity': 0.05,
        'text-opacity': 0
      }
    },
    {
      selector: '.hidden-node',
      style: {
        'display': 'none'
      }
    }
  ];

  const handleCenter = () => {
    if (cyRef.current) {
      cyRef.current.fit();
      cyRef.current.center();
    }
  };

  const handleFullscreen = () => {
    const elem = document.querySelector('.graph-main-area');
    if (elem) {
      if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => console.error(err));
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.animate({ zoom: cyRef.current.zoom() * 1.5 }, { duration: 300, easing: 'ease-out-cubic' });
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.animate({ zoom: cyRef.current.zoom() * 0.66 }, { duration: 300, easing: 'ease-out-cubic' });
    }
  };

  const handlePredictLinks = async () => {
    setIsPredicting(true);
    setPredictedLinks([]);
    try {
      const res = await axios.post('/api/graph/predict');
      setPredictedLinks(res.data.suggestions || []);
    } catch (err) {
      console.error(err);
      alert("Failed to predict links.");
    } finally {
      setIsPredicting(false);
    }
  };

  const handleSelectNodeByName = (nodeName) => {
    if (!cyRef.current) return;
    const matches = cyRef.current.nodes().filter(n => n.data('name') === nodeName);
    if (matches.length > 0) {
      matches[0].emit('tap');
    }
  };

  const handleChatAboutNode = () => {
    if (!selectedNode) return;
    const topic = selectedNode.name;
    const entityType = selectedNode.label;
    const msg = `Can you explain the ${entityType} "${topic}" and how it is used in the uploaded papers?`;
    navigate('/chat', { state: { initialMessage: msg } });
  };

  return (
    <div className={`graph-container ${selectedNode || predictedLinks.length > 0 ? 'sidebar-open' : ''}`} style={{ margin: '-1.5rem', height: 'calc(100vh - 64px)' }}>
      <div className="graph-main-area">
        <div className="graph-workspace" style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)', borderRadius: 0, overflow: 'hidden', position: 'relative' }}>
        
        {/* Floating Header & Controls */}
        <div style={{ position: 'absolute', top: '24px', left: '24px', right: '24px', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
          
          <div style={{ pointerEvents: 'auto', background: 'rgba(2, 6, 23, 0.4)', padding: '0.5rem 1rem', borderRadius: '8px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h1 style={{ fontSize: '1.25rem', margin: 0, color: '#f8fafc', fontWeight: 600 }}>Knowledge Graph</h1>
          </div>
          
          <div className="graph-controls" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', pointerEvents: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <button className="btn btn-secondary" onClick={() => setShowFilters(!showFilters)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }}>
                <Filter size={16} /> Filters
              </button>
              {showFilters && (
                <div className="glass-card" style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '150px' }}>
                  {Object.keys(nodeFilters).map(type => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={nodeFilters[type]} onChange={() => toggleFilter(type)} />
                      {type}
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: '0.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button className="btn btn-secondary icon-btn" onClick={handleZoomIn} title="Zoom In" style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#94a3b8' }}>
                <ZoomIn size={16} />
              </button>
              <button className="btn btn-secondary icon-btn" onClick={handleZoomOut} title="Zoom Out" style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#94a3b8' }}>
                <ZoomOut size={16} />
              </button>
              <button className="btn btn-secondary icon-btn" onClick={handleFullscreen} title="Fullscreen" style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#94a3b8' }}>
                <Maximize size={16} />
              </button>
              <button className="btn btn-secondary icon-btn" onClick={handleCenter} title="Center Graph" style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#94a3b8' }}>
                <Focus size={16} />
              </button>
              <button 
                className="btn btn-secondary icon-btn" 
                onClick={() => setIsLivePhysics(!isLivePhysics)} 
                title={isLivePhysics ? "Pause Physics (Static Layout)" : "Play Physics (Live Layout)"} 
                style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: isLivePhysics ? '#a855f7' : '#94a3b8' }}
              >
                {isLivePhysics ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button className="btn btn-secondary icon-btn" onClick={fetchGraphData} title="Refresh Physics" style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#94a3b8' }}>
                <RefreshCw size={16} />
              </button>
              <button className="btn btn-secondary icon-btn" onClick={handleExportImage} title="Export Image" style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#94a3b8' }}>
                <Download size={16} />
              </button>
            </div>

            <button className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderRadius: '8px', padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', border: 'none', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)' }} onClick={handlePredictLinks} disabled={isPredicting || elements.length === 0}>
              {isPredicting ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              AI Link Prediction
            </button>
          </div>
        </div>

        <div className="graph-legend-container" style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          
          {showLegend && (
            <div className="graph-legend" style={{ background: 'rgba(2, 6, 23, 0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: '0.75rem', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease-out', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', minWidth: '160px' }}>
              <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.85rem' }}>Entity Types</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }}></div> Paper</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div> Model</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }}></div> Dataset</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }}></div> Task</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 8px #ec4899' }}></div> Method</div>
              </div>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }}></div>
              <div style={{ color: '#94a3b8' }}>• Node size = Connections</div>
            </div>
          )}

          <button 
            className="btn btn-secondary icon-btn"
            onClick={() => setShowLegend(!showLegend)} 
            title="Toggle Legend" 
            style={{ padding: '0.6rem', background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#f8fafc'; e.currentTarget.style.background = 'rgba(2, 6, 23, 0.9)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'rgba(2, 6, 23, 0.6)'; }}
          >
            {showLegend ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Canvas */}
        <div className="cytoscape-wrapper" style={{ animation: 'zoomInLoad 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <style>
            {`
              @keyframes zoomInLoad {
                0% { transform: scale(0.7); opacity: 0; filter: blur(10px); }
                100% { transform: scale(1); opacity: 1; filter: blur(0px); }
              }
            `}
          </style>
          {loading ? (
            <div className="graph-overlay">
              <Loader2 size={40} className="spin text-primary" />
              <p>Loading Knowledge Graph...</p>
            </div>
          ) : error ? (
            <div className="graph-overlay error">
              <AlertCircle size={40} />
              <p>{error}</p>
              <button className="btn btn-primary mt-3" onClick={() => window.location.href='/upload'}>
                Go to Upload
              </button>
            </div>
          ) : (
            <div id="graph-canvas-wrapper" style={{ width: '100%', height: '100%' }}>
              <CytoscapeComponent
                key={isLivePhysics ? 'live' : 'static'}
                elements={filteredElements}
                stylesheet={cyStylesheet}
                layout={layoutConfig}
                style={{ width: '100%', height: '100%', background: 'transparent' }}
                cy={(cy) => { 
                cyRef.current = cy;

                // Only run the initial fit animation once per mount
                if (!cy._hasInitFit) {
                  cy._hasInitFit = true;
                  setTimeout(() => {
                    if (cyRef.current === cy) {
                      cy.animate({ fit: { padding: 50 } }, { duration: 800, easing: 'ease-out-cubic' });
                    }
                  }, 1000);
                }
                
                // Event Listeners for hover spotlight effect
                cy.off('mouseover', 'node');
                cy.on('mouseover', 'node', function(e) {
                  if (cy.scratch('lockedHighlight')) return; // Don't override locked highlight
                  
                  const node = e.target;
                  const connectedEdges = node.connectedEdges();
                  const connectedNodes = connectedEdges.connectedNodes();
                  
                  cy.elements().addClass('faded');
                  
                  node.removeClass('faded').addClass('hover-active');
                  connectedNodes.removeClass('faded').addClass('hover-neighbor');
                  
                  // Highlight only the edges in purple
                  connectedEdges.removeClass('faded').addClass('hover-active');
                  
                  // Show pointer cursor
                  document.getElementById('graph-canvas-wrapper').style.cursor = 'pointer';
                });

                cy.off('mouseout', 'node');
                cy.on('mouseout', 'node', function(e) {
                  if (cy.scratch('lockedHighlight')) return; // Don't clear if locked
                  
                  cy.elements().removeClass('faded hover-active hover-neighbor');
                  document.getElementById('graph-canvas-wrapper').style.cursor = 'default';
                });

                // Tap for selection & Dynamic Camera Focus
                cy.off('tap'); // Clear all tap listeners first
                
                cy.on('tap', (evt) => {
                  if (evt.target === cy) {
                    // Clicked on background
                    setSelectedNode(null);
                    cy.scratch('lockedHighlight', false);
                    cy.elements().removeClass('faded hover-active hover-neighbor');
                  } else if (evt.target.isNode && evt.target.isNode()) {
                    // Clicked on a node
                    const node = evt.target;
                    const data = node.data();
                    
                    // Extract relationships
                    const connectedEdges = node.connectedEdges();
                    const relationships = connectedEdges.map(edge => {
                      const isSource = edge.source().id() === node.id();
                      const targetNode = isSource ? edge.target() : edge.source();
                      return {
                        type: edge.data('label') || edge.data('relationship') || 'connected',
                        direction: isSource ? 'Outgoing' : 'Incoming',
                        targetName: targetNode.data('name'),
                        targetLabel: targetNode.data('label')
                      };
                    });
                    
                    setSelectedNode({ ...data, relationships });
                    
                    // Lock highlight onto this node
                    cy.scratch('lockedHighlight', true);
                    cy.elements().removeClass('faded hover-active hover-neighbor');
                    cy.elements().addClass('faded');
                    node.removeClass('faded').addClass('hover-active');
                    connectedEdges.connectedNodes().removeClass('faded').addClass('hover-neighbor');
                    connectedEdges.removeClass('faded').addClass('hover-active');
                    
                    // Smoothly animate camera to center on this node's neighborhood
                    cy.animate({
                      fit: { eles: node.neighborhood().add(node), padding: 80 },
                      easing: 'ease-out-cubic'
                    }, { duration: 600 });
                  }
                });
              }}
              wheelSensitivity={1.0}
            />
            </div>
          )}
        </div>
      </div>

      {/* Graph Sidebar (Node Details / Predictions) */}
      {(selectedNode || predictedLinks.length > 0) && (
        <aside className="graph-sidebar glass-card fade-in" style={{ width: '380px', display: 'flex', flexDirection: 'column' }}>
          {selectedNode && (
            <div className="node-details" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="node-header" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', paddingRight: '1rem', flex: 1 }}>{selectedNode.name}</h3>
                  <button className="close-btn" onClick={() => setSelectedNode(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge type-${selectedNode.label.toLowerCase()}`}>{selectedNode.label}</span>
                  <button 
                    onClick={handleToggleFocusMode}
                    style={{ 
                      background: focusMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)', 
                      border: `1px solid ${focusMode ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255,255,255,0.1)'}`,
                      color: focusMode ? '#818cf8' : '#94a3b8',
                      padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s'
                    }}
                  >
                    <Target size={12} /> {focusMode ? 'Unfocus' : 'Focus'}
                  </button>
                </div>
              </div>

              {/* TABS */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <button 
                  onClick={() => setActiveTab('details')}
                  style={{ background: 'transparent', border: 'none', color: activeTab === 'details' ? '#f8fafc' : '#94a3b8', fontSize: '0.85rem', fontWeight: activeTab === 'details' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <AlignLeft size={14} /> Details
                </button>
                <button 
                  onClick={() => setActiveTab('context')}
                  style={{ background: 'transparent', border: 'none', color: activeTab === 'context' ? '#f8fafc' : '#94a3b8', fontSize: '0.85rem', fontWeight: activeTab === 'context' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Search size={14} /> Context
                </button>
                <button 
                  onClick={() => setActiveTab('notes')}
                  style={{ background: 'transparent', border: 'none', color: activeTab === 'notes' ? '#f8fafc' : '#94a3b8', fontSize: '0.85rem', fontWeight: activeTab === 'notes' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Edit3 size={14} /> Notes
                </button>
              </div>
              
              {/* TAB CONTENT: DETAILS */}
              {activeTab === 'details' && (
                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                  <div className="node-properties" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {Object.entries(selectedNode).map(([key, val]) => {
                      if (['id', 'name', 'label', 'color', 'size', 'degree', 'relationships', 'session_id', 'workspace_id'].includes(key)) return null;
                      if (typeof val === 'object') return null; // safety check
                      return (
                        <div className="prop-row" key={key} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <span className="prop-key" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.2rem' }}>{key}</span>
                          <span className="prop-val" style={{ color: '#e2e8f0', fontSize: '0.85rem', wordBreak: 'break-word', display: 'block', lineHeight: 1.5 }}>{val}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {selectedNode.relationships && selectedNode.relationships.length > 0 && (
                    <div className="node-relationships">
                      <h4 style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Connections</h4>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        {selectedNode.relationships.map((rel, idx) => (
                          <div 
                            key={idx} 
                            style={{background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'}}
                            onClick={() => handleSelectNodeByName(rel.targetName)}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                          >
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem'}}>
                              <span style={{color: rel.direction === 'Outgoing' ? '#10b981' : '#3b82f6', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600}}>{rel.direction}</span>
                              <span style={{color: 'var(--text-muted)', fontSize: '0.75rem'}}>{rel.type}</span>
                            </div>
                            <div style={{color: '#e2e8f0', fontWeight: 500}}>
                              {rel.targetName} <span style={{fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal'}}>({rel.targetLabel})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button className="btn btn-primary mt-4 w-100" onClick={handleChatAboutNode} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <MessageSquare size={16} />
                    Chat about this {selectedNode.label}
                  </button>
                </div>
              )}

              {/* TAB CONTENT: CONTEXT (RAG & Snippets) */}
              {activeTab === 'context' && (
                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                  {enrichmentData.loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', gap: '1rem', color: '#94a3b8' }}>
                      <Loader2 className="spin" size={24} />
                      <span style={{ fontSize: '0.85rem' }}>Analyzing papers...</span>
                    </div>
                  ) : enrichmentData.error ? (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{enrichmentData.error}</div>
                  ) : enrichmentData.data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      
                      {/* AI Summary */}
                      {enrichmentData.data.summary && (
                        <div>
                          <h4 style={{fontSize: '0.85rem', color: '#a855f7', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                            <Sparkles size={14} /> AI Context Summary
                          </h4>
                          <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                            {enrichmentData.data.summary}
                          </div>
                        </div>
                      )}

                      {/* Wikipedia */}
                      {enrichmentData.data.wikipedia && (
                        <div>
                          <h4 style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem'}}>External Knowledge (Wikipedia)</h4>
                          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, fontStyle: 'italic' }}>
                            {enrichmentData.data.wikipedia}
                          </div>
                        </div>
                      )}

                      {/* Snippets */}
                      {enrichmentData.data.snippets && enrichmentData.data.snippets.length > 0 && (
                        <div>
                          <h4 style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem'}}>Exact Mentions</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {enrichmentData.data.snippets.map((snip, i) => (
                              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', color: '#94a3b8', fontSize: '0.7rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                  <BookOpen size={12} /> {snip.paper} (Page {snip.page})
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                                  "... {snip.text} ..."
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB CONTENT: NOTES */}
              {activeTab === 'notes' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '0.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                    Save your personal thoughts, hypotheses, or tags for this node.
                  </p>
                  <textarea 
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Type your notes here..."
                    style={{ flex: 1, minHeight: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', padding: '0.75rem', borderRadius: '8px', resize: 'vertical', fontSize: '0.9rem', marginBottom: '1rem' }}
                  ></textarea>
                  <button 
                    className="btn btn-primary" 
                    onClick={saveNodeNote} 
                    disabled={isSavingNote}
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {isSavingNote ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                    {isSavingNote ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              )}
            </div>
          )}

          {predictedLinks.length > 0 && (
            <div className="predicted-links mt-4">
              <div className="node-header">
                <h3>AI Predictions</h3>
                <button className="close-btn" onClick={() => setPredictedLinks([])}>&times;</button>
              </div>
              <p className="sidebar-desc">The AI suggests these implicit relationships:</p>
              
              <div className="predictions-list">
                {predictedLinks.map((link, i) => (
                  <div className="prediction-card" key={i}>
                    <div className="pred-entities">
                      <span className="entity-name">{link.source}</span>
                      <Network size={14} className="text-primary" />
                      <span className="entity-name">{link.target}</span>
                    </div>
                    <div className="pred-rel">{link.relationship}</div>
                    <div className="pred-rationale">{link.rationale}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}
      </div>
    </div>
  );
};

export default Graph;
