import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GripVertical, 
  CheckCircle2, 
  AlertCircle,
  Split,
  Merge
} from 'lucide-react';
import { DocumentChunk } from '@/lib/chunking/types';
import { cn } from '@/lib/utils';

interface ChunkBoundaryEditorProps {
  chunks: DocumentChunk[];
  fullText: string;
  maxChunkSize?: number;
  onBoundaryChange: (boundaries: number[]) => void;
  onSplit: (position: number) => void;
  onMerge: (startIndex: number, endIndex: number) => void;
}

interface BoundaryMarker {
  position: number;
  chunkIndex: number;
  isDragging: boolean;
  isValid: boolean;
}

export function ChunkBoundaryEditor({
  chunks,
  fullText,
  maxChunkSize = 10000,
  onBoundaryChange,
  onSplit,
  onMerge
}: ChunkBoundaryEditorProps) {
  const [boundaries, setBoundaries] = useState<BoundaryMarker[]>([]);
  const [selectedChunks, setSelectedChunks] = useState<Set<number>>(new Set());
  const [hoveredBoundary, setHoveredBoundary] = useState<number | null>(null);
  const [draggedBoundary, setDraggedBoundary] = useState<number | null>(null);
  const [splitPosition, setSplitPosition] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Initialize boundaries from chunks
  useEffect(() => {
    const markers: BoundaryMarker[] = [];
    let currentPos = 0;
    
    chunks.forEach((chunk, index) => {
      if (index > 0) {
        markers.push({
          position: currentPos,
          chunkIndex: index - 1,
          isDragging: false,
          isValid: true
        });
      }
      currentPos += chunk.content.length;
    });
    
    setBoundaries(markers);
  }, [chunks]);

  // Calculate chunk sizes for validation
  const calculateChunkSizes = (boundaryPositions: number[]) => {
    const sizes: number[] = [];
    let lastPos = 0;
    
    for (const pos of boundaryPositions) {
      sizes.push(pos - lastPos);
      lastPos = pos;
    }
    sizes.push(fullText.length - lastPos);
    
    return sizes;
  };

  // Validate boundary positions
  const validateBoundaries = (boundaryPositions: number[]) => {
    const sizes = calculateChunkSizes(boundaryPositions);
    return sizes.map(size => size > 0 && size <= maxChunkSize);
  };

  // Handle boundary drag start
  const handleDragStart = (boundaryIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggedBoundary(boundaryIndex);
    
    const startY = e.clientY;
    const startPos = boundaries[boundaryIndex].position;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!textRef.current) return;
      
      const deltaY = e.clientY - startY;
      const textHeight = textRef.current.scrollHeight;
      const textLength = fullText.length;
      const posChange = Math.round((deltaY / textHeight) * textLength);
      
      const newPos = Math.max(
        100, // Minimum chunk size
        Math.min(fullText.length - 100, startPos + posChange)
      );
      
      // Update boundary position
      const newBoundaries = [...boundaries];
      newBoundaries[boundaryIndex] = {
        ...newBoundaries[boundaryIndex],
        position: newPos,
        isDragging: true
      };
      
      // Validate new positions
      const positions = newBoundaries.map(b => b.position).sort((a, b) => a - b);
      const validations = validateBoundaries(positions);
      
      newBoundaries.forEach((boundary, idx) => {
        boundary.isValid = validations[idx] && validations[idx + 1];
      });
      
      setBoundaries(newBoundaries);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      setDraggedBoundary(null);
      
      // Update boundaries
      const newBoundaries = boundaries.map(b => ({ ...b, isDragging: false }));
      setBoundaries(newBoundaries);
      
      // Notify parent of boundary changes
      const positions = newBoundaries.map(b => b.position).sort((a, b) => a - b);
      onBoundaryChange(positions);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle split at position
  const handleSplitAt = (position: number) => {
    onSplit(position);
    setSplitPosition(null);
  };

  // Handle merge selected chunks
  const handleMergeSelected = () => {
    const selected = Array.from(selectedChunks).sort((a, b) => a - b);
    if (selected.length >= 2) {
      onMerge(selected[0], selected[selected.length - 1]);
      setSelectedChunks(new Set());
    }
  };

  // Toggle chunk selection
  const toggleChunkSelection = (index: number) => {
    const newSelection = new Set(selectedChunks);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedChunks(newSelection);
  };

  // Get text segments based on boundaries
  const getTextSegments = () => {
    const segments: { text: string; index: number; size: number; isValid: boolean }[] = [];
    let lastPos = 0;
    
    const sortedBoundaries = [...boundaries].sort((a, b) => a.position - b.position);
    
    sortedBoundaries.forEach((boundary, idx) => {
      const text = fullText.substring(lastPos, boundary.position);
      segments.push({
        text,
        index: idx,
        size: text.length,
        isValid: text.length <= maxChunkSize && text.length > 0
      });
      lastPos = boundary.position;
    });
    
    // Add last segment
    const lastText = fullText.substring(lastPos);
    segments.push({
      text: lastText,
      index: segments.length,
      size: lastText.length,
      isValid: lastText.length <= maxChunkSize && lastText.length > 0
    });
    
    return segments;
  };

  const textSegments = getTextSegments();

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              {chunks.length} chunks
            </Badge>
            <Badge variant={textSegments.every(s => s.isValid) ? 'success' : 'destructive'}>
              {textSegments.every(s => s.isValid) ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  All chunks valid
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Invalid chunk sizes
                </>
              )}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selectedChunks.size < 2}
              onClick={handleMergeSelected}
            >
              <Merge className="h-4 w-4 mr-1" />
              Merge Selected ({selectedChunks.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSplitPosition(fullText.length / 2)}
            >
              <Split className="h-4 w-4 mr-1" />
              Add Split
            </Button>
          </div>
        </div>
      </Card>

      {/* Visual Editor */}
      <Card className="p-4">
        <ScrollArea className="h-[600px]">
          <div ref={editorRef} className="relative">
            <div ref={textRef} className="space-y-0">
              {textSegments.map((segment, idx) => (
                <div key={idx} className="relative group">
                  {/* Chunk content */}
                  <div
                    className={cn(
                      "p-4 border-l-4 transition-all cursor-pointer",
                      selectedChunks.has(idx) && "bg-primary/10 border-primary",
                      !selectedChunks.has(idx) && "border-transparent hover:bg-accent/50",
                      !segment.isValid && "bg-destructive/10"
                    )}
                    onClick={() => toggleChunkSelection(idx)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        Chunk {idx + 1}
                      </Badge>
                      <div className="flex gap-2">
                        <Badge 
                          variant={segment.isValid ? "outline" : "destructive"}
                          className="text-xs"
                        >
                          {segment.size} / {maxChunkSize} chars
                        </Badge>
                        {!segment.isValid && (
                          <Badge variant="destructive" className="text-xs">
                            {segment.size > maxChunkSize ? 'Too large' : 'Too small'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground line-clamp-3">
                      {segment.text}
                    </pre>
                  </div>

                  {/* Boundary handle */}
                  {idx < textSegments.length - 1 && (
                    <div
                      className={cn(
                        "absolute left-0 right-0 h-8 -bottom-4 z-10 flex items-center justify-center",
                        "group cursor-ns-resize"
                      )}
                      onMouseDown={(e) => handleDragStart(idx, e)}
                      onMouseEnter={() => setHoveredBoundary(idx)}
                      onMouseLeave={() => setHoveredBoundary(null)}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-md transition-all",
                          "bg-background border-2",
                          hoveredBoundary === idx || draggedBoundary === idx
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50",
                          !boundaries[idx]?.isValid && "border-destructive"
                        )}
                      >
                        <GripVertical className="h-4 w-4" />
                        <span className="text-xs font-medium">
                          {boundaries[idx]?.position}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Split position indicator */}
                  {splitPosition !== null && 
                   splitPosition > (idx === 0 ? 0 : boundaries[idx - 1]?.position || 0) &&
                   splitPosition < (boundaries[idx]?.position || fullText.length) && (
                    <div
                      className="absolute left-0 right-0 h-8 z-20 flex items-center justify-center"
                      style={{
                        top: `${((splitPosition - (idx === 0 ? 0 : boundaries[idx - 1]?.position || 0)) / segment.size) * 100}%`
                      }}
                    >
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleSplitAt(splitPosition)}
                      >
                        <Split className="h-3 w-3 mr-1" />
                        Split here
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </Card>

      {/* Statistics */}
      <Card className="p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm font-medium">Total Length</p>
            <p className="text-2xl font-bold">{fullText.length}</p>
            <p className="text-xs text-muted-foreground">characters</p>
          </div>
          <div>
            <p className="text-sm font-medium">Average Size</p>
            <p className="text-2xl font-bold">
              {Math.round(fullText.length / chunks.length)}
            </p>
            <p className="text-xs text-muted-foreground">chars/chunk</p>
          </div>
          <div>
            <p className="text-sm font-medium">Smallest Chunk</p>
            <p className="text-2xl font-bold">
              {Math.min(...textSegments.map(s => s.size))}
            </p>
            <p className="text-xs text-muted-foreground">characters</p>
          </div>
          <div>
            <p className="text-sm font-medium">Largest Chunk</p>
            <p className="text-2xl font-bold">
              {Math.max(...textSegments.map(s => s.size))}
            </p>
            <p className="text-xs text-muted-foreground">characters</p>
          </div>
        </div>
      </Card>
    </div>
  );
}