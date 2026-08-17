import json

import ollama

from backend.config import settings
from backend.embeddings.embedder import get_embedder, get_vector_store
from backend.graph.neo4j_service import get_neo4j_service


class ExperimentAgent:
    def __init__(self):
        self.vector_store = get_vector_store()
        self.embedder = get_embedder()
        self.neo4j = get_neo4j_service()
        self.client = ollama.Client(host=settings.ollama_host)
        self.model = settings.ollama_model

    def run(self) -> dict:
        """
        Agent to brainstorm novel experiments based on graph gaps and limitations.
        """
        # Search for limitations and future work across all vectors
        queries = ["future work", "limitations", "fails to address", "open challenge", "future direction"]
        all_chunks = []
        
        for q in queries:
            query_vector = self.embedder.embed(q)
            results = self.vector_store.search(query_vector, top_k=4)
            for res in results:
                payload = res.get("payload", {})
                all_chunks.append({
                    "paper": payload.get("paper_title", "Unknown"),
                    "text": payload.get("chunk_text", "")
                })

        unique_chunks = {c["text"]: c["paper"] for c in all_chunks}
        
        vector_context = ""
        for text, paper in unique_chunks.items():
            vector_context += f"Paper: {paper}\nLimitation/Future Work: {text}\n\n"

        # Try to get overall graph structure (types of models and tasks we know about)
        graph_context = ""
        try:
            full_graph = self.neo4j.get_full_graph()
            models = [n["props"].get("name") for n in full_graph.get("nodes", []) if n["label"] == "Model" and n["props"].get("name")]
            tasks = [n["props"].get("name") for n in full_graph.get("nodes", []) if n["label"] == "Task" and n["props"].get("name")]
            
            graph_context += f"Known Models: {', '.join(models[:15])}\n"
            graph_context += f"Known Tasks: {', '.join(tasks[:15])}\n"
        except Exception:
            pass

        prompt = f"""
        You are an Experiment Suggestion Agent.
        Your goal is to brainstorm NOVEL experiments by analyzing the limitations and future work of existing papers, combined with the known models and tasks in the knowledge graph.
        
        Vector Context (Limitations & Future Work):
        {vector_context}
        
        Graph Context (Known Entities):
        {graph_context}
        
        Provide a structured JSON response exactly matching this schema:
        {{
            "suggestions": [
                {{
                    "experiment": "Title of proposed experiment",
                    "rationale": "Why this is a good idea based on the context",
                    "required_resources": ["Dataset X", "Model Y", "Compute Z"],
                    "novelty_score": 8,
                    "based_on": ["Paper A", "Paper B"]
                }}
            ]
        }}
        """

        try:
            response = self.client.generate(model=self.model, prompt=prompt, format='json')
            result_text = response.get("response", "").strip()
            
            if result_text.startswith("```json"):
                result_text = result_text.replace("```json", "", 1).replace("```", "")
                
            return json.loads(result_text)
        except Exception as e:
            print(f"Error in ExperimentAgent: {e}")
            return {
                "suggestions": [],
                "error": str(e)
            }
