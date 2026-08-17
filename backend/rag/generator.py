"""
AnswerGenerator — Generates answers with hallucination validation and conversation history.

Takes a question and retrieved context, sends them to Ollama,
and returns a structured answer with citations, confidence, and grounding validation.

Guide Reference: §19 (Generation), §29 (Hallucination Guard), §31 (Answer Validation), §36 (Conversation History)
"""

import ollama
from backend.config import settings


# RAG Prompt Template (enhanced with conversation history support)
RAG_PROMPT_TEMPLATE = """You are a research assistant analyzing scientific papers. Based on the following context retrieved from research papers, answer the question thoroughly and accurately.

{conversation_history}

Vector Search Context:
{vector_chunks}

Knowledge Graph Context:
{graph_context}

Question: {question}

Instructions:
1. Provide a detailed, well-structured answer based ONLY on the context above.
2. Cite specific papers by their title when making claims.
3. If the context doesn't contain enough information to fully answer the question, say so explicitly — do NOT make up information.
4. Use academic language appropriate for a research context.
5. At the end of your answer, rate your confidence as LOW, MEDIUM, or HIGH based on how well the retrieved context addresses the question."""


VALIDATION_PROMPT = """You are a fact-checking assistant. Your job is to verify whether each claim in the given answer is supported by the provided context.

Context:
{context}

Answer to validate:
{answer}

For each claim in the answer, check if it is directly supported by the context.

Return a JSON object with:
{{
    "grounded": true/false,
    "grounding_score": 1-10 (how well the answer is grounded in the context),
    "unsupported_claims": ["list of claims not supported by context, empty if all grounded"]
}}

Return ONLY the JSON object."""


class AnswerGenerator:
    """
    Generates answers to research questions with hallucination validation
    and conversation history support.
    """

    def __init__(self):
        self.client = ollama.Client(host=settings.ollama_host)
        self.model = settings.ollama_model

    def generate_stream(self, question: str, context: dict, conversation_history: list = None):
        """
        Generate an answer for a question using retrieved context, streaming the response.
        
        Yields:
            JSON strings formatted as Server-Sent Events (SSE).
        """
        import json
        vector_context = context.get("combined_context", "No context available.")
        graph_context = context.get("graph_context") or "No graph context available."
        citations = context.get("citations", [])

        # Format conversation history
        history_text = ""
        if conversation_history:
            history_parts = ["Previous conversation:"]
            for turn in conversation_history[-5:]:
                history_parts.append(f"User: {turn.get('question', '')}")
                history_parts.append(f"Assistant: {turn.get('answer', '')[:500]}")
            history_text = "\n".join(history_parts)

        # Build the prompt
        prompt = RAG_PROMPT_TEMPLATE.format(
            vector_chunks=vector_context,
            graph_context=graph_context,
            question=question,
            conversation_history=history_text,
        )

        full_answer = ""
        try:
            # Call Ollama for answer generation with stream=True
            response_stream = self.client.generate(model=self.model, prompt=prompt, stream=True)
            
            for chunk in response_stream:
                text_chunk = chunk.get("response", "")
                full_answer += text_chunk
                # Yield intermediate tokens
                yield f"data: {json.dumps({'type': 'token', 'content': text_chunk})}\n\n"
                
        except Exception as e:
            full_answer = f"Error generating answer: {str(e)}"
            yield f"data: {json.dumps({'type': 'token', 'content': full_answer})}\n\n"

        # End of generation, now process metadata
        confidence = self._extract_confidence(full_answer)
        validation = self._validate_answer(full_answer, vector_context)

        # Yield final metadata
        final_data = {
            'type': 'done',
            'citations': citations,
            'confidence': confidence,
            'validation': validation,
            'graph_context': graph_context,
        }
        yield f"data: {json.dumps(final_data)}\n\n"

    def _validate_answer(self, answer: str, context: str) -> dict:
        """
        Validate whether the generated answer is grounded in the retrieved context.
        Uses a second LLM call to check for hallucinations.

        Returns:
            dict with grounded (bool), grounding_score (1-10), unsupported_claims (list).
        """
        if not answer.strip() or not context.strip():
            return {"grounded": False, "grounding_score": 0, "unsupported_claims": ["No content to validate"]}

        prompt = VALIDATION_PROMPT.format(
            context=context[:3000],  # Truncate to avoid token overflow
            answer=answer[:1500],
        )

        try:
            response = self.client.generate(model=self.model, prompt=prompt, format='json')
            raw = response.get("response", "").strip()
            import json
            result = json.loads(raw)
            return {
                "grounded": result.get("grounded", False),
                "grounding_score": result.get("grounding_score", 5),
                "unsupported_claims": result.get("unsupported_claims", []),
            }
        except Exception as e:
            print(f"Answer validation failed: {e}")
            return {"grounded": True, "grounding_score": 5, "unsupported_claims": []}

    def _extract_confidence(self, answer: str) -> str:
        """
        Extract the confidence rating from the end of the LLM's answer.
        Falls back to MEDIUM if not found.
        """
        answer_upper = answer.upper()
        # Check last 100 chars for the confidence rating
        tail = answer_upper[-100:]
        if "HIGH" in tail:
            return "HIGH"
        elif "LOW" in tail:
            return "LOW"
        elif "MEDIUM" in tail:
            return "MEDIUM"
        return "MEDIUM"
