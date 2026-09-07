"""
Query API — Question answering, graph, and agent endpoints.

Production-grade RAG pipeline with:
    - Query rewriting for better retrieval
    - Re-ranking for higher quality context
    - Hallucination validation
    - Conversation history for multi-turn chat
    - Enhanced citations with metadata

Endpoints:
    POST /api/query              — RAG pipeline (rewrite → embed → search → rerank → validate → answer)
    GET  /api/graph              — Full Knowledge Graph for Cytoscape
    GET  /api/graph/{paper_id}   — Paper subgraph
    POST /api/agents/literature  — Literature Discovery Agent
    POST /api/agents/contradiction — Contradiction Detection Agent
    POST /api/agents/experiment  — Experiment Suggestion Agent
    GET  /api/recommendations    — AI-generated research recommendations
"""

import json
import uuid

import ollama
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.agents import ContradictionAgent, ExperimentAgent, LiteratureAgent
from backend.config import settings
from backend.graph.neo4j_service import get_neo4j_service
from backend.rag.generator import AnswerGenerator
from backend.rag.retriever import HybridRetriever
from backend.api.sessions import get_db_connection

router = APIRouter(prefix="/api", tags=["Query & Agents"])

# Initialize RAG components (lazy — created on first request)
_retriever = None
_generator = None


def _get_retriever() -> HybridRetriever:
    """Lazy-initialize the retriever to avoid loading the model at import time."""
    global _retriever
    if _retriever is None:
        _retriever = HybridRetriever()
    return _retriever


def _get_generator() -> AnswerGenerator:
    """Lazy-initialize the generator to avoid configuring Ollama at import time."""
    global _generator
    if _generator is None:
        _generator = AnswerGenerator()
    return _generator


class ConversationTurn(BaseModel):
    question: str
    answer: str


class QueryRequest(BaseModel):
    question: str
    session_id: str | None = None
    conversation_history: list[ConversationTurn] | None = None


class LiteratureRequest(BaseModel):
    topic: str


@router.post("/query")
async def ask_question(request: QueryRequest):
    """
    Ask a question about uploaded papers, streaming the response.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        # Step 1-5: Retrieve relevant context (with rewriting + reranking)
        retriever = _get_retriever()
        
        # We need a synchronous wrapper to yield the context immediately, then the stream
        async def stream_generator():
            full_answer = ""
            final_metadata = {}
            
            try:
                # Initial retrieval step (simulated progress)
                yield f"data: {json.dumps({'type': 'status', 'content': 'Rewriting query...'})}\n\n"
                context = await retriever.retrieve(request.question, session_id=request.session_id)
                
                if not context["vector_chunks"]:
                    full_answer = "No relevant papers found. Please upload research papers first, then ask your question."
                    final_metadata = {
                        'validation': {"grounded": False, "grounding_score": 0, "unsupported_claims": []},
                        'citations': [],
                        'confidence': 'Low',
                        'graph_context': None
                    }
                    yield f"data: {json.dumps({'type': 'done', 'answer': full_answer, **final_metadata})}\n\n"
                    return

                history = []
                
                # If session_id is provided, load from SQLite
                if request.session_id:
                    conn = get_db_connection()
                    try:
                        cursor = conn.cursor()
                        # Fetch last 10 messages for context (5 turns)
                        cursor.execute(
                            "SELECT role, content FROM messages WHERE session_id = %s ORDER BY created_at ASC LIMIT 10", 
                            (request.session_id,)
                        )
                        rows = cursor.fetchall()
                        # Convert to Q/A pairs
                        for i in range(0, len(rows) - 1, 2):
                            if rows[i]['role'] == 'user' and rows[i+1]['role'] == 'assistant':
                                history.append({"question": rows[i]['content'], "answer": rows[i+1]['content']})
                    finally:
                        conn.close()
                # Fallback to manual history
                elif request.conversation_history:
                    history = [{"question": t.question, "answer": t.answer} for t in request.conversation_history]

                yield f"data: {json.dumps({'type': 'status', 'content': 'Generating response...', 'rewritten_query': context.get('rewritten_query'), 'chunks_used': len(context['vector_chunks']), 'retrieval_stats': context.get('retrieval_stats', {})})}\n\n"

                generator = _get_generator()
                
                for chunk in generator.generate_stream(request.question, context, conversation_history=history):
                    # We need to capture the full answer and metadata to save it to SQLite
                    if chunk.startswith("data: "):
                        try:
                            data = json.loads(chunk.replace("data: ", "", 1).strip())
                            if data.get("type") == "token":
                                full_answer += data.get("content", "")
                            elif data.get("type") == "done":
                                final_metadata = data
                        except:
                            pass
                    yield chunk
            
            finally:
                # After generation is complete (or cancelled/returned early), save to DB if session_id exists
                if request.session_id and full_answer:
                    conn = get_db_connection()
                    try:
                        cursor = conn.cursor()
                        # Save User Message
                        cursor.execute(
                            "INSERT INTO messages (id, session_id, role, content, citations_json, metadata_json) VALUES (%s, %s, %s, %s, %s, %s)",
                            (str(uuid.uuid4()), request.session_id, 'user', request.question, '[]', '{}')
                        )
                        # Save AI Message
                        cursor.execute(
                            "INSERT INTO messages (id, session_id, role, content, citations_json, metadata_json) VALUES (%s, %s, %s, %s, %s, %s)",
                            (
                                str(uuid.uuid4()), request.session_id, 'assistant', full_answer, 
                                json.dumps(final_metadata.get('citations', [])),
                                json.dumps({
                                    'confidence': final_metadata.get('confidence'),
                                    'validation': final_metadata.get('validation'),
                                    'has_graph': bool(final_metadata.get('graph_context'))
                                })
                            )
                        )
                        # Update session timestamp
                        cursor.execute("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = %s", (request.session_id,))
                        conn.commit()
                    except Exception as e:
                        print(f"Failed to save message to session DB: {e}")
                    finally:
                        conn.close()

        return StreamingResponse(stream_generator(), media_type="text/event-stream")

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {e!s}"
        )


@router.get("/graph")
async def get_full_graph(session_id: str = None):
    """Get the full knowledge graph. Filters by session_id if provided."""
    try:
        neo4j = get_neo4j_service()
        graph_data = neo4j.get_full_graph(session_id)
        return {
            "nodes": graph_data["nodes"],
            "edges": graph_data["edges"],
            "message": "Full Knowledge Graph retrieved successfully." if graph_data["nodes"] else "Knowledge Graph is empty or Neo4j is not connected."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving graph: {e}")


@router.get("/graph/{paper_id}")
async def get_paper_graph(paper_id: str):
    """Get subgraph for a specific paper. Implemented in Phase D."""
    try:
        neo4j = get_neo4j_service()
        subgraph = neo4j.get_paper_subgraph(paper_id)
        return {
            "nodes": subgraph,
            "edges": [],  # Returning relationships inside nodes for now
            "paper_id": paper_id,
            "message": f"Subgraph for paper {paper_id} retrieved."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving subgraph: {e}")


@router.post("/graph/predict")
async def predict_graph_links():
    """Predict 3 new relationships between disconnected nodes in the graph."""
    try:
        neo4j = get_neo4j_service()
        graph_data = neo4j.get_full_graph()
        
        nodes = graph_data.get("nodes", [])
        if len(nodes) < 2:
            return {"suggestions": [], "message": "Not enough nodes in the graph to predict links."}
            
        # Format graph nodes for the prompt
        node_summaries = []
        for n in nodes[:50]:  # Limit to 50 nodes to avoid massive prompts
            node_summaries.append(f"[{n.get('label', 'Entity')}] {n.get('id', 'Unknown')}")
            
        prompt = f"""
        You are a graph analytics AI. Analyze this list of entities from a scientific knowledge graph.
        
        Entities:
        {chr(10).join(node_summaries)}
        
        Suggest exactly 3 plausible, novel relationships between these entities that are NOT explicitly stated but logically make sense (e.g. Model X could be evaluated on Dataset Y, or Method A could improve Model B).
        
        Format your response ONLY as a JSON array of objects, like this:
        [
          {{"source": "Entity1", "target": "Entity2", "relationship": "COULD_IMPROVE", "rationale": "Why this makes sense"}}
        ]
        """
        
        client = ollama.Client(host=settings.ollama_host)
        response = client.generate(model=settings.ollama_model, prompt=prompt, format='json')
        
        import json
        try:
            suggestions = json.loads(response.get("response", "[]"))
        except:
            suggestions = []
            
        return {"suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting links: {e}")


@router.post("/agents/literature")
async def run_literature_agent(req: LiteratureRequest):
    """Run the Literature Discovery Agent."""
    try:
        agent = LiteratureAgent()
        result = agent.run(req.topic)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agents/contradiction")
async def run_contradiction_agent():
    """Run the Contradiction Detection Agent."""
    try:
        agent = ContradictionAgent()
        result = agent.run()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agents/experiment")
async def run_experiment_agent():
    """Run the Experiment Suggestion Agent."""
    try:
        agent = ExperimentAgent()
        result = agent.run()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommendations")
async def get_recommendations():
    """AI-generated research recommendations (Alias for experiment agent)."""
    try:
        agent = ExperimentAgent()
        result = agent.run()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare")
async def compare_papers(papers: str):
    """Compare multiple papers. Comma-separated paper IDs."""
    if not papers:
        raise HTTPException(status_code=400, detail="No paper IDs provided.")
        
    paper_ids = [pid.strip() for pid in papers.split(",")]
    if len(paper_ids) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 paper IDs to compare.")
        
    try:
        neo4j = get_neo4j_service()
        result = neo4j.compare_papers(paper_ids)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error comparing papers: {e}")

class ExportRequest(BaseModel):
    conversation_history: list[ConversationTurn]


@router.post("/export-report")
async def export_report(request: ExportRequest):
    """
    Summarize the entire chat session into a cohesive Markdown research report.
    """
    if not request.conversation_history:
        raise HTTPException(status_code=400, detail="Conversation history is empty.")

    try:
        client = ollama.Client(host=settings.ollama_host)
        model = settings.ollama_model

        # Format conversation history
        formatted_history = ""
        for i, turn in enumerate(request.conversation_history):
            formatted_history += f"Q{i+1}: {turn.question}\nA{i+1}: {turn.answer}\n\n"

        prompt = f"""
        You are an expert scientific synthesizer. Read the following conversation history between a user and an AI research assistant.
        Your task is to generate a cohesive, professional Research Report in Markdown format summarizing the key findings, insights, and topics discussed in this session.
        
        Conversation History:
        {formatted_history}
        
        Rules:
        - Use Markdown headers, bullet points, and bold text for readability.
        - Start with an "Executive Summary" section.
        - Group similar topics together if applicable.
        - Do not just repeat the Q&A; synthesize the information into a continuous report.
        - Output ONLY the Markdown report text, nothing else.
        """

        response = client.generate(model=model, prompt=prompt)
        report_markdown = response.get("response", "").strip()
        
        return {"report": report_markdown}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {e!s}")
