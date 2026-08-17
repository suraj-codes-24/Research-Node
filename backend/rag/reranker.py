"""
Reranker — Reorders retrieved chunks by relevance.

After initial vector search retrieves ~15 candidate chunks,
this module uses the LLM to score each chunk's relevance to the query
and keeps only the top-scoring ones.

Guide Reference: §24 (Re-Ranking), §30 (Failure Mode 1: Wrong Chunk), §31 (Production Pipeline)
"""

import json

import ollama

from backend.config import settings


class LLMReranker:
    """
    Uses the local LLM to re-rank retrieved chunks by relevance.
    
    Flow:
        1. Receive 15-20 candidate chunks from vector search
        2. Ask LLM to score each chunk's relevance to the query (1-10)
        3. Sort by score descending
        4. Return only the top-k highest scoring chunks
    """

    def __init__(self, final_top_k: int = 5):
        self.client = ollama.Client(host=settings.ollama_host)
        self.model = settings.ollama_model
        self.final_top_k = final_top_k

    def rerank(self, query: str, chunks: list[dict], final_top_k: int = None) -> list[dict]:
        """
        Re-rank a list of retrieved chunks by their relevance to the query.

        Args:
            query: The user's search query.
            chunks: List of dicts with "score" and "payload" keys from vector search.
            final_top_k: Number of top chunks to keep (defaults to self.final_top_k).

        Returns:
            Re-ranked and filtered list of chunk dicts, with an added "rerank_score" field.
        """
        k = final_top_k or self.final_top_k

        if not chunks or len(chunks) <= k:
            return chunks

        # Build a compact representation for the LLM
        chunk_summaries = []
        for i, chunk in enumerate(chunks):
            text = chunk.get("payload", {}).get("chunk_text", "")
            # Truncate each chunk to 300 chars to keep prompt manageable
            truncated = text[:300] + "..." if len(text) > 300 else text
            chunk_summaries.append(f"[Chunk {i}]: {truncated}")

        chunks_text = "\n\n".join(chunk_summaries)

        prompt = f"""You are a relevance scoring assistant. Score each chunk's relevance to the query on a scale of 1-10.

Query: "{query}"

Chunks:
{chunks_text}

Return a JSON array of objects, one per chunk, with keys "index" (chunk number) and "score" (1-10 integer).
Example: [{{"index": 0, "score": 8}}, {{"index": 1, "score": 3}}]

Return ONLY the JSON array, nothing else."""

        try:
            response = self.client.generate(model=self.model, prompt=prompt, format='json')
            raw = response.get("response", "").strip()
            
            # Parse scores - handle both array and object responses
            scores_data = json.loads(raw)
            
            # If the LLM wrapped it in an object, extract the array
            if isinstance(scores_data, dict):
                # Try common keys
                for key in ["scores", "chunks", "results", "data"]:
                    if key in scores_data and isinstance(scores_data[key], list):
                        scores_data = scores_data[key]
                        break
            
            if not isinstance(scores_data, list):
                # Fallback: return original chunks truncated to top-k
                return chunks[:k]

            # Build index → score mapping
            score_map = {}
            for item in scores_data:
                if isinstance(item, dict) and "index" in item and "score" in item:
                    score_map[int(item["index"])] = int(item["score"])

            # Annotate chunks with rerank scores
            scored_chunks = []
            for i, chunk in enumerate(chunks):
                rerank_score = score_map.get(i, 5)  # Default 5 if missing
                chunk_copy = dict(chunk)
                chunk_copy["rerank_score"] = rerank_score
                scored_chunks.append(chunk_copy)

            # Sort by rerank score (descending), then by original vector score
            scored_chunks.sort(key=lambda c: (c["rerank_score"], c.get("score", 0)), reverse=True)

            return scored_chunks[:k]

        except Exception as e:
            print(f"Reranker failed, using original order: {e}")
            return chunks[:k]
