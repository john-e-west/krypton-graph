"""
Markdown formatting utilities for converted documents
"""
import re
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class MarkdownFormatter:
    """Utilities for formatting and cleaning markdown content"""
    
    @staticmethod
    def clean_markdown(content: str) -> str:
        """
        Clean and format markdown content
        
        Args:
            content: Raw markdown content
            
        Returns:
            Cleaned markdown
        """
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        content = re.sub(r' {2,}', ' ', content)
        
        content = re.sub(r'^[ \t]+', '', content, flags=re.MULTILINE)
        content = re.sub(r'[ \t]+$', '', content, flags=re.MULTILINE)
        
        lines = content.split('\n')
        cleaned_lines = []
        prev_was_heading = False
        
        for line in lines:
            is_heading = line.startswith('#')
            
            if is_heading and prev_was_heading:
                cleaned_lines.append('')
            
            cleaned_lines.append(line)
            prev_was_heading = is_heading
        
        return '\n'.join(cleaned_lines)
    
    @staticmethod
    def format_table(table_data: List[List[str]]) -> str:
        """
        Format data as markdown table
        
        Args:
            table_data: List of rows, each row is a list of cells
            
        Returns:
            Formatted markdown table
        """
        if not table_data or not table_data[0]:
            return ""
        
        col_widths = []
        for col_idx in range(len(table_data[0])):
            max_width = max(
                len(str(row[col_idx])) if col_idx < len(row) else 0
                for row in table_data
            )
            col_widths.append(max(max_width, 3))
        
        markdown_lines = []
        
        header_row = table_data[0]
        header_line = '| ' + ' | '.join(
            str(cell).ljust(col_widths[i]) 
            for i, cell in enumerate(header_row)
        ) + ' |'
        markdown_lines.append(header_line)
        
        separator_line = '|' + '|'.join(
            '-' * (width + 2) for width in col_widths
        ) + '|'
        markdown_lines.append(separator_line)
        
        for row in table_data[1:]:
            data_line = '| ' + ' | '.join(
                str(row[i] if i < len(row) else '').ljust(col_widths[i])
                for i in range(len(col_widths))
            ) + ' |'
            markdown_lines.append(data_line)
        
        return '\n'.join(markdown_lines)
    
    @staticmethod
    def fix_heading_hierarchy(content: str) -> str:
        """
        Fix heading hierarchy to ensure proper nesting
        
        Args:
            content: Markdown content
            
        Returns:
            Content with fixed heading hierarchy
        """
        lines = content.split('\n')
        fixed_lines = []
        heading_stack = []
        
        for line in lines:
            if line.startswith('#'):
                match = re.match(r'^(#+)\s+(.+)$', line)
                if match:
                    hashes, title = match.groups()
                    level = len(hashes)
                    
                    if heading_stack:
                        last_level = heading_stack[-1]
                        if level > last_level + 1:
                            level = last_level + 1
                            line = '#' * level + ' ' + title
                    
                    while heading_stack and heading_stack[-1] >= level:
                        heading_stack.pop()
                    
                    heading_stack.append(level)
            
            fixed_lines.append(line)
        
        return '\n'.join(fixed_lines)
    
    @staticmethod
    def add_table_of_contents(content: str) -> str:
        """
        Add table of contents to markdown
        
        Args:
            content: Markdown content
            
        Returns:
            Content with TOC added
        """
        lines = content.split('\n')
        toc_lines = ['## Table of Contents\n']
        headings = []
        
        for line in lines:
            if line.startswith('#'):
                match = re.match(r'^(#+)\s+(.+)$', line)
                if match:
                    hashes, title = match.groups()
                    level = len(hashes)
                    
                    if level <= 3:
                        anchor = re.sub(r'[^\w\s-]', '', title.lower())
                        anchor = re.sub(r'[-\s]+', '-', anchor)
                        
                        indent = '  ' * (level - 1)
                        toc_lines.append(f'{indent}- [{title}](#{anchor})')
                        headings.append((level, title))
        
        if len(headings) > 2:
            toc = '\n'.join(toc_lines) + '\n\n'
            return toc + content
        
        return content
    
    @staticmethod
    def escape_special_chars(content: str) -> str:
        """
        Escape special markdown characters where needed
        
        Args:
            content: Raw content
            
        Returns:
            Content with escaped characters
        """
        content = re.sub(r'(?<!\\)([*_`\[\]{}()#+\-.!])', r'\\\1', content)
        
        content = re.sub(r'\\(#{1,6}\s)', r'\1', content)
        
        content = re.sub(r'\\\|(?=[^|]*\|)', '|', content)
        
        return content
    
    @staticmethod
    def format_lists(content: str) -> str:
        """
        Format and normalize list items
        
        Args:
            content: Markdown content
            
        Returns:
            Content with formatted lists
        """
        lines = content.split('\n')
        formatted_lines = []
        list_stack = []
        
        for line in lines:
            stripped = line.lstrip()
            indent_level = len(line) - len(stripped)
            
            if re.match(r'^[-*+]\s+', stripped):
                indent_level = (indent_level // 2) * 2
                line = ' ' * indent_level + '- ' + stripped[2:]
            
            elif re.match(r'^\d+\.\s+', stripped):
                indent_level = (indent_level // 2) * 2
                match = re.match(r'^(\d+)\.\s+(.+)$', stripped)
                if match:
                    num, text = match.groups()
                    line = ' ' * indent_level + f'{num}. {text}'
            
            formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)