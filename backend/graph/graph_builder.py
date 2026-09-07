import json
import re
from typing import List

import ollama
import spacy
from pydantic import BaseModel, Field

from backend.config import settings
from backend.graph.neo4j_service import get_neo4j_service

class ScientificEntities(BaseModel):
    models: List[str] = Field(default_factory=list)
    methods: List[str] = Field(default_factory=list)
    datasets: List[str] = Field(default_factory=list)
    tasks: List[str] = Field(default_factory=list)
    authors: List[str] = Field(default_factory=list)
    papers: List[str] = Field(default_factory=list)


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

    def _parse_json_response(self, raw_text: str) -> dict:
        """
        Robustly parses a JSON response from the LLM, handling markdown blocks,
        leading/trailing text, and validating it against the ScientificEntities schema.
        """
        # Strip markdown formatting if present
        match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw_text, re.DOTALL)
        if match:
            raw_text = match.group(1)
        
        # Find the first { and last } to isolate the JSON object
        start_idx = raw_text.find('{')
        end_idx = raw_text.rfind('}')
        if start_idx != -1 and end_idx != -1:
            raw_text = raw_text[start_idx:end_idx+1]
            
        parsed_json = json.loads(raw_text)
        validated_model = ScientificEntities(**parsed_json)
        return validated_model.model_dump()

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
            return ScientificEntities().model_dump()
            
        prompt = f"""
        Extract the following scientific entities from the text below:
        1. Models (e.g., BERT, ResNet, Transformer)
        2. Methods/Techniques (e.g., fine-tuning, backpropagation, attention mechanism)
        3. Datasets (e.g., SQuAD, ImageNet, GLUE)
        4. Tasks (e.g., Question Answering, Object Detection, Text Classification)
        5. Authors
        6. Papers

        Return ONLY a JSON object with keys: "models", "methods", "datasets", "tasks", "authors", "papers".
        Each key should map to a list of strings. If none found for a category, use an empty list.

        Text:
        {text}
        """
        
        max_retries = 1
        for attempt in range(max_retries + 1):
            try:
                response = self.client.generate(model=self.model, prompt=prompt, format='json')
                raw_response = response.get("response", "{}")
                return self._parse_json_response(raw_response)
            except Exception as e:
                print(f"LLM Extraction failed on attempt {attempt + 1}: {e}")
                if attempt == max_retries:
                    # Fallback to empty schema on final failure
                    return ScientificEntities().model_dump()


class GraphBuilder:
    """Orchestrates entity extraction and inserts them into Neo4j."""
    
    def __init__(self):
        self.neo4j = get_neo4j_service()
        self.ner = NERExtractor()
        self.llm = LLMEntityExtractor()
        
    def build_from_paper(self, paper_id: str, title: str, filename: str, abstract: str = "", session_id: str = ""):
        """
        Extract entities from a paper and insert into Neo4j.
        - Uses spaCy on the title/abstract for fast Author/Org extraction.
        - Uses Ollama on the abstract for complex Models/Methods extraction.
        """
        if not self.neo4j.driver:
            print("GraphBuilder: Neo4j not connected. Skipping graph extraction.")
            return
            
        # 1. Create the Paper Node
        self.neo4j.create_paper_node(paper_id, title, filename, session_id=session_id)
        
        text_to_analyze = f"{title}\n{abstract}"
        
        # 2. Basic NER (spaCy) - mostly for Authors
        ner_entities = self.ner.extract_entities(text_to_analyze)
        for ent in ner_entities:
            self.neo4j.create_entity_node(label=ent["label"], name=ent["name"], session_id=session_id)
            # Assume any PERSON in the title/abstract area is an author
            if ent["label"] == "Author":
                self.neo4j.create_relationship(
                    from_label="Paper", from_prop="id", from_val=paper_id,
                    rel_type="AUTHORED_BY",
                    to_label="Author", to_prop="name", to_val=ent["name"],
                    session_id=session_id
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
                    self.neo4j.create_entity_node(label=label, name=name, session_id=session_id)
                    # Link to paper
                    self.neo4j.create_relationship(
                        from_label="Paper", from_prop="id", from_val=paper_id,
                        rel_type=rel_type,
                        to_label=label, to_prop="name", to_val=name,
                        session_id=session_id
                    )
                    
        print(f"GraphBuilder: Finished processing paper {paper_id}")
