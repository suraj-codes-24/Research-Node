import json
import urllib.request
import urllib.parse
import uuid
import ollama
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.config import settings
from backend.api.sessions import get_db_connection
from backend.embeddings.embedder import get_embedder, get_vector_store

router = APIRouter(prefix="/api/nodes", tags=["Nodes"])

class AnnotationRequest(BaseModel):
    note: str

@router.get("/{session_id}/{node_name}/enrich")
async def enrich_node(session_id: str, node_name: str, node_type: str = "Entity"):
    """
    Returns snippets from the vector database, an AI-generated summary, 
    and Wikipedia context if applicable.
    """
    try:
        # 1. Fetch raw text snippets from Qdrant
        embedder = get_embedder()
        vector_store = get_vector_store()
        
        # We search for the node_name to find relevant chunks
        query_vector = embedder.embed(f"Information about {node_name}")
        results = vector_store.search(query_vector, top_k=10, session_id=session_id)
        
        snippets = []
        for r in results:
            text = r["payload"].get("chunk_text", "")
            if node_name.lower() in text.lower():
                snippets.append({
                    "text": text,
                    "paper": r["payload"].get("paper_title", "Unknown Paper"),
                    "page": r["payload"].get("page_number", 1)
                })
        
        # Limit to top 3 actual matches
        snippets = snippets[:3]
        
        # 2. Generate Mini-RAG Summary
        summary = ""
        if snippets:
            context = "\n\n".join([s["text"] for s in snippets])
            prompt = f"Based on the following excerpts from scientific papers, write a concise 2-sentence summary of how '{node_name}' is discussed or used. If it's not clear, just say so.\n\nExcerpts:\n{context}"
            
            client = ollama.Client(host=settings.ollama_host)
            response = client.generate(model=settings.ollama_model, prompt=prompt)
            summary = response.get("response", "").strip()
        else:
            summary = f"No direct text snippets found discussing '{node_name}' in the current workspace."
            
        # 3. Wikipedia Fallback (for non-Paper nodes)
        wiki_context = None
        if node_type.lower() != "paper":
            try:
                # Basic wikipedia API call
                url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(node_name)}"
                req = urllib.request.Request(url, headers={'User-Agent': 'ResearchNode/1.0'})
                with urllib.request.urlopen(req, timeout=3) as response:
                    data = json.loads(response.read().decode())
                    if "extract" in data:
                        wiki_context = data["extract"]
            except Exception as e:
                print(f"Wikipedia fetch failed for {node_name}: {e}")
                
        return {
            "summary": summary,
            "snippets": snippets,
            "wikipedia": wiki_context
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}/{node_name}/annotation")
def get_annotation(session_id: str, node_name: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT note FROM node_annotations WHERE session_id = %s AND node_name = %s",
            (session_id, node_name.lower())
        )
        row = cursor.fetchone()
        return {"note": row["note"] if row else ""}
    except Exception as e:
        print(f"Error fetching annotation: {e}")
        return {"note": ""}
    finally:
        conn.close()

@router.post("/{session_id}/{node_name}/annotation")
def save_annotation(session_id: str, node_name: str, req: AnnotationRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # UPSERT logic for Postgres
        cursor.execute("""
            INSERT INTO node_annotations (id, session_id, node_name, note, updated_at)
            VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (session_id, node_name) 
            DO UPDATE SET note = EXCLUDED.note, updated_at = CURRENT_TIMESTAMP
        """, (str(uuid.uuid4()), session_id, node_name.lower(), req.note))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Error saving annotation: {e}")
        raise HTTPException(status_code=500, detail="Failed to save annotation")
    finally:
        conn.close()
