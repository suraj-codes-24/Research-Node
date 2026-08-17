"""
ResearchNode — FastAPI Application

Entry point for the backend server.
Run with: uvicorn backend.main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.feedback import router as feedback_router
from backend.api.health import router as health_router
from backend.api.query import router as query_router
from backend.api.upload import router as upload_router
from backend.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events.
    - Startup: create papers directory, initialize services
    - Shutdown: close database connections
    """
    # --- Startup ---
    # Ensure the papers directory exists
    settings.papers_dir.mkdir(parents=True, exist_ok=True)
    print(f"Papers directory: {settings.papers_dir}")
    print(f"{settings.app_name} v{settings.app_version} starting...")

    yield  # App runs here

    # --- Shutdown ---
    print(f"{settings.app_name} shutting down...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="GraphRAG Reasoning Engine for Scientific Literature",
    lifespan=lifespan,
)

# CORS — allow the React frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(upload_router)
app.include_router(query_router)
app.include_router(feedback_router)
app.include_router(health_router)


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint — TC-17."""
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
    }
