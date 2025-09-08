"""
Quality checking utilities for converted documents
"""
import re
import logging
from typing import Dict, List, Tuple
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


class QualityChecker:
    """Check and score conversion quality"""
    
    @staticmethod
    def calculate_accuracy_score(
        markdown: str,
        expected_elements: Dict[str, int]
    ) -> float:
        """
        Calculate accuracy score based on expected elements
        
        Args:
            markdown: Converted markdown content
            expected_elements: Expected counts of elements
            
        Returns:
            Accuracy score (0-100)
        """
        if not markdown:
            return 0.0
        
        scores = []
        
        if 'headings' in expected_elements:
            heading_count = len(re.findall(r'^#{1,6}\s+', markdown, re.MULTILINE))
            expected = expected_elements['headings']
            if expected > 0:
                score = min(100, (heading_count / expected) * 100)
                scores.append(score)
        
        if 'tables' in expected_elements:
            table_count = len(re.findall(r'\|.*\|.*\n\|[-:\s|]+\|', markdown))
            expected = expected_elements['tables']
            if expected > 0:
                score = min(100, (table_count / expected) * 100)
                scores.append(score)
        
        if 'lists' in expected_elements:
            list_count = len(re.findall(r'^[\s]*[-*+]\s+', markdown, re.MULTILINE))
            list_count += len(re.findall(r'^[\s]*\d+\.\s+', markdown, re.MULTILINE))
            expected = expected_elements['lists']
            if expected > 0:
                score = min(100, (list_count / expected) * 100)
                scores.append(score)
        
        if 'min_words' in expected_elements:
            word_count = len(markdown.split())
            expected = expected_elements['min_words']
            if expected > 0:
                score = min(100, (word_count / expected) * 100)
                scores.append(score)
        
        if not scores:
            word_count = len(markdown.split())
            if word_count < 10:
                return 0.0
            elif word_count < 100:
                return 50.0
            else:
                return 75.0
        
        return sum(scores) / len(scores)
    
    @staticmethod
    def check_structure_preservation(markdown: str) -> Dict[str, bool]:
        """
        Check if document structure is preserved
        
        Args:
            markdown: Converted markdown content
            
        Returns:
            Dictionary of structure checks
        """
        checks = {
            'has_headings': False,
            'has_paragraphs': False,
            'has_lists': False,
            'has_tables': False,
            'has_images': False,
            'has_links': False,
            'proper_hierarchy': False
        }
        
        checks['has_headings'] = bool(re.search(r'^#{1,6}\s+', markdown, re.MULTILINE))
        
        paragraphs = re.split(r'\n\n+', markdown)
        checks['has_paragraphs'] = len(paragraphs) > 1
        
        checks['has_lists'] = bool(
            re.search(r'^[\s]*[-*+]\s+', markdown, re.MULTILINE) or
            re.search(r'^[\s]*\d+\.\s+', markdown, re.MULTILINE)
        )
        
        checks['has_tables'] = bool(re.search(r'\|.*\|.*\n\|[-:\s|]+\|', markdown))
        
        checks['has_images'] = bool(re.search(r'!\[.*?\]\(.*?\)', markdown))
        
        checks['has_links'] = bool(re.search(r'\[.*?\]\(.*?\)', markdown))
        
        checks['proper_hierarchy'] = QualityChecker._check_heading_hierarchy(markdown)
        
        return checks
    
    @staticmethod
    def _check_heading_hierarchy(markdown: str) -> bool:
        """
        Check if heading hierarchy is proper (no skipped levels)
        
        Args:
            markdown: Markdown content
            
        Returns:
            True if hierarchy is proper
        """
        headings = re.findall(r'^(#{1,6})\s+', markdown, re.MULTILINE)
        if not headings:
            return True
        
        levels = [len(h) for h in headings]
        
        for i in range(1, len(levels)):
            if levels[i] > levels[i-1] + 1:
                return False
        
        return True
    
    @staticmethod
    def detect_conversion_issues(markdown: str) -> List[str]:
        """
        Detect common conversion issues
        
        Args:
            markdown: Converted markdown content
            
        Returns:
            List of detected issues
        """
        issues = []
        
        if re.search(r'[^\x00-\x7F]+', markdown):
            garbled_count = len(re.findall(r'[�]+', markdown))
            if garbled_count > 10:
                issues.append(f"Encoding issues detected ({garbled_count} garbled characters)")
        
        if re.search(r'\.{10,}', markdown) or re.search(r'_{10,}', markdown):
            issues.append("Excessive repeated characters (possible OCR error)")
        
        broken_tables = re.findall(r'\|(?:[^|\n]*\|){1}[^|\n]*\n(?!\|)', markdown)
        if broken_tables:
            issues.append(f"Potentially broken tables detected ({len(broken_tables)})")
        
        word_count = len(markdown.split())
        if word_count < 10:
            issues.append("Very low word count - possible extraction failure")
        
        lines = markdown.split('\n')
        long_lines = [line for line in lines if len(line) > 500]
        if len(long_lines) > 5:
            issues.append("Many excessively long lines - possible formatting issues")
        
        if markdown.count('\n\n\n') > 10:
            issues.append("Excessive blank lines")
        
        return issues
    
    @staticmethod
    def calculate_completeness_score(
        markdown: str,
        source_size: int
    ) -> Tuple[float, str]:
        """
        Calculate completeness score based on source file size
        
        Args:
            markdown: Converted markdown content
            source_size: Original file size in bytes
            
        Returns:
            Tuple of (score, assessment)
        """
        if source_size == 0:
            return 0.0, "Source file is empty"
        
        markdown_size = len(markdown.encode())
        ratio = markdown_size / source_size
        
        if ratio < 0.01:
            return 10.0, "Very poor extraction"
        elif ratio < 0.05:
            return 30.0, "Poor extraction"
        elif ratio < 0.1:
            return 50.0, "Partial extraction"
        elif ratio < 0.3:
            return 70.0, "Good extraction"
        elif ratio < 1.0:
            return 85.0, "Very good extraction"
        else:
            return 95.0, "Excellent extraction"
    
    @staticmethod
    def generate_quality_report(
        markdown: str,
        source_size: int,
        processing_time: float
    ) -> Dict:
        """
        Generate comprehensive quality report
        
        Args:
            markdown: Converted markdown content
            source_size: Original file size
            processing_time: Time taken for conversion
            
        Returns:
            Quality report dictionary
        """
        structure = QualityChecker.check_structure_preservation(markdown)
        issues = QualityChecker.detect_conversion_issues(markdown)
        completeness_score, completeness_assessment = QualityChecker.calculate_completeness_score(
            markdown, source_size
        )
        
        accuracy_score = QualityChecker.calculate_accuracy_score(
            markdown,
            {'min_words': 100}
        )
        
        overall_score = (completeness_score + accuracy_score) / 2
        
        return {
            'overall_score': overall_score,
            'completeness_score': completeness_score,
            'completeness_assessment': completeness_assessment,
            'accuracy_score': accuracy_score,
            'structure_preservation': structure,
            'detected_issues': issues,
            'processing_time': processing_time,
            'word_count': len(markdown.split()),
            'character_count': len(markdown),
            'line_count': len(markdown.split('\n'))
        }