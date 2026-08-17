"""
QueryRewriter — Rewrites user queries for better retrieval.

Uses Ollama to rephrase vague or conversational questions into precise,
search-optimized queries that produce better embedding matches.

Guide Reference: §22 (Retrieval Quality), §31 (Query Understanding), §37 (Query Rewriting)
"""

import ollama
from backend.config import settings


class QueryRewriter:
    """
    Rewrites user questions to improve vector search retrieval quality.
    
    Examples:
        "What's that attention thing?" → "self-attention mechanism in transformer architecture"
        "How good is BERT?" → "BERT model performance evaluation benchmarks"
    """

    def __init__(self):
        self.client = ollama.Client(host=settings.ollama_host)
        self.model = settings.ollama_model

    def rewrite(self, query: str) -> str:
        """
        Rewrite a user query into a search-optimized version.

        Args:
            query: The original user question.

        Returns:
            A rewritten, search-optimized version of the query.
            Falls back to the original query if rewriting fails.
        """
        if not query.strip():
            return query

        prompt = f"""You are a query rewriting assistant for a scientific literature search engine.

Your job is to rewrite the user's question into a concise, search-optimized query that will produce better results when used for semantic search over research paper chunks.

Rules:
1. Keep the rewritten query SHORT (1-2 sentences max).
2. Expand abbreviations and vague references into precise scientific terms.
3. Remove conversational filler ("can you tell me", "I want to know", etc.).
4. Preserve the original intent exactly — do NOT change what is being asked.
5. Return ONLY the rewritten query, nothing else.

Original question: {query}

Rewritten query:"""

        try:
            response = self.client.generate(model=self.model, prompt=prompt)
            rewritten = response.get("response", "").strip()
            # Sanity check: if the rewrite is empty or way too long, fall back
            if not rewritten or len(rewritten) > len(query) * 5:
                return query
            return rewritten
        except Exception as e:
            print(f"QueryRewriter failed, using original query: {e}")
            return query
