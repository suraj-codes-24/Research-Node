"""
Health API — Detailed system health check endpoint.

Returns live connectivity status for all services:
Ollama, Neo4j, Qdrant, and the backend itself.

Guide Reference: §32 (Monitoring)
"""

import time

from fastapi import APIRouter

from backend.config import settings

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health/detailed")
async def detailed_health():
    """
    Returns detailed health status for all system components.
    
    Checks:
        - Ollama LLM server connectivity + model availability
        - Neo4j graph database connectivity + node count
        - Qdrant vector store connectivity + collection stats
        - Backend application metadata
    """
    result = {
        "status": "ok",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "services": {}
    }

    # --- Check Ollama ---
    try:
        import json
        import urllib.request
        resp = urllib.request.urlopen(f"{settings.ollama_host}/api/tags", timeout=3)
        data = json.loads(resp.read().decode())
        models = [m["name"] for m in data.get("models", [])]
        result["services"]["ollama"] = {
            "status": "connected",
            "host": settings.ollama_host,
            "model": settings.ollama_model,
            "available_models": models,
            "model_loaded": any(settings.ollama_model in m for m in models),
        }
    except Exception as e:
        result["services"]["ollama"] = {"status": "disconnected", "error": str(e)}
        result["status"] = "degraded"

    # --- Check Neo4j ---
    try:
        from backend.graph.neo4j_service import get_neo4j_service
        neo4j = get_neo4j_service()
        if neo4j.driver:
            counts = neo4j.query("MATCH (n) RETURN count(n) as count")
            node_count = counts[0]["count"] if counts else 0
            result["services"]["neo4j"] = {
                "status": "connected",
                "uri": settings.neo4j_uri,
                "node_count": node_count,
            }
        else:
            result["services"]["neo4j"] = {"status": "disconnected", "error": "Driver not initialized"}
            result["status"] = "degraded"
    except Exception as e:
        result["services"]["neo4j"] = {"status": "disconnected", "error": str(e)}
        result["status"] = "degraded"

    # --- Check Qdrant ---
    try:
        from backend.embeddings.embedder import get_vector_store
        vs = get_vector_store()
        info = vs.client.get_collection(settings.qdrant_collection)
        result["services"]["qdrant"] = {
            "status": "connected",
            "collection": settings.qdrant_collection,
            "vectors_count": info.vectors_count,
            "points_count": info.points_count,
        }
    except Exception as e:
        result["services"]["qdrant"] = {"status": "disconnected", "error": str(e)}
        result["status"] = "degraded"

    # --- Backend Info ---
    result["services"]["backend"] = {
        "status": "running",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "embedding_model": settings.embedding_model,
        "llm_model": settings.ollama_model,
        "chunk_size": settings.chunk_size,
        "chunk_overlap": settings.chunk_overlap,
        "rag_top_k": settings.rag_top_k,
    }

    return result
