import json
import ollama
from backend.config import settings
from backend.embeddings.embedder import get_vector_store, get_embedder
from backend.graph.neo4j_service import get_neo4j_service

class ContradictionAgent:
    def __init__(self):
        self.vector_store = get_vector_store()
        self.embedder = get_embedder()
        self.neo4j = get_neo4j_service()
        self.client = ollama.Client(host=settings.ollama_host)
        self.model = settings.ollama_model

    def run(self) -> dict:
        """
        Agent to detect contradictions across all loaded papers.
        """
        # Fetch a broad set of text from the vector store (in a real system, we'd query by shared entities)
        # Here we just fetch the top 30 chunks related to "evaluation", "results", "however", "fails", "outperforms"
        queries = ["outperforms", "fails to", "however", "evaluation results"]
        all_chunks = []
        
        for q in queries:
            query_vector = self.embedder.embed(q)
            results = self.vector_store.search(query_vector, top_k=5)
            for res in results:
                payload = res.get("payload", {})
                all_chunks.append({
                    "paper": payload.get("paper_title", "Unknown"),
                    "text": payload.get("chunk_text", "")
                })

        # Deduplicate chunks
        unique_chunks = {c["text"]: c["paper"] for c in all_chunks}
        
        context = ""
        for text, paper in unique_chunks.items():
            context += f"Paper: {paper}\nText: {text}\n\n"

        prompt = f"""
        You are a Contradiction Detection Agent.
        Analyze the following excerpts from scientific papers and identify any conflicting claims, contradictory results, or opposing methodologies.
        
        Context:
        {context}
        
        Provide a structured JSON response exactly matching this schema:
        {{
            "contradictions": [
                {{
                    "paper_a": "Title of first paper",
                    "paper_b": "Title of second paper",
                    "claim_a": "What paper A claims",
                    "claim_b": "What paper B claims",
                    "explanation": "Detailed explanation of why they contradict",
                    "severity": "High, Medium, or Low"
                }}
            ]
        }}
        
        If no contradictions are found, return an empty array for 'contradictions'.
        """

        try:
            response = self.client.generate(model=self.model, prompt=prompt, format='json')
            result_text = response.get("response", "").strip()
            
            if result_text.startswith("```json"):
                result_text = result_text.replace("```json", "", 1).replace("```", "")
                
            return json.loads(result_text)
        except Exception as e:
            print(f"Error in ContradictionAgent: {e}")
            return {
                "contradictions": [],
                "error": str(e)
            }
