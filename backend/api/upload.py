"""
Upload API — Paper upload and management endpoints.

Endpoints:
    POST /api/upload-paper   — Upload a PDF research paper
    GET  /api/papers         — List all uploaded papers
    GET  /api/papers/{id}    — Get details of a specific paper
    DELETE /api/papers/{id}  — Delete a paper and its associated data
"""

import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, Form
from fastapi.responses import FileResponse

from backend.agents.summarizer import PaperSummarizer
from backend.config import settings
from backend.embeddings.embedder import TextChunker, get_embedder, get_vector_store
from backend.graph.graph_builder import GraphBuilder
from backend.graph.neo4j_service import get_neo4j_service
from backend.pdf_processing.cleaner import TextCleaner
from backend.pdf_processing.extractor import PDFExtractor

router = APIRouter(prefix="/api", tags=["Papers"])

# In-memory paper store (will be replaced with a proper DB later)
papers_db: dict = {}

# Initialize processing classes
extractor = PDFExtractor()
cleaner = TextCleaner()
chunker = TextChunker(chunk_size=settings.chunk_size, chunk_overlap=settings.chunk_overlap)
graph_builder = GraphBuilder()


@router.post("/upload-paper")
async def upload_paper(file: UploadFile = File(...), session_id: str = Form(...)):
    """
    Upload a PDF research paper.

    - Validates the file is a PDF and under the size limit
    - Saves it to the papers/ directory
    - Returns a paper_id for future reference

    Matches: FR-01 from SRS, TC-01 and TC-02 from Testing Plan.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted."
        )

    # Read file content
    content = await file.read()

    # Validate file size (max 50 MB)
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_upload_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Maximum is {settings.max_upload_size_mb} MB."
        )

    # Generate unique paper ID
    paper_id = str(uuid.uuid4())[:8]

    # Save to papers/ directory
    save_path = settings.papers_dir / f"{paper_id}_{file.filename}"
    save_path.write_bytes(content)

    summary = ""
    # Process the PDF
    try:
        raw_pages = extractor.extract_pages(str(save_path))
        # Reconstruct raw_text for existing downstream functions (e.g. abstract extraction)
        raw_text = "\n".join([p["text"] for p in raw_pages])
        metadata = extractor.extract_metadata(str(save_path))
        
        # Clean each page independently
        cleaned_pages = [
            {"page": p["page"], "text": cleaner.clean(p["text"])} 
            for p in raw_pages
        ]
        cleaned_text = cleaner.clean(raw_text)
        
        chunks = chunker.chunk_pages(cleaned_pages, paper_id)
        chunks_count = len(chunks)
        
        # Embed and store chunks
        if chunks_count > 0:
            texts = [c["text"] for c in chunks]
            embeddings = get_embedder().embed_batch(texts)
            paper_title = metadata.get("title") or file.filename.replace(".pdf", "")
            
            metadata_list = []
            for i, c in enumerate(chunks):
                metadata_list.append({
                    "paper_id": c["paper_id"],
                    "session_id": session_id,
                    "paper_title": paper_title,
                    "chunk_id": c["chunk_id"],
                    "chunk_index": i,  # Maintained for backward compatibility
                    "chunk_text": c["text"],
                    "page_number": c["page_number"],
                    "section": c["section_name"]
                })
                
            get_vector_store().store(embeddings, metadata_list)
            
        # Extract and store graph entities
        abstract = cleaner.split_sections(cleaned_text).get("Abstract", "")
        if not abstract.strip():
            # Fallback to first 2000 characters if Abstract regex fails
            abstract = cleaned_text[:2000]
            
        graph_builder.build_from_paper(
            paper_id=paper_id,
            title=metadata.get("title") or file.filename.replace(".pdf", ""),
            filename=file.filename,
            abstract=abstract,
            session_id=session_id
        )
        
        # Generate Auto-Summary
        summarizer = PaperSummarizer()
        summary = summarizer.summarize(abstract)
            
        status = "processed"
    except Exception as e:
        print(f"Error processing PDF {file.filename}: {e}")
        status = "error"
        chunks_count = 0
        summary = "Summarization failed due to processing error."

    # Store metadata
    papers_db[paper_id] = {
        "paper_id": paper_id,
        "title": metadata.get("title") or file.filename.replace(".pdf", ""),
        "filename": file.filename,
        "file_path": str(save_path),
        "size_mb": round(size_mb, 2),
        "upload_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "status": status,
        "chunks_count": chunks_count,
        "page_count": metadata.get("page_count", 0) if status == "processed" else 0,
        "summary": summary,
        "session_id": session_id,
    }

    return {
        "paper_id": paper_id,
        "title": papers_db[paper_id]["title"],
        "status": status,
        "chunks_count": chunks_count,
        "size_mb": round(size_mb, 2),
        "message": f"Paper '{file.filename}' uploaded and processed successfully." if status == "processed" else "Paper uploaded but processing failed.",
        "summary": summary,
    }


@router.get("/papers")
async def list_papers(session_id: Optional[str] = None):
    """List all uploaded papers. Filters by session_id if provided."""
    papers = list(papers_db.values())
    if session_id:
        papers = [p for p in papers if p.get("session_id") == session_id]
        
    return {
        "count": len(papers),
        "papers": papers,
    }


@router.get("/papers/{paper_id}")
async def get_paper(paper_id: str):
    """Get details of a specific paper."""
    if paper_id not in papers_db:
        raise HTTPException(status_code=404, detail="Paper not found.")
    return papers_db[paper_id]


@router.delete("/papers/{paper_id}")
async def delete_paper(paper_id: str):
    """Delete a paper and its file, as well as its vector and graph data."""
    if paper_id not in papers_db:
        raise HTTPException(status_code=404, detail="Paper not found.")

    # Delete the file
    file_path = Path(papers_db[paper_id]["file_path"])
    if file_path.exists():
        file_path.unlink()

    # Clean up Vector Database (Qdrant)
    try:
        get_vector_store().delete_by_paper(paper_id)
    except Exception as e:
        print(f"Failed to clean up vectors: {e}")

    # Clean up Knowledge Graph (Neo4j)
    try:
        get_neo4j_service().delete_paper(paper_id)
    except Exception as e:
        print(f"Failed to clean up graph: {e}")

    # Remove from store
    del papers_db[paper_id]

    return {"message": f"Paper {paper_id} and its associated data have been completely deleted.", "paper_id": paper_id}


@router.get("/papers/{paper_id}/pdf")
async def get_paper_pdf(paper_id: str):
    """Serve the raw PDF file for a specific paper."""
    if paper_id not in papers_db:
        raise HTTPException(status_code=404, detail="Paper not found.")
    
    file_path = Path(papers_db[paper_id]["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found on disk.")
        
    return FileResponse(
        path=file_path, 
        media_type="application/pdf", 
        filename=papers_db[paper_id]["filename"]
    )
