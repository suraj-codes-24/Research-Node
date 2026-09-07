import fitz  # PyMuPDF


class PDFExtractor:
    def extract(self, file_path: str) -> str:
        """
        Opens PDF using PyMuPDF (fitz).
        Iterates through all pages.
        Concatenates text from each page.
        Returns complete raw text.
        """
        text = ""
        try:
            doc = fitz.open(file_path)
            for page in doc:
                text += page.get_text() + "\n"
        except Exception as e:
            raise RuntimeError(f"Failed to extract text from {file_path}: {e}")
        finally:
            if 'doc' in locals():
                doc.close()
        
        if not text.strip():
            raise ValueError("No text could be extracted from this PDF")
            
        return text

    def extract_pages(self, file_path: str) -> list[dict]:
        """
        Extracts structured pages from the PDF.
        Returns a list of dicts: [{"page": 1, "text": "..."}]
        """
        pages = []
        try:
            doc = fitz.open(file_path)
            for i, page in enumerate(doc):
                pages.append({
                    "page": i + 1,
                    "text": page.get_text() + "\n"
                })
        except Exception as e:
            raise RuntimeError(f"Failed to extract structured pages from {file_path}: {e}")
        finally:
            if 'doc' in locals():
                doc.close()
                
        if not pages:
            raise ValueError("No pages could be extracted from this PDF")
            
        return pages

    def extract_metadata(self, file_path: str) -> dict:
        """
        Extracts PDF metadata:
        - title, author, subject, page_count
        - creation_date, modification_date
        Returns metadata dictionary.
        """
        try:
            doc = fitz.open(file_path)
            metadata = doc.metadata
            page_count = len(doc)
            doc.close()
            
            return {
                "title": metadata.get("title", ""),
                "author": metadata.get("author", ""),
                "subject": metadata.get("subject", ""),
                "page_count": page_count,
                "creation_date": metadata.get("creationDate", ""),
                "modification_date": metadata.get("modDate", "")
            }
        except Exception as e:
            return {"error": str(e)}
