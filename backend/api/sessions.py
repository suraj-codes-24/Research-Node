"""
Sessions API — Manages persistent chat sessions using PostgreSQL (Neon DB).

Endpoints:
    GET    /api/sessions            — List all sessions
    POST   /api/sessions            — Create a new session
    GET    /api/sessions/{id}       — Get session details and messages
    DELETE /api/sessions/{id}       — Delete a session
"""

import json
import psycopg2
from psycopg2.extras import DictCursor
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.config import settings

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

def get_db_connection():
    if not settings.neon_database_url:
        raise ValueError("NEON_DATABASE_URL environment variable is not set")
    # Using DictCursor to allow accessing row columns by name, similar to sqlite3.Row
    conn = psycopg2.connect(settings.neon_database_url, cursor_factory=DictCursor)
    return conn

def init_db():
    """Initialize the PostgreSQL tables if they don't exist."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                role TEXT,
                content TEXT,
                citations_json TEXT,
                metadata_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS node_annotations (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                node_name TEXT,
                note TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
                UNIQUE (session_id, node_name)
            )
        """)
        conn.commit()
    finally:
        conn.close()


@router.get("")
def list_sessions():
    """List all chat sessions, ordered by most recently updated."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions ORDER BY is_pinned DESC, updated_at DESC")
        rows = cursor.fetchall()
        return {"sessions": [dict(row) for row in rows]}
    finally:
        conn.close()


@router.post("")
def create_session(title: str = "New Session"):
    """Create a new empty session."""
    session_id = str(uuid.uuid4())
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO sessions (id, title) VALUES (%s, %s)",
            (session_id, title)
        )
        conn.commit()
        return {"id": session_id, "title": title}
    finally:
        conn.close()


@router.get("/{session_id}")
def get_session(session_id: str):
    """Get all messages for a specific session."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Get session
        cursor.execute("SELECT * FROM sessions WHERE id = %s", (session_id,))
        session_row = cursor.fetchone()
        if not session_row:
            raise HTTPException(status_code=404, detail="Session not found")
            
        # Get messages
        cursor.execute("SELECT * FROM messages WHERE session_id = %s ORDER BY created_at ASC", (session_id,))
        messages_rows = cursor.fetchall()
        
        messages = []
        for row in messages_rows:
            msg = dict(row)
            # parse json fields
            msg['citations'] = json.loads(msg['citations_json']) if msg['citations_json'] else []
            msg['metadata'] = json.loads(msg['metadata_json']) if msg['metadata_json'] else {}
            # remove raw json fields
            del msg['citations_json']
            del msg['metadata_json']
            
            # format datetime for JSON serialization
            if isinstance(msg.get('created_at'), datetime):
                msg['created_at'] = msg['created_at'].isoformat()
            messages.append(msg)
            
        # Format session datetime as well
        session_dict = dict(session_row)
        if isinstance(session_dict.get('created_at'), datetime):
            session_dict['created_at'] = session_dict['created_at'].isoformat()
        if isinstance(session_dict.get('updated_at'), datetime):
            session_dict['updated_at'] = session_dict['updated_at'].isoformat()
            
        return {
            "session": session_dict,
            "messages": messages
        }
    finally:
        conn.close()


@router.delete("/{session_id}")
def delete_session(session_id: str):
    """Delete a session and all its messages."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE id = %s", (session_id,))
        conn.commit()
        return {"message": "Session deleted"}
    finally:
        conn.close()

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None

@router.put("/{session_id}")
def update_session(session_id: str, request: SessionUpdate):
    """Update a session's title or pinned status."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if request.title is not None and request.is_pinned is not None:
            cursor.execute("UPDATE sessions SET title = %s, is_pinned = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s", (request.title, request.is_pinned, session_id))
        elif request.title is not None:
            cursor.execute("UPDATE sessions SET title = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s", (request.title, session_id))
        elif request.is_pinned is not None:
            cursor.execute("UPDATE sessions SET is_pinned = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s", (request.is_pinned, session_id))
        
        conn.commit()
        return {"message": "Session updated"}
    finally:
        conn.close()
