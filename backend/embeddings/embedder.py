import uuid

import numpy as np
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, PointStruct, VectorParams, Filter, FieldCondition, MatchValue, FilterSelector
from sentence_transformers import SentenceTransformer

from backend.config import settings


class TextChunker:
    def __init__(self, chunk_size=1000, chunk_overlap=200):
        """
        Initializes LangChain RecursiveCharacterTextSplitter
        with specified chunk_size and chunk_overlap.
        """
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""]
        )

    def chunk(self, text: str) -> list[str]:
        """
        Splits text into overlapping chunks.
        Each chunk is approximately chunk_size characters.
        Overlap ensures context is preserved across boundaries.
        Returns list of chunk strings.
        """
        return self.splitter.split_text(text)

    def chunk_pages(self, pages: list[dict], paper_id: str) -> list[dict]:
        """
        Splits text into paragraph-aware chunks, preserving page numbers and sections.
        Returns a list of dicts: 
        {text, page_number, section_name, chunk_id, paper_id}
        """
        import uuid
        
        chunks = []
        current_section = "General"
        
        for page_data in pages:
            page_num = page_data.get("page", 1)
            text = page_data.get("text", "")
            
            # Simple heuristic for section names: ALL CAPS or Title Case lines < 50 chars
            lines = text.split("\n")
            for line in lines:
                clean_line = line.strip()
                if 2 < len(clean_line) < 50 and (clean_line.isupper() or clean_line.istitle()) and not clean_line.endswith('.'):
                    current_section = clean_line
            
            page_chunks = self.splitter.split_text(text)
            
            for c in page_chunks:
                chunks.append({
                    "text": c,
                    "page_number": page_num,
                    "section_name": current_section,
                    "chunk_id": str(uuid.uuid4()),
                    "paper_id": paper_id
                })
                
        return chunks


class EmbeddingGenerator:
    def __init__(self, model_name=None):
        model_to_use = model_name or settings.embedding_model
        self.model = SentenceTransformer(model_to_use)

    def embed(self, text: str) -> np.ndarray:
        return self.model.encode(text)

    def embed_batch(self, texts: list[str]) -> np.ndarray:
        return self.model.encode(texts)


class VectorStoreManager:
    def __init__(self):
        self.collection_name = settings.qdrant_collection
        
        if settings.qdrant_use_local:
            qdrant_path = str(settings.base_dir / settings.qdrant_path)
            self.client = QdrantClient(path=qdrant_path)
        else:
            self.client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
            
        # Create collection if not exists
        collections = self.client.get_collections().collections
        if not any(c.name == self.collection_name for c in collections):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=settings.embedding_dimensions,
                    distance=Distance.COSINE
                )
            )

    def store(self, embeddings: np.ndarray, metadata_list: list[dict]) -> list[str]:
        points = []
        point_ids = []
        for embedding, metadata in zip(embeddings, metadata_list):
            point_id = str(uuid.uuid4())
            point_ids.append(point_id)
            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding.tolist(),
                    payload=metadata
                )
            )
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        return point_ids

    def search(self, query_vector: np.ndarray, top_k=5, session_id: str = None) -> list[dict]:
        query_filter = None
        if session_id:
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="session_id",
                        match=MatchValue(value=session_id)
                    )
                ]
            )

        results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector.tolist(),
            query_filter=query_filter,
            limit=top_k
        )
        return [
            {
                "score": point.score,
                "payload": point.payload
            }
            for point in results.points
        ]

    def delete_by_paper(self, paper_id: str):
        """Deletes all vector chunks associated with a given paper."""
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=FilterSelector(
                    filter=Filter(
                        must=[
                            FieldCondition(
                                key="paper_id",
                                match=MatchValue(value=paper_id)
                            )
                        ]
                    )
                )
            )
        except Exception as e:
            print(f"Failed to delete vectors for paper {paper_id}: {e}")



# --- Singletons ---
# Local Qdrant only allows one client connection at a time.
# These singletons ensure the entire app shares one instance.

_embedder_instance = None
_vector_store_instance = None


def get_embedder() -> EmbeddingGenerator:
    """Get the shared EmbeddingGenerator singleton."""
    global _embedder_instance
    if _embedder_instance is None:
        _embedder_instance = EmbeddingGenerator()
    return _embedder_instance


def get_vector_store() -> VectorStoreManager:
    """Get the shared VectorStoreManager singleton."""
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = VectorStoreManager()
    return _vector_store_instance

