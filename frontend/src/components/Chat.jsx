import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Send, User, Bot, Loader2, BookOpen, ThumbsUp, ThumbsDown, AlertTriangle, Shield, ShieldCheck, ShieldAlert, Sparkles, BarChart3, Search, Scale, Network, Download, MessageSquare, Plus, Trash2 } from 'lucide-react';
import './Chat.css';
import { useSession } from '../context/SessionContext';

const Chat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSessionId, createNewSession, deleteSession: contextDeleteSession, sessionsList } = useSession();
  
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your GraphRAG assistant. Ask me anything about the papers you have uploaded.',
      citations: [],
      confidence: null
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfTitle, setActivePdfTitle] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pipelineStatus]);

  useEffect(() => {
    if (currentSessionId) {
      loadSessionHistory(currentSessionId);
    } else {
      setMessages([{
        role: 'assistant',
        content: 'Hello! I am your GraphRAG assistant. Ask me anything about the papers you have uploaded.',
        citations: [],
        confidence: null
      }]);
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (location.state?.initialMessage) {
      setInput(location.state.initialMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadSessionHistory = async (id) => {
    try {
      const res = await axios.get(`/api/sessions/${id}`);
      const history = res.data.messages;
      
      if (history.length === 0) {
        setMessages([{
          role: 'assistant',
          content: 'Hello! I am your GraphRAG assistant. Ask me anything about the papers you have uploaded.',
          citations: [],
          confidence: null
        }]);
        setConversationHistory([]);
        return;
      }

      const formattedMessages = history.map(msg => ({
        role: msg.role,
        content: msg.content,
        citations: msg.citations || [],
        confidence: msg.metadata?.confidence || null,
        validation: msg.metadata?.validation || null,
        hasGraphContext: msg.metadata?.has_graph || false,
        isStreaming: false,
        isError: false
      }));

      setMessages(formattedMessages);
      
      // Rebuild conversation history for the context array
      const convHist = [];
      for(let i = 0; i < history.length - 1; i+=2) {
         if (history[i].role === 'user' && history[i+1]?.role === 'assistant') {
            convHist.push({
               question: history[i].content,
               answer: history[i+1].content.substring(0, 500)
            });
         }
      }
      setConversationHistory(convHist);

    } catch (err) {
      console.error("Failed to load session history", err);
    }
  };

  const deleteSession = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this session?")) {
      await contextDeleteSession(id);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // Add placeholder for AI response
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '',
      citations: [],
      confidence: null,
      isStreaming: true,
      originalQuestion: userMessage
    }]);

    setIsLoading(true);
    setPipelineStatus('Initializing pipeline...');

    try {
      // Auto-create session if none exists
      let activeSessionId = currentSessionId;
      if (!activeSessionId) {
         activeSessionId = await createNewSession();
      }

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage,
          session_id: activeSessionId,
          conversation_history: [] // Backend handles it now via session_id
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let fullAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // The SSE chunk might contain multiple "data: {...}\n\n" lines
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              if (data.type === 'status') {
                setPipelineStatus(data.content);
                
                // Update metadata if available in status
                if (data.rewritten_query || data.chunks_used) {
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastIdx = newMessages.length - 1;
                    if (data.rewritten_query) newMessages[lastIdx].rewrittenQuery = data.rewritten_query;
                    if (data.chunks_used) newMessages[lastIdx].chunksUsed = data.chunks_used;
                    if (data.retrieval_stats) newMessages[lastIdx].retrievalStats = data.retrieval_stats;
                    return newMessages;
                  });
                }
              } 
              else if (data.type === 'token') {
                setPipelineStatus(''); // Hide pipeline once streaming starts
                fullAnswer += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = fullAnswer;
                  return newMessages;
                });
              }
              else if (data.type === 'done') {
                // Finalize message with metadata
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  lastMsg.isStreaming = false;
                  
                  if (data.answer) {
                      // Handled empty context case
                      lastMsg.content = data.answer;
                  }
                  
                  lastMsg.citations = data.citations || [];
                  lastMsg.confidence = data.confidence;
                  lastMsg.hasGraphContext = !!data.graph_context;
                  lastMsg.validation = data.validation;
                  return newMessages;
                });

                setConversationHistory(prev => [...prev, {
                  question: userMessage,
                  answer: fullAnswer.substring(0, 500)
                }]);
              }
            } catch (err) {
              console.error("Error parsing SSE JSON", err, dataStr);
            }
          }
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        lastMsg.isStreaming = false;
        lastMsg.isError = true;
        lastMsg.content = 'An error occurred while connecting to the GraphRAG pipeline.';
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setPipelineStatus('');
    }
  };

  const handleFeedback = async (msgIndex, rating) => {
    const msg = messages[msgIndex];
    try {
      await axios.post('/api/feedback', {
        query: msg.originalQuestion || '',
        answer: msg.content?.substring(0, 500) || '',
        rating: rating,
        comment: ''
      });
      setMessages(prev => prev.map((m, i) => 
        i === msgIndex ? { ...m, feedbackGiven: rating } : m
      ));
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleExport = async () => {
    if (conversationHistory.length === 0) return;
    setIsExporting(true);
    try {
      const response = await axios.post('/api/export-report', {
        conversation_history: conversationHistory
      });
      const blob = new Blob([response.data.report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Research_Report.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to generate research report. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderMessageContent = (content) => {
    return content.split('\n').map((line, i) => {
      const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
          <br />
        </span>
      );
    });
  };

  const getGroundingIcon = (validation) => {
    if (!validation) return null;
    const score = validation.grounding_score || 0;
    if (score >= 7) return <ShieldCheck size={14} />;
    if (score >= 4) return <Shield size={14} />;
    return <ShieldAlert size={14} />;
  };

  const getGroundingClass = (validation) => {
    if (!validation) return '';
    const score = validation.grounding_score || 0;
    if (score >= 7) return 'grounding-high';
    if (score >= 4) return 'grounding-medium';
    return 'grounding-low';
  };

  // Renders the animated pipeline steps
  const renderPipelineVisualizer = () => {
    if (!pipelineStatus) return null;

    const steps = [
      { id: 'rewriting', label: 'Rewriting Query', icon: <Sparkles size={16} /> },
      { id: 'searching', label: 'Vector Search', icon: <Search size={16} /> },
      { id: 'reranking', label: 'Re-ranking', icon: <Scale size={16} /> },
      { id: 'graph', label: 'Graph Context', icon: <Network size={16} /> },
      { id: 'generating', label: 'Generating', icon: <Bot size={16} /> }
    ];

    let currentStepIndex = 0;
    if (pipelineStatus.includes('Rewriting')) currentStepIndex = 0;
    else if (pipelineStatus.includes('Searching') || pipelineStatus.includes('Vector')) currentStepIndex = 1;
    else if (pipelineStatus.includes('ranking')) currentStepIndex = 2;
    else if (pipelineStatus.includes('Graph')) currentStepIndex = 3;
    else if (pipelineStatus.includes('Generating')) currentStepIndex = 4;

    return (
      <div className="pipeline-visualizer fade-in">
        <div className="pipeline-steps">
          {steps.map((step, idx) => {
            let status = 'waiting'; // waiting, active, completed
            if (idx < currentStepIndex) status = 'completed';
            else if (idx === currentStepIndex) status = 'active';

            return (
              <div key={step.id} className={`pipeline-step ${status}`}>
                <div className="step-icon-wrapper">
                  {status === 'active' ? <Loader2 size={16} className="spin" /> : step.icon}
                </div>
                <span className="step-label">{step.label}</span>
                {idx < steps.length - 1 && <div className="step-connector"></div>}
              </div>
            );
          })}
        </div>
        <p className="pipeline-status-text">{pipelineStatus}</p>
      </div>
    );
  };

  return (
    <div className="chat-container">
        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>GraphRAG Chat</h1>
          <p>Ask questions. Get answers backed by your vector and graph database.</p>
        </div>
        {conversationHistory.length > 0 && (
          <button 
            className="btn btn-secondary" 
            onClick={handleExport}
            disabled={isExporting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isExporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
            {isExporting ? 'Synthesizing...' : 'Export Report'}
          </button>
        )}
      </header>

      <div className={`chat-split-container ${activePdfUrl ? 'pdf-open' : ''}`}>
        <div className="glass-card chat-window">
          <div className="messages-area">
          {messages.map((msg, index) => (
            <div key={index} className={`message-wrapper ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} color="var(--primary)" />}
              </div>
              <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'} ${msg.isError ? 'error-bubble' : ''}`}>
                
                {msg.isStreaming && !msg.content && pipelineStatus && (
                  renderPipelineVisualizer()
                )}

                <div className="message-content">
                  {renderMessageContent(msg.content)}
                  {msg.isStreaming && msg.content && <span className="blinking-cursor">▍</span>}
                </div>
                
                {/* Metadata for AI messages (only show after streaming finishes) */}
                {msg.role === 'assistant' && !msg.isStreaming && !msg.isError && (msg.citations?.length > 0 || msg.confidence) && (
                  <div className="message-metadata fade-in">
                    {/* Badges Row */}
                    <div className="badges-row">
                      {msg.confidence && (
                        <span className={`confidence-badge confidence-${msg.confidence.toLowerCase()}`}>
                          {msg.confidence} Confidence
                        </span>
                      )}
                      {msg.hasGraphContext && (
                        <span className="graph-badge">Graph Context Used</span>
                      )}
                      {msg.validation && (
                        <span className={`grounding-badge ${getGroundingClass(msg.validation)}`}>
                          {getGroundingIcon(msg.validation)}
                          Grounding: {msg.validation.grounding_score || '?'}/10
                        </span>
                      )}
                      {msg.chunksUsed && (
                        <span className="chunks-badge">
                          <BarChart3 size={12} />
                          {msg.chunksUsed} chunks
                        </span>
                      )}
                    </div>

                    {/* Rewritten Query */}
                    {msg.rewrittenQuery && msg.rewrittenQuery !== msg.originalQuestion && (
                      <div className="rewritten-query">
                        <Sparkles size={12} />
                        <span>Search query: <em>"{msg.rewrittenQuery}"</em></span>
                      </div>
                    )}

                    {/* Unsupported Claims Warning */}
                    {msg.validation?.unsupported_claims?.length > 0 && (
                      <div className="unsupported-warning">
                        <AlertTriangle size={14} />
                        <span>Potentially unsupported: {msg.validation.unsupported_claims.join('; ')}</span>
                      </div>
                    )}
                    
                    {/* Enhanced Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="citations-list">
                        <strong>Sources:</strong>
                        {msg.citations.map((cite, i) => {
                          const isObj = typeof cite === 'object';
                          const title = isObj ? cite.paper_title : cite;
                          const paperId = isObj ? cite.paper_id : null;
                          return (
                            <div key={i} className="citation-chip-enhanced-container" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <div 
                                className={`citation-chip-enhanced ${paperId ? 'clickable' : ''}`}
                                onClick={() => {
                                  if (paperId) {
                                    setActivePdfUrl(`/api/papers/${paperId}/pdf`);
                                    setActivePdfTitle(title);
                                  }
                                }}
                                title={paperId ? "Click to view PDF" : ""}
                              >
                                <BookOpen size={12} />
                                <span className="cite-title">{title}</span>
                                {isObj && (
                                  <span className="cite-meta">
                                    {cite.section !== 'General' && <span>§{cite.section}</span>}
                                    {cite.relevance_score && <span>{(cite.relevance_score * 100).toFixed(0)}% match</span>}
                                    {cite.rerank_score && <span>⭐{cite.rerank_score}/10</span>}
                                  </span>
                                )}
                              </div>
                              <button 
                                className="btn btn-icon btn-sm"
                                onClick={() => navigate(`/graph?highlightTarget=${encodeURIComponent(title)}`)}
                                title="View in Knowledge Graph"
                                style={{ padding: '0.2rem' }}
                              >
                                <Network size={14} className="text-primary" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Feedback Buttons */}
                    <div className="feedback-row">
                      {msg.feedbackGiven ? (
                        <span className="feedback-thanks">
                          ✓ Feedback recorded: {msg.feedbackGiven}
                        </span>
                      ) : (
                        <>
                          <span className="feedback-label">Was this helpful?</span>
                          <button className="feedback-btn helpful" onClick={() => handleFeedback(index, 'helpful')} title="Helpful"><ThumbsUp size={14} /></button>
                          <button className="feedback-btn incorrect" onClick={() => handleFeedback(index, 'incorrect')} title="Incorrect"><ThumbsDown size={14} /></button>
                          <button className="feedback-btn missing" onClick={() => handleFeedback(index, 'missing')} title="Missing Information"><AlertTriangle size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSend}>
          <input
            type="text"
            className="input chat-input"
            placeholder="Ask about a method, model, or findings..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="btn btn-primary send-btn"
            disabled={!input.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </form>
        </div>

        {activePdfUrl && (
          <div className="pdf-viewer-pane glass-card fade-in">
            <div className="pdf-header">
              <div className="pdf-title">
                <BookOpen size={16} />
                <span>{activePdfTitle}</span>
              </div>
              <button 
                className="close-pdf-btn" 
                onClick={() => {
                  setActivePdfUrl(null);
                  setActivePdfTitle(null);
                }}
                title="Close PDF"
              >
                &times;
              </button>
            </div>
            <iframe 
              src={activePdfUrl} 
              className="pdf-iframe" 
              title="PDF Viewer"
            ></iframe>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
