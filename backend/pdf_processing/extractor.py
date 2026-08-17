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
