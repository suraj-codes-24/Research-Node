"""
Feedback API — User feedback on RAG responses.

Allows users to rate answers as helpful, incorrect, or missing information.
Stores feedback in a local JSON file for review and system improvement.

Guide Reference: §32 (Monitoring & Feedback), §33 (RAG Evaluation)
"""

import json
import time
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from backend.config import settings

router = APIRouter(prefix="/api", tags=["Feedback"])

# Store feedback in a JSON file
FEEDBACK_FILE = settings.base_dir / "database" / "feedback.json"


class FeedbackRequest(BaseModel):
    query: str
    answer: str
    rating: str  # "helpful", "incorrect", "missing"
    comment: Optional[str] = ""


def _load_feedback() -> list:
    """Load existing feedback from file."""
    if FEEDBACK_FILE.exists():
        try:
            return json.loads(FEEDBACK_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, Exception):
            return []
    return []


def _save_feedback(data: list):
    """Save feedback to file."""
    FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)
    FEEDBACK_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Submit user feedback on a RAG response.
    
    Ratings:
        - "helpful": The answer was useful and accurate
        - "incorrect": The answer contained wrong information
        - "missing": The answer missed relevant information
    """
    feedback_entry = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "query": request.query,
        "answer": request.answer[:500],  # Truncate to save space
        "rating": request.rating,
        "comment": request.comment,
    }

    existing = _load_feedback()
    existing.append(feedback_entry)
    _save_feedback(existing)

    return {
        "message": "Feedback submitted. Thank you!",
        "total_feedback_count": len(existing),
    }


@router.get("/feedback/stats")
async def get_feedback_stats():
    """Get aggregated feedback statistics."""
    existing = _load_feedback()
    
    if not existing:
        return {"total": 0, "helpful": 0, "incorrect": 0, "missing": 0, "satisfaction_rate": 0}

    helpful = sum(1 for f in existing if f["rating"] == "helpful")
    incorrect = sum(1 for f in existing if f["rating"] == "incorrect")
    missing = sum(1 for f in existing if f["rating"] == "missing")
    total = len(existing)

    return {
        "total": total,
        "helpful": helpful,
        "incorrect": incorrect,
        "missing": missing,
        "satisfaction_rate": round((helpful / total) * 100, 1) if total > 0 else 0,
    }
