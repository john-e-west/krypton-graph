"""
PDF-specific conversion logic and utilities
"""
import logging
from pathlib import Path
from typing import Dict, Optional, Tuple
import pypdf

logger = logging.getLogger(__name__)


class PDFConverter:
    """Handles PDF-specific conversion operations"""
    
    @staticmethod
    def validate_pdf(file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate PDF file before processing
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            path = Path(file_path)
            
            if not path.exists():
                return False, "File does not exist"
            
            if not path.suffix.lower() == '.pdf':
                return False, "File is not a PDF"
            
            if path.stat().st_size == 0:
                return False, "PDF file is empty"
            
            if path.stat().st_size > 100 * 1024 * 1024:
                return False, "PDF file is too large (>100MB)"
            
            with open(file_path, 'rb') as pdf_file:
                pdf_reader = pypdf.PdfReader(pdf_file)
                
                if pdf_reader.is_encrypted:
                    return False, "PDF is encrypted"
                
                if len(pdf_reader.pages) == 0:
                    return False, "PDF has no pages"
            
            return True, None
            
        except pypdf.errors.PdfReadError:
            return False, "PDF is corrupted or unreadable"
        except Exception as e:
            logger.error(f"PDF validation error: {e}")
            return False, f"Validation error: {str(e)}"
    
    @staticmethod
    def get_pdf_metadata(file_path: str) -> Dict:
        """Extract PDF metadata"""
        metadata = {
            'title': '',
            'author': '',
            'subject': '',
            'creator': '',
            'producer': '',
            'creation_date': None,
            'modification_date': None,
            'pages': 0
        }
        
        try:
            with open(file_path, 'rb') as pdf_file:
                pdf_reader = pypdf.PdfReader(pdf_file)
                
                metadata['pages'] = len(pdf_reader.pages)
                
                if pdf_reader.metadata:
                    info = pdf_reader.metadata
                    metadata['title'] = info.get('/Title', '')
                    metadata['author'] = info.get('/Author', '')
                    metadata['subject'] = info.get('/Subject', '')
                    metadata['creator'] = info.get('/Creator', '')
                    metadata['producer'] = info.get('/Producer', '')
                    metadata['creation_date'] = info.get('/CreationDate')
                    metadata['modification_date'] = info.get('/ModDate')
                    
        except Exception as e:
            logger.error(f"Error extracting PDF metadata: {e}")
        
        return metadata
    
    @staticmethod
    def extract_text_fallback(file_path: str) -> str:
        """
        Fallback text extraction using pypdf when Docling fails
        """
        text = ""
        try:
            with open(file_path, 'rb') as pdf_file:
                pdf_reader = pypdf.PdfReader(pdf_file)
                
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text += f"\n## Page {page_num + 1}\n\n"
                        text += page_text
                        text += "\n\n"
                        
        except Exception as e:
            logger.error(f"Fallback text extraction failed: {e}")
        
        return text