import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const SessionContext = createContext();

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }) => {
  const [sessionsList, setSessionsList] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/sessions');
      setSessionsList(res.data.sessions);
      if (res.data.sessions.length > 0 && !currentSessionId) {
        setCurrentSessionId(res.data.sessions[0].id);
      }
    } catch (err) {
      console.error("Failed to load sessions", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const createNewSession = async () => {
    try {
      const res = await axios.post(`/api/sessions?title=Research Session ${sessionsList.length + 1}`);
      const newSession = res.data;
      setSessionsList([newSession, ...sessionsList]);
      setCurrentSessionId(newSession.id);
      return newSession.id;
    } catch (err) {
      console.error("Failed to create session", err);
    }
  };

  const switchSession = (id) => {
    setCurrentSessionId(id);
  };

  const deleteSessionContext = async (id) => {
    try {
      await axios.delete(`/api/sessions/${id}`);
      const updatedList = sessionsList.filter(s => s.id !== id);
      setSessionsList(updatedList);
      if (currentSessionId === id) {
        setCurrentSessionId(updatedList.length > 0 ? updatedList[0].id : null);
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const renameSessionContext = async (id, newTitle) => {
    try {
      await axios.put(`/api/sessions/${id}`, { title: newTitle });
      setSessionsList(sessionsList.map(s => s.id === id ? { ...s, title: newTitle } : s));
    } catch (err) {
      console.error("Failed to rename session", err);
    }
  };

  const togglePinSessionContext = async (id, currentPinStatus) => {
    try {
      const newStatus = currentPinStatus ? 0 : 1;
      await axios.put(`/api/sessions/${id}`, { is_pinned: newStatus === 1 });
      setSessionsList(prev => {
        const updated = prev.map(s => s.id === id ? { ...s, is_pinned: newStatus } : s);
        return updated.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return (b.is_pinned || 0) - (a.is_pinned || 0);
          return new Date(b.updated_at) - new Date(a.updated_at);
        });
      });
      return true;
    } catch (err) {
      console.error("Failed to pin session", err);
      return false;
    }
  };

  return (
    <SessionContext.Provider value={{
      sessionsList,
      currentSessionId,
      createNewSession,
      switchSession,
      deleteSession: deleteSessionContext,
      renameSession: renameSessionContext,
      togglePinSession: togglePinSessionContext,
      loadSessions,
      isLoading
    }}>
      {children}
    </SessionContext.Provider>
  );
};
