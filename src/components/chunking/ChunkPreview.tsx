import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  Split, 
  Merge, 
  FileText,
  Hash,
  Code,
  Table,
  List,
  Edit3,
  Eye
} from 'lucide-react';
import { DocumentChunk } from '@/lib/chunking/types';
import { ChunkBoundaryEditor } from './ChunkBoundaryEditor';

interface ChunkPreviewProps {
  chunks: DocumentChunk[];
  fullText?: string;
  onAdjust?: (chunkId: string, newBoundary: number) => void;  
  onMerge?: (chunk1Id: string, chunk2Id: string) => void;
  onSplit?: (chunkId: string, position: number) => void;
  onApprove?: () => void;
  overlapPercentage?: number;
  onOverlapChange?: (percentage: number) => void;
  onBoundaryChange?: (boundaries: number[]) => void;
}

export function ChunkPreview({ 
  chunks, 
  fullText = '',
  onAdjust: _onAdjust, 
  onMerge, 
  onSplit,
  onApprove,
  overlapPercentage = 15,
  onOverlapChange,
  onBoundaryChange
}: ChunkPreviewProps) {
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set());
  
  const currentChunk = chunks[currentChunkIndex];
  
  if (!currentChunk) {
    return <div>No chunks available</div>;
  }
  
  const handlePrevious = () => {
    setCurrentChunkIndex(Math.max(0, currentChunkIndex - 1));
  };
  
  const handleNext = () => {
    setCurrentChunkIndex(Math.min(chunks.length - 1, currentChunkIndex + 1));
  };
  
  const toggleChunkSelection = (chunkId: string) => {
    const newSelection = new Set(selectedChunks);
    if (newSelection.has(chunkId)) {
      newSelection.delete(chunkId);
    } else {
      newSelection.add(chunkId);
    }
    setSelectedChunks(newSelection);
  };
  
  const handleMergeSelected = () => {
    const selected = Array.from(selectedChunks);
    if (selected.length === 2 && onMerge) {
      onMerge(selected[0], selected[1]);
      setSelectedChunks(new Set());
    }
  };
  
  const formatContent = (content: string) => {
    // Basic markdown highlighting for preview
    return content.split('\n').map((line, index) => {
      const isHeading = line.match(/^#{1,6}\s/);
      const isCodeBlock = line.startsWith('```');
      const isList = line.match(/^[\s]*[-*+\d.]\s/);
      
      let className = 'block';
      if (isHeading) className += ' font-bold text-lg';
      if (isCodeBlock) className += ' font-mono bg-gray-100 px-2';
      if (isList) className += ' ml-4';
      
      return (
        <span key={index} className={className}>
          {line}
        </span>
      );
    });
  };
  
  // Handlers for boundary editor
  const handleBoundaryChange = (boundaries: number[]) => {
    onBoundaryChange?.(boundaries);
  };

  const handleSplitAt = (position: number) => {
    // Convert position to chunk ID and relative position
    let accumulatedLength = 0;
    for (const chunk of chunks) {
      if (accumulatedLength + chunk.content.length > position) {
        onSplit?.(chunk.id, position - accumulatedLength);
        break;
      }
      accumulatedLength += chunk.content.length;
    }
  };

  const handleMergeChunks = (startIndex: number, endIndex: number) => {
    if (startIndex < chunks.length && endIndex < chunks.length) {
      onMerge?.(chunks[startIndex].id, chunks[endIndex].id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Document Chunking Preview</CardTitle>
          <CardDescription>
            {chunks.length} chunks created • Average size: {Math.round(
              chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length
            )} characters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overlap Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Overlap Percentage</label>
              <span className="text-sm text-muted-foreground">{overlapPercentage}%</span>
            </div>
            <Slider
              value={[overlapPercentage]}
              onValueChange={(value) => onOverlapChange?.(value[0])}
              min={10}
              max={20}
              step={1}
              className="w-full"
            />
          </div>
          
            </CardContent>
      </Card>

      {/* Tabbed Interface */}
      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Edit Boundaries
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          {/* Chunk Navigation */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentChunkIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm font-medium">
                  Chunk {currentChunkIndex + 1} of {chunks.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentChunkIndex === chunks.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Chunk Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Chunk {currentChunkIndex + 1}
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">
                {currentChunk.content.length} chars
              </Badge>
              <Badge variant="outline">
                {currentChunk.metadata.wordCount} words
              </Badge>
              {currentChunk.overlapStart && (
                <Badge variant="secondary">
                  Overlap: {currentChunk.overlapEnd! - currentChunk.overlapStart} chars
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Metadata Icons */}
          <div className="flex gap-2 mb-4">
            {currentChunk.metadata.headings.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <Hash className="h-3 w-3" />
                {currentChunk.metadata.headings.length} headings
              </Badge>
            )}
            {currentChunk.metadata.hasCodeBlocks && (
              <Badge variant="outline" className="gap-1">
                <Code className="h-3 w-3" />
                Code
              </Badge>
            )}
            {currentChunk.metadata.hasTables && (
              <Badge variant="outline" className="gap-1">
                <Table className="h-3 w-3" />
                Tables
              </Badge>
            )}
            {currentChunk.metadata.hasLists && (
              <Badge variant="outline" className="gap-1">
                <List className="h-3 w-3" />
                Lists
              </Badge>
            )}
          </div>
          
          {/* Content Preview */}
          <ScrollArea className="h-[400px] w-full border rounded-md p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {formatContent(currentChunk.content)}
            </pre>
          </ScrollArea>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleChunkSelection(currentChunk.id)}
            >
              {selectedChunks.has(currentChunk.id) ? 'Deselect' : 'Select'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSplit?.(currentChunk.id, currentChunk.content.length / 2)}
            >
              <Split className="h-4 w-4 mr-1" />
              Split
            </Button>
            {selectedChunks.size === 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMergeSelected}
              >
                <Merge className="h-4 w-4 mr-1" />
                Merge Selected
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
          {/* Chunk Overview List */}
          <Card>
            <CardHeader>
              <CardTitle>All Chunks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {chunks.map((chunk, index) => (
                  <div
                    key={chunk.id}
                    className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors ${
                      index === currentChunkIndex ? 'bg-accent' : 'hover:bg-accent/50'
                    } ${selectedChunks.has(chunk.id) ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setCurrentChunkIndex(index)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Chunk {index + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {chunk.content.length} chars
                      </Badge>
                      {chunk.metadata.headings[0] && (
                        <span className="text-sm text-muted-foreground">
                          {chunk.metadata.headings[0].text.substring(0, 30)}...
                        </span>
                      )}
                    </div>
                    {chunk.overlapStart && (
                      <Badge variant="secondary" className="text-xs">
                        ↔ {chunk.overlapEnd! - chunk.overlapStart}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edit Tab */}
        <TabsContent value="edit" className="space-y-4">
          {fullText ? (
            <ChunkBoundaryEditor
              chunks={chunks}
              fullText={fullText}
              maxChunkSize={10000}
              onBoundaryChange={handleBoundaryChange}
              onSplit={handleSplitAt}
              onMerge={handleMergeChunks}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Full text is required for boundary editing
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Approve Button */}
      <div className="flex justify-end">
        <Button onClick={onApprove} size="lg">
          Approve Chunks
        </Button>
      </div>
    </div>
  );
}