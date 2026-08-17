"""
Paper Summarizer Agent — Generates a 3-bullet summary of a paper upon upload.

Uses Ollama to summarize the first few chunks of a paper to give users
immediate context without needing to ask a question.
"""

import ollama
from backend.config import settings

class PaperSummarizer:
    def __init__(self):
        self.client = ollama.Client(host=settings.ollama_host)
        self.model = settings.ollama_model

    def summarize(self, text: str) -> str:
        """
        Generate a 3-bullet summary of the provided text.
        
        Args:
            text: The first ~2000 characters of the paper (usually Abstract/Intro).
            
        Returns:
            A string containing the 3-bullet summary, or a fallback string on error.
        """
        if not text.strip():
            return "No text available to summarize."

        prompt = f"""You are an expert scientific summarizer. Read the following text from the beginning of a research paper (usually the Abstract or Introduction) and provide a concise, 3-bullet point summary of its key findings or contributions.

Text:
{text[:3000]}

Rules:
- Provide exactly 3 bullet points.
- Start each bullet with a short bold phrase.
- Be concise but highly informative.
- Do NOT output any introductory or concluding text, ONLY the bullet points.

Summary:"""

        try:
            response = self.client.generate(model=self.model, prompt=prompt)
            summary = response.get("response", "").strip()
            return summary
        except Exception as e:
            print(f"PaperSummarizer failed: {e}")
            return "Summary generation failed."
