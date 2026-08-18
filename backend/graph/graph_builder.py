import json

import ollama
import spacy

from backend.config import settings
from backend.graph.neo4j_service import get_neo4j_service

# Load spaCy model (ensure it's installed: python -m spacy download en_core_web_sm)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Warning: spaCy en_core_web_sm model not found. Run: python -m spacy download en_core_web_sm")
    nlp = None


class NERExtractor:
    """Uses spaCy to extract simple entities like Organizations, Persons (Authors), etc."""
    
    def extract_entities(self, text: str) -> list[dict]:
        if not nlp or not text:
            return []
            
        doc = nlp(text)
        entities = []
        
        # Filter for relevant entity types (PERSON, ORG, GPE)
        for ent in doc.ents:
            if ent.label_ in ["PERSON", "ORG"]:
                entities.append({
                    "name": ent.text.strip(),
                    "label": "Author" if ent.label_ == "PERSON" else "Entity"
                })
                
        # Deduplicate
        unique_entities = {e["name"]: e for e in entities}
        return list(unique_entities.values())


class LLMEntityExtractor:
    """Uses Ollama to extract structured scientific entities (Models, Methods, Datasets, Tasks)."""
    
    def __init__(self):
        self.client = ollama.Client(host=settings.ollama_host)
        self.model = settings.ollama_model

    def extract_structured(self, text: str) -> dict:
        """
        Extract scientific entities and return as a parsed JSON dict.
        Expected format:
        {
          "models": ["BERT", "Transformer"],
          "methods": ["fine-tuning", "attention"],
          "datasets": ["SQuAD", "ImageNet"],
          "tasks": ["Question Answering", "Image Classification"]
        }
        """
        if not self.model or not text.strip():
            return {"models": [], "methods": [], "datasets": [], "tasks": []}
            
        prompt = f"""
        Extract the following scientific entities from the text below:
        1. Models (e.g., BERT, ResNet, Transformer)
        2. Methods/Techniques (e.g., fine-tuning, backpropagation, attention mechanism)
        3. Datasets (e.g., SQuAD, ImageNet, GLUE)
        4. Tasks (e.g., Question Answering, Object Detection, Text Classification)

        Return ONLY a JSON object with keys: "models", "methods", "datasets", "tasks".
        Each key should map to a list of strings. If none found for a category, use an empty list.

        Text:
        {text}
        """
        
        try:
            response = self.client.generate(model=self.model, prompt=prompt, format='json')
            # Parse the JSON response
            return json.loads(response.get("response", "{}"))
        except Exception as e:
            print(f"LLM Extraction failed: {e}")
            return {"models": [], "methods": [], "datasets": [], "tasks": []}


class GraphBuilder:
    """Orchestrates entity extraction and inserts them into Neo4j."""
    
    def __init__(self):
        self.neo4j = get_neo4j_service()
        self.ner = NERExtractor()
        self.llm = LLMEntityExtractor()
        
    def build_from_paper(self, paper_id: str, title: str, filename: str, abstract: str = ""):
        """
        Extract entities from a paper and insert into Neo4j.
        - Uses spaCy on the title/abstract for fast Author/Org extraction.
        - Uses Ollama on the abstract for complex Models/Methods extraction.
        """
        if not self.neo4j.driver:
            print("GraphBuilder: Neo4j not connected. Skipping graph extraction.")
            return
            
        # 1. Create the Paper Node
        self.neo4j.create_paper_node(paper_id, title, filename)
        
        text_to_analyze = f"{title}\n{abstract}"
        
        # 2. Basic NER (spaCy) - mostly for Authors
        ner_entities = self.ner.extract_entities(text_to_analyze)
        for ent in ner_entities:
            self.neo4j.create_entity_node(label=ent["label"], name=ent["name"])
            # Assume any PERSON in the title/abstract area is an author
            if ent["label"] == "Author":
                self.neo4j.create_relationship(
                    from_label="Paper", from_prop="id", from_val=paper_id,
                    rel_type="AUTHORED_BY",
                    to_label="Author", to_prop="name", to_val=ent["name"]
                )

        # 3. LLM Extraction (Ollama) - for scientific entities
        # To save API costs, we only do this if abstract is provided
        if abstract.strip():
            llm_entities = self.llm.extract_structured(abstract)
            
            # Map the JSON keys to our Node Labels and Relationship Types
            mapping = {
                "models": ("Model", "USES"),
                "methods": ("Method", "USES"),
                "datasets": ("Dataset", "EVALUATED_ON"),  # Using EVALUATED_ON from Paper for simplicity here
                "tasks": ("Task", "APPLIED_TO")
            }
            
            for key, (label, rel_type) in mapping.items():
                for name in llm_entities.get(key, []):
                    if not name.strip(): continue
                    # Create the node
                    self.neo4j.create_entity_node(label=label, name=name)
                    # Link to paper
                    self.neo4j.create_relationship(
                        from_label="Paper", from_prop="id", from_val=paper_id,
                        rel_type=rel_type,
                        to_label=label, to_prop="name", to_val=name
                    )
                    
        print(f"GraphBuilder: Finished processing paper {paper_id}")
