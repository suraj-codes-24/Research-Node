import re


class TextCleaner:
    def clean(self, raw_text: str) -> str:
        """
        Cleans and normalizes extracted PDF text.
        """
        if not raw_text:
            return ""
            
        # 1. Fix hyphenated words at line breaks (e.g., "trans-\nformer" -> "transformer")
        text = re.sub(r'-\n+', '', raw_text)
        
        # 2. Remove excessive whitespace and blank lines
        text = re.sub(r'\n+', '\n', text)
        text = re.sub(r' +', ' ', text)
        
        # 3. Normalize Unicode characters (e.g., smart quotes, dashes)
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace('\'', "'").replace('\'', "'")
        text = text.replace('\u2013', '-').replace('\u2014', '-')
        
        return text.strip()

    def split_sections(self, text: str) -> dict:
        """
        Attempts to identify paper sections based on common headers.
        Returns dict mapping section names to content.
        """
        sections = {}
        headers = [
            "Abstract", "Introduction", "Related Work", "Methodology", 
            "Methods", "Results", "Discussion", "Conclusion", "References"
        ]
        
        current_section = "General"
        sections[current_section] = []
        
        lines = text.split('\n')
        for line in lines:
            line_clean = line.strip()
            # Heuristic check if the line is exactly one of the headers (possibly numbered like "1. Introduction")
            is_header = False
            for h in headers:
                if re.match(r'^(\d+\.?\s*)?' + h + r'$', line_clean, re.IGNORECASE):
                    current_section = h
                    sections[current_section] = []
                    is_header = True
                    break
            
            if not is_header:
                sections[current_section].append(line)
                
        # Join lines back
        for k in sections:
            sections[k] = '\n'.join(sections[k]).strip()
            
        return {k: v for k, v in sections.items() if v}
