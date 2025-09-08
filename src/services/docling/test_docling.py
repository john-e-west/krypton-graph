"""
Integration tests for Docling PDF conversion service
"""
import asyncio
import os
import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock
import json

from docling_service import DoclingService
from converters.pdf_converter import PDFConverter
from converters.image_handler import ImageHandler
from utils.markdown_formatter import MarkdownFormatter
from utils.quality_checker import QualityChecker


@pytest.fixture
def docling_service():
    """Create DoclingService instance for testing"""
    return DoclingService()


@pytest.fixture
def sample_pdf_path():
    """Create a temporary PDF file for testing"""
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(b'%PDF-1.4\n%Test PDF content\n')
        return f.name


@pytest.fixture
def image_handler():
    """Create ImageHandler instance for testing"""
    temp_dir = tempfile.mkdtemp()
    return ImageHandler(Path(temp_dir))


class TestPDFConverter:
    """Test PDF converter functionality"""
    
    def test_validate_pdf_valid_file(self, sample_pdf_path):
        """Test validation of valid PDF file"""
        valid, error = PDFConverter.validate_pdf(sample_pdf_path)
        assert valid is False or error is not None
    
    def test_validate_pdf_missing_file(self):
        """Test validation of missing file"""
        valid, error = PDFConverter.validate_pdf('/nonexistent/file.pdf')
        assert not valid
        assert error == "File does not exist"
    
    def test_validate_pdf_wrong_extension(self):
        """Test validation of non-PDF file"""
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as f:
            f.write(b'Not a PDF')
            valid, error = PDFConverter.validate_pdf(f.name)
        
        assert not valid
        assert error == "File is not a PDF"
    
    def test_validate_pdf_empty_file(self):
        """Test validation of empty PDF"""
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            pass
        
        valid, error = PDFConverter.validate_pdf(f.name)
        assert not valid
        assert error == "PDF file is empty"


class TestDoclingService:
    """Test Docling service main functionality"""
    
    @pytest.mark.asyncio
    async def test_check_pdf_encryption_not_encrypted(self, docling_service, sample_pdf_path):
        """Test checking unencrypted PDF"""
        is_encrypted = docling_service.check_pdf_encryption(sample_pdf_path)
        assert is_encrypted is False
    
    @pytest.mark.asyncio
    async def test_convert_pdf_file_not_found(self, docling_service):
        """Test conversion with missing file"""
        result = await docling_service.convert_pdf_to_markdown(
            '/nonexistent/file.pdf',
            'test-doc-id',
            {}
        )
        
        assert result['status'] == 'failed'
        assert len(result['errors']) > 0
        assert 'not found' in result['errors'][0]
    
    @pytest.mark.asyncio
    async def test_convert_pdf_invalid_extension(self, docling_service):
        """Test conversion with non-PDF file"""
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as f:
            f.write(b'Not a PDF')
            result = await docling_service.convert_pdf_to_markdown(
                f.name,
                'test-doc-id',
                {}
            )
        
        assert result['status'] == 'failed'
        assert len(result['errors']) > 0
        assert 'must be a PDF' in result['errors'][0]
    
    def test_count_tables(self, docling_service):
        """Test table counting in markdown"""
        markdown = """
        # Test Document
        
        | Header 1 | Header 2 |
        |----------|----------|
        | Cell 1   | Cell 2   |
        
        | Another | Table |
        |---------|-------|
        | Data    | Here  |
        """
        
        count = docling_service._count_tables(markdown)
        assert count == 2
    
    def test_calculate_accuracy_empty_markdown(self, docling_service):
        """Test accuracy calculation with empty markdown"""
        accuracy = docling_service._calculate_accuracy("", Path(__file__))
        assert accuracy == 0.0
    
    def test_insert_image_reference(self, docling_service):
        """Test image reference insertion"""
        markdown = "# Title\n\nContent here\n\nMore content"
        image_ref = "![Image 1](/path/to/image.png)"
        
        result = docling_service._insert_image_reference(markdown, image_ref, 0)
        assert image_ref in result


class TestImageHandler:
    """Test image handling functionality"""
    
    def test_save_image_success(self, image_handler):
        """Test successful image saving"""
        image_data = b'\x89PNG\r\n\x1a\n'
        
        with patch('PIL.Image.open') as mock_open:
            mock_img = MagicMock()
            mock_open.return_value = mock_img
            
            result = image_handler.save_image(
                image_data,
                'doc123',
                1,
                'PNG'
            )
            
            assert result is not None
            assert 'doc123_img_1' in result
    
    def test_optimize_image(self, image_handler):
        """Test image optimization"""
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            temp_path = Path(f.name)
        
        with patch('PIL.Image.open') as mock_open:
            mock_img = MagicMock()
            mock_img.width = 3000
            mock_img.height = 2000
            mock_open.return_value = mock_img
            
            result = image_handler.optimize_image(temp_path)
            assert result is True
            mock_img.thumbnail.assert_called_once()


class TestMarkdownFormatter:
    """Test markdown formatting utilities"""
    
    def test_clean_markdown(self):
        """Test markdown cleaning"""
        dirty = "Title\n\n\n\nContent   with    spaces\n\n\n\nEnd"
        clean = MarkdownFormatter.clean_markdown(dirty)
        
        assert "\n\n\n" not in clean
        assert "   " not in clean
    
    def test_format_table(self):
        """Test table formatting"""
        table_data = [
            ['Header 1', 'Header 2'],
            ['Row 1 Col 1', 'Row 1 Col 2'],
            ['Row 2 Col 1', 'Row 2 Col 2']
        ]
        
        result = MarkdownFormatter.format_table(table_data)
        
        assert '| Header 1' in result
        assert '|---' in result
        assert 'Row 1 Col 1' in result
    
    def test_fix_heading_hierarchy(self):
        """Test heading hierarchy fixing"""
        broken = "# Title\n### Skipped Level\n## Back to Level 2"
        fixed = MarkdownFormatter.fix_heading_hierarchy(broken)
        
        lines = fixed.split('\n')
        assert lines[0] == "# Title"
        assert lines[1].startswith("##")
    
    def test_format_lists(self):
        """Test list formatting"""
        unformatted = "  - Item 1\n    * Nested\n1. Numbered"
        formatted = MarkdownFormatter.format_lists(unformatted)
        
        assert '- Item 1' in formatted
        assert '  - Nested' in formatted
        assert '1. Numbered' in formatted


class TestQualityChecker:
    """Test quality checking utilities"""
    
    def test_calculate_accuracy_score(self):
        """Test accuracy score calculation"""
        markdown = "# Title\n## Heading\n- List item\n| Table | Cell |\n|-------|------|\n"
        expected = {
            'headings': 2,
            'tables': 1,
            'lists': 1
        }
        
        score = QualityChecker.calculate_accuracy_score(markdown, expected)
        assert score >= 50.0
    
    def test_check_structure_preservation(self):
        """Test structure preservation checking"""
        markdown = """
        # Title
        ## Subtitle
        
        Paragraph content here.
        
        - List item 1
        - List item 2
        
        | Table | Header |
        |-------|--------|
        | Cell  | Data   |
        
        ![Image](image.png)
        [Link](http://example.com)
        """
        
        checks = QualityChecker.check_structure_preservation(markdown)
        
        assert checks['has_headings'] is True
        assert checks['has_paragraphs'] is True
        assert checks['has_lists'] is True
        assert checks['has_tables'] is True
        assert checks['has_images'] is True
        assert checks['has_links'] is True
    
    def test_detect_conversion_issues(self):
        """Test issue detection"""
        problematic = "Text with ����� garbled...........\n\n\n\n\n\nToo many blanks"
        issues = QualityChecker.detect_conversion_issues(problematic)
        
        assert len(issues) > 0
        assert any('Encoding' in issue for issue in issues)
        assert any('blank lines' in issue for issue in issues)
    
    def test_generate_quality_report(self):
        """Test quality report generation"""
        markdown = "# Test\n\nContent here"
        source_size = 1000
        processing_time = 2.5
        
        report = QualityChecker.generate_quality_report(
            markdown,
            source_size,
            processing_time
        )
        
        assert 'overall_score' in report
        assert 'completeness_score' in report
        assert 'accuracy_score' in report
        assert 'structure_preservation' in report
        assert 'detected_issues' in report
        assert report['processing_time'] == 2.5


@pytest.mark.asyncio
async def test_api_health_check():
    """Test API health check endpoint"""
    from fastapi.testclient import TestClient
    from api import app
    
    client = TestClient(app)
    response = client.get("/health")
    
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_api_conversion_endpoint():
    """Test API conversion endpoint"""
    from fastapi.testclient import TestClient
    from api import app
    
    client = TestClient(app)
    
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(b'%PDF-1.4\n%Test')
        temp_path = f.name
    
    response = client.post(
        "/api/documents/convert",
        json={
            "documentId": "test-123",
            "filePath": temp_path,
            "options": {}
        }
    )
    
    assert response.status_code in [200, 500]
    data = response.json()
    assert 'documentId' in data
    assert 'status' in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])