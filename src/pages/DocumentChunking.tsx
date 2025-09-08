import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChunkPreview } from '@/components/chunking/ChunkPreview';
import { ChunkingService } from '@/lib/chunking/chunkingService';
import { DocumentChunk, ChunkingConfig } from '@/lib/chunking/types';
import { 
  FileText, 
  Upload, 
  Settings, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function DocumentChunking() {
  const [documentText, setDocumentText] = useState('');
  const [documentId, setDocumentId] = useState('doc-' + Date.now());
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Chunking configuration
  const [config, setConfig] = useState<ChunkingConfig>({
    maxChunkSize: 10000,
    minChunkSize: 500,
    overlapPercentage: 15,
    useSmartBoundaries: false,
    preserveStructure: true,
    metadataOverhead: 500
  });

  const chunkingService = new ChunkingService(config);

  const handleChunkDocument = async () => {
    if (!documentText.trim()) {
      setError('Please enter some text to chunk');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const newChunks = await chunkingService.chunkDocument(documentText, documentId);
      setChunks(newChunks);
      setSuccess(`Successfully created ${newChunks.length} chunks`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to chunk document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setDocumentText(text);
        setDocumentId(file.name.replace(/\.[^/.]+$/, '') + '-' + Date.now());
      };
      reader.readAsText(file);
    }
  };

  const handleOverlapChange = (percentage: number) => {
    setConfig(prev => ({ ...prev, overlapPercentage: percentage }));
  };

  const handleBoundaryChange = async (boundaries: number[]) => {
    // Re-chunk with new boundaries
    setIsProcessing(true);
    try {
      const newChunks = await chunkingService.rechunkWithBoundaries(
        documentText,
        documentId,
        boundaries
      );
      setChunks(newChunks);
      setSuccess('Boundaries updated successfully');
    } catch (err) {
      setError('Failed to update boundaries');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    // Here you would save chunks to your backend/database
    setSuccess(`Approved ${chunks.length} chunks for document ${documentId}`);
    
    // Simulate saving to Airtable or other storage
    console.log('Saving chunks to storage:', chunks);
  };

  const handleSplit = async (chunkId: string, position: number) => {
    const chunkIndex = chunks.findIndex(c => c.id === chunkId);
    if (chunkIndex === -1) return;

    const chunk = chunks[chunkIndex];
    const newChunks = [...chunks];
    
    // Split the chunk at position
    const chunk1Content = chunk.content.substring(0, position);
    const chunk2Content = chunk.content.substring(position);
    
    // Create two new chunks
    const chunk1: DocumentChunk = {
      ...chunk,
      id: chunk.id + '-1',
      content: chunk1Content,
      endChar: chunk.startChar + position,
      metadata: {
        ...chunk.metadata,
        charCount: chunk1Content.length,
        wordCount: chunk1Content.split(/\s+/).length
      }
    };
    
    const chunk2: DocumentChunk = {
      ...chunk,
      id: chunk.id + '-2',
      content: chunk2Content,
      index: chunk.index + 1,
      startChar: chunk.startChar + position,
      metadata: {
        ...chunk.metadata,
        charCount: chunk2Content.length,
        wordCount: chunk2Content.split(/\s+/).length
      }
    };
    
    // Replace original chunk with two new ones
    newChunks.splice(chunkIndex, 1, chunk1, chunk2);
    
    // Update indices
    newChunks.forEach((c, i) => {
      c.index = i;
    });
    
    setChunks(newChunks);
    setSuccess('Chunk split successfully');
  };

  const handleMerge = async (chunk1Id: string, chunk2Id: string) => {
    const chunk1Index = chunks.findIndex(c => c.id === chunk1Id);
    const chunk2Index = chunks.findIndex(c => c.id === chunk2Id);
    
    if (chunk1Index === -1 || chunk2Index === -1) return;
    
    const firstIndex = Math.min(chunk1Index, chunk2Index);
    const lastIndex = Math.max(chunk1Index, chunk2Index);
    
    const mergedContent = chunks
      .slice(firstIndex, lastIndex + 1)
      .map(c => c.content)
      .join('');
    
    const mergedChunk: DocumentChunk = {
      ...chunks[firstIndex],
      id: `${chunk1Id}-merged`,
      content: mergedContent,
      endChar: chunks[lastIndex].endChar,
      metadata: {
        ...chunks[firstIndex].metadata,
        charCount: mergedContent.length,
        wordCount: mergedContent.split(/\s+/).length
      }
    };
    
    const newChunks = [
      ...chunks.slice(0, firstIndex),
      mergedChunk,
      ...chunks.slice(lastIndex + 1)
    ];
    
    // Update indices
    newChunks.forEach((c, i) => {
      c.index = i;
    });
    
    setChunks(newChunks);
    setSuccess('Chunks merged successfully');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Chunking</h1>
        <p className="text-muted-foreground">
          Process and chunk documents for optimal AI processing
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="input" className="space-y-4">
        <TabsList>
          <TabsTrigger value="input">
            <FileText className="h-4 w-4 mr-2" />
            Input
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={chunks.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            Preview ({chunks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Input</CardTitle>
              <CardDescription>
                Paste your document text or upload a file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-text">Document Text</Label>
                <Textarea
                  id="document-text"
                  placeholder="Paste your document text here..."
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 p-2 border rounded-md hover:bg-accent">
                      <Upload className="h-4 w-4" />
                      <span>Upload File</span>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".txt,.md,.markdown"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </Label>
                </div>

                <Button
                  onClick={handleChunkDocument}
                  disabled={isProcessing || !documentText.trim()}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Process Document'
                  )}
                </Button>
              </div>

              {documentText && (
                <div className="text-sm text-muted-foreground">
                  Document size: {documentText.length} characters, {documentText.split(/\s+/).length} words
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chunking Settings</CardTitle>
              <CardDescription>
                Configure how documents are chunked
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-size">Max Chunk Size</Label>
                  <input
                    id="max-size"
                    type="number"
                    value={config.maxChunkSize}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      maxChunkSize: parseInt(e.target.value) 
                    }))}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-size">Min Chunk Size</Label>
                  <input
                    id="min-size"
                    type="number"
                    value={config.minChunkSize}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      minChunkSize: parseInt(e.target.value) 
                    }))}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overlap">Overlap Percentage</Label>
                  <input
                    id="overlap"
                    type="number"
                    value={config.overlapPercentage}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      overlapPercentage: parseInt(e.target.value) 
                    }))}
                    min="10"
                    max="20"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overhead">Metadata Overhead</Label>
                  <input
                    id="overhead"
                    type="number"
                    value={config.metadataOverhead}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      metadataOverhead: parseInt(e.target.value) 
                    }))}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.useSmartBoundaries}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      useSmartBoundaries: e.target.checked 
                    }))}
                  />
                  <span>Use Smart Boundaries (OpenAI)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.preserveStructure}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      preserveStructure: e.target.checked 
                    }))}
                  />
                  <span>Preserve Document Structure</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {chunks.length > 0 && (
            <ChunkPreview
              chunks={chunks}
              fullText={documentText}
              onSplit={handleSplit}
              onMerge={handleMerge}
              onApprove={handleApprove}
              overlapPercentage={config.overlapPercentage}
              onOverlapChange={handleOverlapChange}
              onBoundaryChange={handleBoundaryChange}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}