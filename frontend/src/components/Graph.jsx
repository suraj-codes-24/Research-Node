import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import CytoscapeComponent from 'react-cytoscapejs';
import { Network, Search, Filter, Loader2, AlertCircle } from 'lucide-react';
import './Graph.css';

const Graph = () => {
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cyRef = useRef(null);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/graph');
      
      const { nodes, edges, message } = response.data;
      
      if (!nodes || nodes.length === 0) {
        setError(message || "Graph is empty.");
        setLoading(false);
        return;
      }

      // Convert backend format to Cytoscape format
      const cyElements = [];
      
      nodes.forEach(node => {
        cyElements.push({
          data: {
            ...node.props,
            id: node.id.toString(),
            label: node.label, // Node type (Paper, Model, etc)
            name: node.props.title || node.props.name || 'Unknown'
          }
        });
      });

      edges.forEach((edge, i) => {
        cyElements.push({
          data: {
            id: `e${i}`,
            source: edge.source.toString(),
            target: edge.target.toString(),
            label: edge.label
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

  // CSS Stylesheet for Cytoscape
  const cyStylesheet = [
    {
      selector: 'node',
      style: {
        'label': 'data(name)',
        'font-family': 'Inter, sans-serif',
        'font-size': '10px',
        'color': '#f1f5f9',
        'text-valign': 'bottom',
        'text-margin-y': '5px',
        'border-width': '2px',
        'border-color': 'rgba(255, 255, 255, 0.2)',
        'text-background-opacity': 1,
        'text-background-color': '#0f1115',
        'text-background-padding': '2px',
        'text-background-shape': 'roundrectangle'
      }
    },
    {
      selector: 'node[label = "Paper"]',
      style: { 'background-color': '#3b82f6', 'shape': 'ellipse', 'width': '35px', 'height': '35px' }
    },
    {
      selector: 'node[label = "Model"]',
      style: { 'background-color': '#10b981', 'shape': 'diamond', 'width': '30px', 'height': '30px' }
    },
    {
      selector: 'node[label = "Method"]',
      style: { 'background-color': '#f59e0b', 'shape': 'triangle', 'width': '30px', 'height': '30px' }
    },
    {
      selector: 'node[label = "Dataset"]',
      style: { 'background-color': '#f97316', 'shape': 'round-rectangle', 'width': '30px', 'height': '30px' }
    },
    {
      selector: 'node[label = "Task"]',
      style: { 'background-color': '#a855f7', 'shape': 'hexagon', 'width': '30px', 'height': '30px' }
    },
    {
      selector: 'node[label = "Author"]',
      style: { 'background-color': '#64748b', 'shape': 'ellipse', 'width': '20px', 'height': '20px' }
    },
    {
      selector: 'node[label = "Entity"]',
      style: { 'background-color': '#94a3b8', 'shape': 'ellipse' }
    },
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': 'rgba(255,255,255,0.15)',
        'target-arrow-color': 'rgba(255,255,255,0.3)',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '8px',
        'color': '#94a3b8',
        'text-background-opacity': 1,
        'text-background-color': '#0f1115',
        'text-background-padding': '1px'
      }
    }
  ];

  const handleCenter = () => {
    if (cyRef.current) {
      cyRef.current.fit();
      cyRef.current.center();
    }
  };

  return (
    <div className="graph-container">
      <header className="page-header graph-header">
        <div>
          <h1>Knowledge Graph</h1>
          <p>Visualizing connections between papers, models, datasets, and methods.</p>
        </div>
        
        <div className="graph-controls">
          <button className="btn btn-secondary" onClick={fetchGraphData}>Refresh</button>
          <button className="btn btn-secondary" onClick={handleCenter}>Center View</button>
        </div>
      </header>

      <div className="glass-card graph-workspace">
        {/* Legend */}
        <div className="graph-legend">
          <h4>Legend</h4>
          <div className="legend-items">
            <div className="legend-item"><span className="legend-shape shape-ellipse" style={{background: '#3b82f6'}}></span> Paper</div>
            <div className="legend-item"><span className="legend-shape shape-diamond" style={{background: '#10b981'}}></span> Model</div>
            <div className="legend-item"><span className="legend-shape shape-triangle" style={{background: '#f59e0b'}}></span> Method</div>
            <div className="legend-item"><span className="legend-shape shape-square" style={{background: '#f97316'}}></span> Dataset</div>
            <div className="legend-item"><span className="legend-shape shape-hexagon" style={{background: '#a855f7'}}></span> Task</div>
            <div className="legend-item"><span className="legend-shape shape-ellipse-sm" style={{background: '#64748b'}}></span> Author</div>
          </div>
        </div>

        {/* Canvas */}
        <div className="cytoscape-wrapper">
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
            <CytoscapeComponent
              elements={elements}
              stylesheet={cyStylesheet}
              layout={{
                name: 'cose',
                animate: true,
                nodeRepulsion: 4000,
                idealEdgeLength: 100,
                padding: 30
              }}
              style={{ width: '100%', height: '100%', background: 'transparent' }}
              cy={(cy) => { cyRef.current = cy; }}
              wheelSensitivity={0.2}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Graph;
