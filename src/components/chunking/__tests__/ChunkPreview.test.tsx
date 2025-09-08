import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChunkPreview } from '../ChunkPreview';
import { DocumentChunk } from '@/lib/chunking/types';

const mockChunks: DocumentChunk[] = [
  {
    id: 'chunk-1',
    documentId: 'doc-1',
    content: '# Introduction\n\nThis is the first chunk of content.',
    index: 0,
    startChar: 0,
    endChar: 50,
    metadata: {
      wordCount: 10,
      charCount: 50,
      headings: [{ level: 1, text: 'Introduction' }],
      hasCodeBlocks: false,
      hasTables: false,
      hasLists: false,
      sentenceCount: 1,
      paragraphCount: 1
    }
  },
  {
    id: 'chunk-2',
    documentId: 'doc-1',
    content: 'This is the second chunk with more content.\n\n## Section 2\n\nMore text here.',
    index: 1,
    startChar: 50,
    endChar: 130,
    overlapStart: 40,
    overlapEnd: 60,
    metadata: {
      wordCount: 15,
      charCount: 80,
      headings: [{ level: 2, text: 'Section 2' }],
      hasCodeBlocks: false,
      hasTables: false,
      hasLists: false,
      sentenceCount: 2,
      paragraphCount: 2,
      previousChunkId: 'chunk-1',
      nextChunkId: 'chunk-3'
    }
  },
  {
    id: 'chunk-3',
    documentId: 'doc-1',
    content: '```javascript\nconst x = 1;\n```\n\nFinal chunk with code.',
    index: 2,
    startChar: 130,
    endChar: 190,
    overlapStart: 120,
    overlapEnd: 140,
    metadata: {
      wordCount: 8,
      charCount: 60,
      headings: [],
      hasCodeBlocks: true,
      hasTables: false,
      hasLists: false,
      sentenceCount: 1,
      paragraphCount: 1,
      previousChunkId: 'chunk-2'
    }
  }
];

describe('ChunkPreview', () => {
  it('should render chunks overview', () => {
    render(<ChunkPreview chunks={mockChunks} />);
    
    expect(screen.getByText('Document Chunking Preview')).toBeInTheDocument();
    expect(screen.getByText('3 chunks created')).toBeInTheDocument();
  });

  it('should display current chunk details', () => {
    render(<ChunkPreview chunks={mockChunks} />);
    
    expect(screen.getByText('Chunk 1')).toBeInTheDocument();
    expect(screen.getByText('50 chars')).toBeInTheDocument();
    expect(screen.getByText('10 words')).toBeInTheDocument();
  });

  it('should navigate between chunks', () => {
    render(<ChunkPreview chunks={mockChunks} />);
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    expect(screen.getByText('Chunk 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('15 words')).toBeInTheDocument();
  });

  it('should show overlap information', () => {
    render(<ChunkPreview chunks={mockChunks} />);
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    expect(screen.getByText(/Overlap: 20 chars/)).toBeInTheDocument();
  });

  it('should display metadata badges', () => {
    render(<ChunkPreview chunks={mockChunks} />);
    
    // Navigate to chunk with code
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    
    expect(screen.getByText('Code')).toBeInTheDocument();
  });

  it('should handle chunk selection', () => {
    render(<ChunkPreview chunks={mockChunks} />);
    
    const selectButton = screen.getByRole('button', { name: /select/i });
    fireEvent.click(selectButton);
    
    expect(screen.getByText('Deselect')).toBeInTheDocument();
  });

  it('should enable merge when two chunks selected', async () => {
    const onMerge = vi.fn();
    render(<ChunkPreview chunks={mockChunks} onMerge={onMerge} />);
    
    // Select first chunk
    const selectButton = screen.getByRole('button', { name: /select/i });
    fireEvent.click(selectButton);
    
    // Navigate and select second chunk
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    
    // Merge button should appear
    const mergeButton = screen.getByRole('button', { name: /merge selected/i });
    expect(mergeButton).toBeInTheDocument();
    
    fireEvent.click(mergeButton);
    expect(onMerge).toHaveBeenCalledWith('chunk-1', 'chunk-2');
  });

  it('should handle split action', () => {
    const onSplit = vi.fn();
    render(<ChunkPreview chunks={mockChunks} onSplit={onSplit} />);
    
    const splitButton = screen.getByRole('button', { name: /split/i });
    fireEvent.click(splitButton);
    
    expect(onSplit).toHaveBeenCalledWith('chunk-1', 25);
  });

  it('should update overlap percentage', () => {
    const onOverlapChange = vi.fn();
    render(
      <ChunkPreview 
        chunks={mockChunks} 
        overlapPercentage={15}
        onOverlapChange={onOverlapChange}
      />
    );
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '18' } });
    
    waitFor(() => {
      expect(onOverlapChange).toHaveBeenCalledWith(18);
    });
  });

  it('should call onApprove when approve button clicked', () => {
    const onApprove = vi.fn();
    render(<ChunkPreview chunks={mockChunks} onApprove={onApprove} />);
    
    const approveButton = screen.getByRole('button', { name: /approve chunks/i });
    fireEvent.click(approveButton);
    
    expect(onApprove).toHaveBeenCalled();
  });

  it('should switch between preview and edit tabs', () => {
    const fullText = mockChunks.map(c => c.content).join('');
    render(<ChunkPreview chunks={mockChunks} fullText={fullText} />);
    
    const editTab = screen.getByRole('tab', { name: /edit boundaries/i });
    fireEvent.click(editTab);
    
    // Should show boundary editor
    expect(screen.getByText(/3 chunks/)).toBeInTheDocument();
  });

  it('should show message when fullText not provided for edit mode', () => {
    render(<ChunkPreview chunks={mockChunks} />);
    
    const editTab = screen.getByRole('tab', { name: /edit boundaries/i });
    fireEvent.click(editTab);
    
    expect(screen.getByText('Full text is required for boundary editing')).toBeInTheDocument();
  });

  it('should handle empty chunks array', () => {
    render(<ChunkPreview chunks={[]} />);
    
    expect(screen.getByText('No chunks available')).toBeInTheDocument();
  });

  it('should format content with syntax highlighting', () => {
    render(<ChunkPreview chunks={mockChunks} />);
    
    // Check for heading formatting
    const headingElement = screen.getByText(/Introduction/);
    expect(headingElement.className).toContain('font-bold');
  });

  it('should display all chunks in overview list', () => {
    render(<ChunkPreview chunks={mockChunks} />);
    
    // All three chunks should be visible in the list
    expect(screen.getByText('Chunk 1')).toBeInTheDocument();
    expect(screen.getByText('Chunk 2')).toBeInTheDocument();
    expect(screen.getByText('Chunk 3')).toBeInTheDocument();
  });

  it('should highlight current chunk in overview', () => {
    const { container } = render(<ChunkPreview chunks={mockChunks} />);
    
    const chunkItems = container.querySelectorAll('.bg-accent');
    expect(chunkItems.length).toBeGreaterThan(0);
  });

  it('should navigate to chunk when clicked in overview', () => {
    render(<ChunkPreview chunks={mockChunks} />);
    
    const chunk3Item = screen.getByText('Chunk 3').closest('div');
    fireEvent.click(chunk3Item!);
    
    expect(screen.getByText('Chunk 3 of 3')).toBeInTheDocument();
  });
});