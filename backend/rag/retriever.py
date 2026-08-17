"""
HybridRetriever — Production-grade retrieval with query rewriting, re-ranking, and enhanced citations.

Full Pipeline:
    1. Query Rewriting (LLM rephrases for better search)
    2. Vector Search (Qdrant — retrieve 15 candidates)
    3. Re-Ranking (LLM scores each chunk, keeps top 5)
    4. Graph Context (Neo4j — enrich with entity relationships)
    5. Enhanced Citations (chunk index, relevance, section metadata)

Guide Reference: §22, §23, §24, §25, §26, §31
"""

from backend.embeddings.embedder import get_embedder, get_vector_store
from backend.graph.neo4j_service import get_neo4j_service
from backend.rag.query_rewriter import QueryRewriter
from backend.rag.reranker import LLMReranker
from backend.config import settings


class HybridRetriever:
    """
    Production-grade hybrid retriever combining vector search, graph context,
    query rewriting, and re-ranking.
    """

    def __init__(self):
        self.embedder = get_embedder()
        self.vector_store = get_vector_store()
        self.neo4j = get_neo4j_service()
        self.rewriter = QueryRewriter()
        self.reranker = LLMReranker(final_top_k=settings.rag_top_k)
        self.top_k = settings.rag_top_k
        # Retrieve more candidates than needed so re-ranking has material to work with
        self.initial_retrieve_k = max(settings.rag_top_k * 3, 15)

    def retrieve(self, query: str, top_k: int = None) -> dict:
        """
        Retrieve relevant context for a question using the full production pipeline.

        Args:
            query: The user's question.
            top_k: Number of final chunks to return (defaults to settings.rag_top_k).

        Returns:
            dict with keys:
                - vector_chunks: list of raw search results (score + payload)
                - graph_context: enriched context from knowledge graph
                - combined_context: formatted string for the LLM prompt
                - citations: list of detailed citation dicts
                - rewritten_query: the search-optimized version of the query
                - retrieval_stats: retrieval quality metrics
        """
        k = top_k or self.top_k

        # === Step 1: Query Rewriting ===
        rewritten_query = self.rewriter.rewrite(query)

        # === Step 2: Embed & Vector Search (retrieve extra candidates) ===
        query_vector = self.embedder.embed(rewritten_query)
        vector_results = self.vector_store.search(query_vector, top_k=self.initial_retrieve_k)

        # === Step 3: Re-Rank (LLM scores each chunk, keeps top-k) ===
        reranked_results = self.reranker.rerank(rewritten_query, vector_results, final_top_k=k)

        # === Step 4: Build Enhanced Context & Citations ===
        context_parts = []
        citations = []
        paper_titles = set()

        for i, result in enumerate(reranked_results, 1):
            payload = result["payload"]
            vector_score = result["score"]
            rerank_score = result.get("rerank_score", "N/A")
            paper_title = payload.get("paper_title", "Unknown Paper")
            chunk_text = payload.get("chunk_text", "")
            chunk_index = payload.get("chunk_index", "?")
            section = payload.get("section", "General")

            paper_titles.add(paper_title)

            context_parts.append(
                f"[Chunk {i}] (Source: \"{paper_title}\", "
                f"Chunk #{chunk_index}, Section: {section}, "
                f"Vector Relevance: {vector_score:.3f}, "
                f"Rerank Score: {rerank_score}/10)\n{chunk_text}"
            )

            # Enhanced citation with full metadata
            citations.append({
                "paper_title": paper_title,
                "chunk_index": chunk_index,
                "section": section,
                "relevance_score": round(vector_score, 3),
                "rerank_score": rerank_score,
                "paper_id": payload.get("paper_id", "")
            })

        combined_context = "\n\n---\n\n".join(context_parts) if context_parts else ""

        # === Step 5: Graph Context (Neo4j) ===
        graph_context = self.neo4j.get_graph_context_for_rag(list(paper_titles))

        # === Step 6: Retrieval Statistics ===
        avg_vector_score = (
            sum(r["score"] for r in reranked_results) / len(reranked_results)
            if reranked_results else 0
        )
        retrieval_stats = {
            "original_query": query,
            "rewritten_query": rewritten_query,
            "candidates_retrieved": len(vector_results),
            "candidates_after_rerank": len(reranked_results),
            "avg_relevance_score": round(avg_vector_score, 3),
            "papers_referenced": len(paper_titles),
        }

        return {
            "vector_chunks": reranked_results,
            "graph_context": graph_context,
            "combined_context": combined_context,
            "citations": citations,
            "rewritten_query": rewritten_query,
            "retrieval_stats": retrieval_stats,
        }
