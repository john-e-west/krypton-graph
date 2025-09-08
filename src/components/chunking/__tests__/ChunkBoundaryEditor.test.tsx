import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChunkBoundaryEditor } from '../ChunkBoundaryEditor';
import { DocumentChunk } from '@/lib/chunking/types';

const mockChunks: DocumentChunk[] = [
  {
    id: 'chunk-1',
    documentId: 'doc-1',
    content: 'First chunk content that is relatively short.',
    index: 0,
    startChar: 0,
    endChar: 45,
    metadata: {
      wordCount: 7,
      charCount: 45,
      headings: [],
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
    content: 'Second chunk with more content that spans multiple sentences. This chunk is longer.',
    index: 1,
    startChar: 45,
    endChar: 130,
    metadata: {
      wordCount: 13,
      charCount: 85,
      headings: [],
      hasCodeBlocks: false,
      hasTables: false,
      hasLists: false,
      sentenceCount: 2,
      paragraphCount: 1
    }
  },
  {
    id: 'chunk-3',
    documentId: 'doc-1',
    content: 'Third and final chunk.',
    index: 2,
    startChar: 130,
    endChar: 152,
    metadata: {
      wordCount: 4,
      charCount: 22,
      headings: [],
      hasCodeBlocks: false,
      hasTables: false,
      hasLists: false,
      sentenceCount: 1,
      paragraphCount: 1
    }
  }
];

const fullText = mockChunks.map(c => c.content).join('');

describe('ChunkBoundaryEditor', () => {
  it('should render chunk boundaries', () => {
    render(
      <ChunkBoundaryEditor
        chunks={mockChunks}
        fullText={fullText}
        onBoundaryChange={vi.fn()}
        onSplit={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    
    expect(screen.getByText('3 chunks')).toBeInTheDocument();
    expect(screen.getByText('All chunks valid')).toBeInTheDocument();
  });

  it('should display chunk statistics', () => {
    render(
      <ChunkBoundaryEditor
        chunks={mockChunks}
        fullText={fullText}
        onBoundaryChange={vi.fn()}
        onSplit={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    
    expect(screen.getByText('Total Length')).toBeInTheDocument();
    expect(screen.getByText('152')).toBeInTheDocument(); // Total characters
    expect(screen.getByText('Average Size')).toBeInTheDocument();
  });

  it('should show individual chunk information', () => {
    render(
      <ChunkBoundaryEditor
        chunks={mockChunks}
        fullText={fullText}
        onBoundaryChange={vi.fn()}
        onSplit={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    
    expect(screen.getByText('Chunk 1')).toBeInTheDocument();
    expect(screen.getByText('Chunk 2')).toBeInTheDocument();
    expect(screen.getByText('Chunk 3')).toBeInTheDocument();
  });

  it('should validate chunk sizes', () => {
    const largeChunk: DocumentChunk = {
      ...mockChunks[0],
      content: 'x'.repeat(10001), // Exceeds max size
      metadata: {
        ...mockChunks[0].metadata,
        charCount: 10001
      }
    };
    
    render(
      <ChunkBoundaryEditor
        chunks={[largeChunk]}
        fullText={'x'.repeat(10001)}
        maxChunkSize={10000}
        onBoundaryChange={vi.fn()}
        onSplit={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    
    expect(screen.getByText('Too large')).toBeInTheDocument();
  });

  it('should handle chunk selection', () => {
    render(
      <ChunkBoundaryEditor
        chunks={mockChunks}
        fullText={fullText}
        onBoundaryChange={vi.fn()}
        onSplit={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    
    const firstChunk = screen.getByText('Chunk 1').closest('div')?.parentElement;
    fireEvent.click(firstChunk!);
    
    // Check if selection styling is applied
    expect(firstChunk?.className).toContain('bg-primary/10');
  });

  it('should enable merge when multiple chunks selected', () => {
    const onMerge = vi.fn();
    render(
      <ChunkBoundaryEditor
        chunks={mockChunks}
        fullText={fullText}
        onBoundaryChange={vi.fn()}
        onSplit={vi.fn()}
        onMerge={onMerge}
      />
    );
    
    // Select first two chunks
    const chunk1 = screen.getByText('Chunk 1').closest('div')?.parentElement;
    const chunk2 = screen.getByText('Chunk 2').closest('div')?.parentElement;
    
    fireEvent.click(chunk1!);
    fireEvent.click(chunk2!);
    
    const mergeButton = screen.getByRole('button', { name: /merge selected \(2\)/i });
    expect(mergeButton).not.toBeDisabled();
    
    fireEvent.click(mergeButton);
    expect(onMerge).toHaveBeenCalledWith(0, 1);
  });

  it('should handle split action', () => {
    const onSplit = vi.fn();
    render(
      <ChunkBoundaryEditor
        chunks={mockChunks}
        fullText={fullText}
        onBoundaryChange={vi.fn()}
        onSplit={onSplit}
        onMerge={vi.fn()}
      />
    );
    
    const splitButton = screen.getByRole('button', { name: /add split/i });
    fireEvent.click(splitButton);
    
    // Should show split position indicator
    const splitHereButton = screen.getByRole('button', { name: /split here/i });
    fireEvent.click(splitHereButton);
    
    expect(onSplit).toHaveBeenCalledWith(76); // Half of total length
  });

  it('should display chunk size warnings', () => {
    const tinyChunk: DocumentChunk = {
      ...mockChunks[0],
      content: 'x',
      metadata: {
        ...mockChunks[0].metadata,
        charCount: 1
      }
    };
    
    render(
      <ChunkBoundaryEditor
        chunks={[tinyChunk]}
        fullText={'x'}
        maxChunkSize={10000}
        onBoundaryChange={vi.fn()}
        onSplit={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    
    expect(screen.getByText('Too small')).toBeInTheDocument();
  });

  it('should show boundary handles between chunks', () => {
    const { container } = render(
      <ChunkBoundaryEditor
        chunks={mockChunks}
        fullText={fullText}
        onBoundaryChange={vi.fn()}
        onSplit={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    
    // Should have 2 boundary handles for 3 chunks
    const handles = container.querySelectorAll('.cursor-ns-resize');
    expect(handles.length).toBe(2);
  });

  it('should show smallest and largest chunk sizes', () => {
    render(
      <ChunkBoundaryEditor
        chunks={mockChunks}
        fullText={fullText}
        onBoundaryChange={vi.fn()}
        onSplit={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    
    expect(screen.getByText('Smallest Chunk')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument(); // chunk-3 size
    
    expect(screen.getByText('Largest Chunk')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument(); // chunk-2 size
  });

  it('should handle boundary drag interactions', () => {
    const onBoundaryChange = vi.fn();
    const { container } = render(
      <ChunkBoundaryEditor
        chunks={mockChunks}
        fullText={fullText}
        onBoundaryChange={onBoundaryChange}
        onSplit={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    
    const boundaryHandle = container.querySelector('.cursor-ns-resize');
    
    // Simulate drag
    fireEvent.mouseDown(boundaryHandle!, { clientY: 100 });
    fireEvent.mouseMove(document, { clientY: 150 });
    fireEvent.mouseUp(document);
    
    // Should have called boundary change
    expect(onBoundaryChange).toHaveBeenCalled();
  });

  it('should display validation status', () => {
    render(
      <ChunkBoundaryEditor
        chunks={mockChunks}
        fullText={fullText}
        onBoundaryChange={vi.fn()}
        onSplit={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    
    // All chunks are valid in our test data
    const validBadge = screen.getByText('All chunks valid');
    expect(validBadge).toBeInTheDocument();
    
    // Check for success icon
    const checkIcon = validBadge.parentElement?.querySelector('svg');
    expect(checkIcon).toBeInTheDocument();
  });

  it('should calculate average chunk size correctly', () => {
    render(
      <ChunkBoundaryEditor
        chunks={mockChunks}
        fullText={fullText}
        onBoundaryChange={vi.fn()}
        onSplit={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    
    const avgSize = Math.round(152 / 3); // Total length / number of chunks
    expect(screen.getByText(avgSize.toString())).toBeInTheDocument();
  });

  it('should disable merge button when less than 2 chunks selected', () => {
    render(
      <ChunkBoundaryEditor
        chunks={mockChunks}
        fullText={fullText}
        onBoundaryChange={vi.fn()}
        onSplit={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    
    const mergeButton = screen.getByRole('button', { name: /merge selected \(0\)/i });
    expect(mergeButton).toBeDisabled();
  });
});