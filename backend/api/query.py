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

import ollama
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.agents import ContradictionAgent, ExperimentAgent, LiteratureAgent
from backend.config import settings
from backend.graph.neo4j_service import get_neo4j_service
from backend.rag.generator import AnswerGenerator
from backend.rag.retriever import HybridRetriever

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
            # Initial retrieval step (simulated progress)
            yield f"data: {json.dumps({'type': 'status', 'content': 'Rewriting query...'})}\n\n"
            context = retriever.retrieve(request.question)
            
            if not context["vector_chunks"]:
                final_data = {
                    'type': 'done',
                    'answer': "No relevant papers found. Please upload research papers first, then ask your question.",
                    'citations': [],
                    'validation': {"grounded": False, "grounding_score": 0, "unsupported_claims": []},
                    'graph_context': None
                }
                yield f"data: {json.dumps(final_data)}\n\n"
                return

            history = None
            if request.conversation_history:
                history = [{"question": t.question, "answer": t.answer} for t in request.conversation_history]

            yield f"data: {json.dumps({'type': 'status', 'content': 'Generating response...', 'rewritten_query': context.get('rewritten_query'), 'chunks_used': len(context['vector_chunks']), 'retrieval_stats': context.get('retrieval_stats', {})})}\n\n"

            generator = _get_generator()
            for chunk in generator.generate_stream(request.question, context, conversation_history=history):
                yield chunk

        return StreamingResponse(stream_generator(), media_type="text/event-stream")

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {e!s}"
        )


@router.get("/graph")
async def get_full_graph():
    """Get the full knowledge graph. Implemented in Phase D."""
    try:
        neo4j = get_neo4j_service()
        graph_data = neo4j.get_full_graph()
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
