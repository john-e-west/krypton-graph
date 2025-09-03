import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Box, Typography } from '@mui/material';

export interface TerminalRef {
  writeln: (text: string) => void;
  write: (text: string) => void;
  clear: () => void;
  scrollToBottom: () => void;
}

interface TerminalProps {
  height?: number | string;
  maxLines?: number;
  fontSize?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
}

const Terminal = forwardRef<TerminalRef, TerminalProps>(({
  height = 400,
  maxLines = 1000,
  fontSize = '12px',
  backgroundColor = '#1a1a1a',
  textColor = '#00ff00',
  fontFamily = 'Consolas, "Courier New", monospace'
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<string[]>([]);

  const addLine = (text: string) => {
    linesRef.current.push(text);
    
    // Limit number of lines
    if (linesRef.current.length > maxLines) {
      linesRef.current = linesRef.current.slice(-maxLines);
    }
    
    // Update content
    if (contentRef.current) {
      contentRef.current.innerHTML = linesRef.current
        .map(line => `<div>${escapeHtml(line)}</div>`)
        .join('');
    }
    
    scrollToBottom();
  };

  const addText = (text: string) => {
    if (linesRef.current.length === 0) {
      linesRef.current.push('');
    }
    
    const lastIndex = linesRef.current.length - 1;
    linesRef.current[lastIndex] += text;
    
    // Update content
    if (contentRef.current) {
      contentRef.current.innerHTML = linesRef.current
        .map(line => `<div>${escapeHtml(line)}</div>`)
        .join('');
    }
    
    scrollToBottom();
  };

  const clear = () => {
    linesRef.current = [];
    if (contentRef.current) {
      contentRef.current.innerHTML = '';
    }
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  useImperativeHandle(ref, () => ({
    writeln: (text: string) => {
      addLine(text);
    },
    write: (text: string) => {
      addText(text);
    },
    clear,
    scrollToBottom,
  }));

  // Auto-scroll when new content is added
  useEffect(() => {
    scrollToBottom();
  });

  return (
    <Box
      ref={containerRef}
      sx={{
        height,
        backgroundColor,
        color: textColor,
        fontFamily,
        fontSize,
        padding: 2,
        overflow: 'auto',
        border: '1px solid #333',
        borderRadius: 1,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#2a2a2a',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#555',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          backgroundColor: '#777',
        },
      }}
    >
      <div
        ref={contentRef}
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      />
    </Box>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;