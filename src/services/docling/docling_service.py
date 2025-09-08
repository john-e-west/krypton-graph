"""
Main Docling service wrapper for PDF to Markdown conversion
"""
import asyncio
import hashlib
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from config import DOCLING_CONFIG, IMAGE_OUTPUT_DIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DoclingService:
    """Service wrapper for Docling PDF to Markdown conversion"""
    
    def __init__(self):
        self.config = DOCLING_CONFIG
        self._setup_converter()
    
    def _setup_converter(self):
        """Initialize Docling converter with configuration"""
        try:
            pipeline_options = PdfPipelineOptions(
                do_ocr=False,
                do_table_structure=self.config['extract_tables'],
                table_structure_options={
                    'do_cell_matching': True
                }
            )
            
            self.converter = DocumentConverter(
                allowed_formats=[InputFormat.PDF],
                pipeline_options=pipeline_options
            )
        except TypeError:
            self.converter = DocumentConverter()
    
    async def convert_pdf_to_markdown(
        self,
        file_path: str,
        document_id: str,
        options: Optional[Dict] = None
    ) -> Dict:
        """
        Convert PDF to Markdown with Docling
        
        Args:
            file_path: Path to PDF file
            document_id: Unique document identifier
            options: Optional conversion settings
            
        Returns:
            Conversion result with markdown, images, and metadata
        """
        start_time = datetime.now()
        result = {
            'documentId': document_id,
            'markdown': '',
            'images': [],
            'metadata': {},
            'status': 'failed',
            'errors': []
        }
        
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"PDF file not found: {file_path}")
            
            if not file_path.suffix.lower() == '.pdf':
                raise ValueError("File must be a PDF")
            
            logger.info(f"Starting conversion for {document_id}")
            
            conversion_result = self.converter.convert(str(file_path))
            
            markdown_content = conversion_result.document.export_to_markdown()
            
            extracted_images = []
            if self.config['extract_images'] and hasattr(conversion_result.document, 'pictures'):
                extracted_images = await self._extract_and_save_images(
                    conversion_result.document.pictures,
                    document_id
                )
                
                for idx, image_path in enumerate(extracted_images):
                    image_ref = f"![Image {idx + 1}]({image_path})"
                    markdown_content = self._insert_image_reference(
                        markdown_content, 
                        image_ref, 
                        idx
                    )
            
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            
            page_count = len(conversion_result.document.pages) if hasattr(conversion_result.document, 'pages') else 1
            
            result.update({
                'markdown': markdown_content,
                'images': extracted_images,
                'metadata': {
                    'pageCount': page_count,
                    'processingTime': processing_time,
                    'accuracy': self._calculate_accuracy(markdown_content, file_path),
                    'extractedTables': self._count_tables(markdown_content),
                    'characterCount': len(markdown_content)
                },
                'status': 'success'
            })
            
            logger.info(f"Conversion completed for {document_id} in {processing_time:.2f}s")
            
        except FileNotFoundError as e:
            result['errors'].append(str(e))
            result['status'] = 'failed'
            logger.error(f"File not found error: {e}")
            
        except Exception as e:
            result['errors'].append(f"Conversion error: {str(e)}")
            result['status'] = 'failed'
            logger.error(f"Conversion failed for {document_id}: {e}")
        
        return result
    
    async def _extract_and_save_images(
        self,
        images: List,
        document_id: str
    ) -> List[str]:
        """Extract and save images from PDF"""
        saved_images = []
        
        for idx, image_data in enumerate(images):
            try:
                image_hash = hashlib.md5(str(image_data).encode()).hexdigest()[:8]
                image_filename = f"{document_id}_img_{idx + 1}_{image_hash}.png"
                image_path = IMAGE_OUTPUT_DIR / image_filename
                
                if hasattr(image_data, 'pil_image'):
                    image_data.pil_image.save(str(image_path), 'PNG')
                    relative_path = f"/uploads/images/{image_filename}"
                    saved_images.append(relative_path)
                    logger.info(f"Saved image: {image_filename}")
                    
            except Exception as e:
                logger.error(f"Failed to save image {idx}: {e}")
                continue
        
        return saved_images
    
    def _insert_image_reference(
        self,
        markdown: str,
        image_ref: str,
        position: int
    ) -> str:
        """Insert image reference at appropriate position in markdown"""
        lines = markdown.split('\n')
        
        insert_position = min(position * 10, len(lines))
        
        lines.insert(insert_position, '')
        lines.insert(insert_position + 1, image_ref)
        lines.insert(insert_position + 2, '')
        
        return '\n'.join(lines)
    
    def _calculate_accuracy(self, markdown: str, file_path: Path) -> float:
        """Calculate conversion accuracy score"""
        if not markdown:
            return 0.0
        
        file_size = file_path.stat().st_size
        markdown_size = len(markdown.encode())
        
        if file_size == 0:
            return 0.0
        
        ratio = markdown_size / file_size
        
        if ratio < 0.1:
            return 50.0
        elif ratio > 1.0:
            return 95.0
        else:
            return min(95.0, 50.0 + (ratio * 45.0))
    
    def _count_tables(self, markdown: str) -> int:
        """Count markdown tables in content"""
        table_count = 0
        lines = markdown.split('\n')
        
        for line in lines:
            if '|' in line and '-' in line:
                if all(c in '|-: ' for c in line):
                    table_count += 1
        
        return table_count
    
    def check_pdf_encryption(self, file_path: str) -> bool:
        """Check if PDF is encrypted"""
        try:
            import pypdf
            with open(file_path, 'rb') as pdf_file:
                pdf_reader = pypdf.PdfReader(pdf_file)
                return pdf_reader.is_encrypted
        except Exception as e:
            logger.error(f"Error checking PDF encryption: {e}")
            return False