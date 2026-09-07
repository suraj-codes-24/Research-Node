"""
ResearchNode Configuration

Loads settings from environment variables using Pydantic BaseSettings.
API keys and database URLs are never hardcoded — they come from env vars.
"""

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Application ---
    app_name: str = "ResearchNode"
    app_version: str = "0.1.0"
    debug: bool = True

    # --- Paths ---
    # Base directory is the project root (one level up from backend/)
    base_dir: Path = Path(__file__).resolve().parent.parent
    papers_dir: Path = base_dir / "papers"
    db_dir: Path = base_dir / "database"

    # --- LLM ---
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # --- Qdrant (Phase B) ---
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection: str = "research_chunks"
    qdrant_use_local: bool = True  # Set to False if using Docker Qdrant
    qdrant_path: str = "database/qdrant_storage"

    # --- Neo4j (Phase D) ---
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"

    # --- Embedding Model ---
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimensions: int = 384

    # --- Chunking ---
    chunk_size: int = 1000
    chunk_overlap: int = 200

    # --- RAG (Phase C) ---
    rag_top_k: int = 5

    # --- CORS ---
    frontend_url: str = "http://localhost:5173"

    # --- Upload Limits ---
    max_upload_size_mb: int = 50

    # --- Neon DB (Phase G) ---
    neon_database_url: str = ""

    class Config:
        env_file = str(Path(__file__).resolve().parent / ".env")
        env_file_encoding = "utf-8"


# Singleton instance — import this everywhere
settings = Settings()
