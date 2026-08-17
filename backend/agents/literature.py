import json
import ollama
from backend.config import settings
from backend.embeddings.embedder import get_vector_store, get_embedder
from backend.graph.neo4j_service import get_neo4j_service

class LiteratureAgent:
    def __init__(self):
        self.vector_store = get_vector_store()
        self.embedder = get_embedder()
        self.neo4j = get_neo4j_service()
        self.client = ollama.Client(host=settings.ollama_host)
        self.model = settings.ollama_model

    def run(self, topic: str) -> dict:
        """
        Agent to discover literature, summarize relationships, and suggest reading order.
        """
        # 1. Vector Search for Topic
        query_vector = self.embedder.embed(topic)
        vector_results = self.vector_store.search(query_vector, top_k=10)
        
        vector_context = ""
        paper_ids = set()
        for res in vector_results:
            payload = res.get("payload", {})
            paper_id = payload.get("paper_id")
            title = payload.get("paper_title")
            text = payload.get("chunk_text")
            if paper_id:
                paper_ids.add(paper_id)
            vector_context += f"Paper: {title} (ID: {paper_id})\nText: {text}\n\n"

        # 2. Graph Search for those papers
        graph_context = ""
        if self.neo4j.driver:
            for pid in paper_ids:
                if pid:
                    subgraph = self.neo4j.get_paper_subgraph(pid)
                    if subgraph:
                        graph_context += f"Graph Context for {pid}:\n"
                        for node in subgraph:
                            graph_context += f"- {node['label']}: {node.get('props', {}).get('name', '')}\n"
                        graph_context += "\n"

        # 3. Gemini Synthesis
        prompt = f"""
        You are a Literature Discovery Agent.
        Analyze the following context regarding the topic: "{topic}".
        
        Vector Search Context:
        {vector_context}
        
        Knowledge Graph Context:
        {graph_context}
        
        Synthesize the research and provide a structured JSON response exactly matching this schema:
        {{
            "related_papers": ["List of relevant paper titles"],
            "relationship_summary": "A cohesive summary of how these papers relate to the topic and each other.",
            "suggested_reading_order": [
                {{"paper": "Title", "reason": "Why read this first/next"}}
            ]
        }}
        """

        try:
            response = self.client.generate(model=self.model, prompt=prompt, format='json')
            result_text = response.get("response", "").strip()
            
            # Handle potential markdown json wrapping
            if result_text.startswith("```json"):
                result_text = result_text.replace("```json", "", 1).replace("```", "")
                
            return json.loads(result_text)
        except Exception as e:
            print(f"Error in LiteratureAgent: {e}")
            return {
                "related_papers": [],
                "relationship_summary": "Failed to generate literature summary.",
                "suggested_reading_order": [],
                "error": str(e)
            }
