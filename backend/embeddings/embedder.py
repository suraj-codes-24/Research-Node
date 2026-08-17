import uuid
import numpy as np
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from langchain_text_splitters import RecursiveCharacterTextSplitter
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

    def search(self, query_vector: np.ndarray, top_k=5) -> list[dict]:
        results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector.tolist(),
            limit=top_k
        )
        return [
            {
                "score": point.score,
                "payload": point.payload
            }
            for point in results.points
        ]


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

