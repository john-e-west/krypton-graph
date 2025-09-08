import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface SyncQueueItem {
  id: string;
  documentId: string;
  userId: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

// In-memory queue for MVP (would use Vercel KV in production)
const syncQueue: SyncQueueItem[] = [];
const processingQueue = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { documentId, priority = 5 } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    // Check if document is already in queue
    const existingItem = syncQueue.find(
      item => item.documentId === documentId && 
      item.userId === userId && 
      ['pending', 'processing'].includes(item.status)
    );

    if (existingItem) {
      return NextResponse.json({
        message: 'Document already in sync queue',
        queueItem: existingItem
      });
    }

    // Create new queue item
    const queueItem: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      documentId,
      userId,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3
    };

    // Insert in priority order (higher priority first)
    let insertIndex = syncQueue.length;
    for (let i = 0; i < syncQueue.length; i++) {
      if (syncQueue[i].priority < priority) {
        insertIndex = i;
        break;
      }
    }

    syncQueue.splice(insertIndex, 0, queueItem);

    console.log(`Added document ${documentId} to sync queue with priority ${priority}`);

    return NextResponse.json({
      message: 'Document added to sync queue',
      queueItem,
      queuePosition: insertIndex + 1,
      totalItems: syncQueue.length
    });

  } catch (error) {
    console.error('Error adding to sync queue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const documentId = url.searchParams.get('documentId');
    const status = url.searchParams.get('status');

    let filteredQueue = syncQueue.filter(item => item.userId === userId);

    if (documentId) {
      filteredQueue = filteredQueue.filter(item => item.documentId === documentId);
    }

    if (status) {
      filteredQueue = filteredQueue.filter(item => item.status === status);
    }

    // Sort by priority and creation date
    filteredQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return NextResponse.json({
      queueItems: filteredQueue,
      totalItems: filteredQueue.length,
      processingItems: Array.from(processingQueue).filter(id => 
        filteredQueue.some(item => item.id === id)
      ).length
    });

  } catch (error) {
    console.error('Error fetching sync queue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const queueId = url.searchParams.get('id');
    const documentId = url.searchParams.get('documentId');

    if (!queueId && !documentId) {
      return NextResponse.json(
        { error: 'Either id or documentId is required' },
        { status: 400 }
      );
    }

    let removedItems = 0;

    if (queueId) {
      const index = syncQueue.findIndex(
        item => item.id === queueId && item.userId === userId && item.status === 'pending'
      );
      
      if (index !== -1) {
        syncQueue.splice(index, 1);
        removedItems = 1;
        console.log(`Removed queue item ${queueId} from sync queue`);
      }
    } else if (documentId) {
      for (let i = syncQueue.length - 1; i >= 0; i--) {
        const item = syncQueue[i];
        if (item.documentId === documentId && item.userId === userId && item.status === 'pending') {
          syncQueue.splice(i, 1);
          removedItems++;
        }
      }
      console.log(`Removed ${removedItems} items for document ${documentId} from sync queue`);
    }

    return NextResponse.json({
      message: `Removed ${removedItems} item(s) from sync queue`,
      removedItems
    });

  } catch (error) {
    console.error('Error removing from sync queue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get next item from queue (for queue processor)
export function getNextQueueItem(): SyncQueueItem | null {
  const pendingItems = syncQueue.filter(item => 
    item.status === 'pending' && !processingQueue.has(item.id)
  );

  if (pendingItems.length === 0) {
    return null;
  }

  // Sort by priority and creation date
  pendingItems.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Higher priority first
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return pendingItems[0];
}

// Helper function to mark item as processing
export function markItemProcessing(itemId: string): void {
  processingQueue.add(itemId);
  const item = syncQueue.find(i => i.id === itemId);
  if (item) {
    item.status = 'processing';
    item.processedAt = new Date().toISOString();
  }
}

// Helper function to mark item as completed
export function markItemCompleted(itemId: string, success: boolean, error?: string): void {
  processingQueue.delete(itemId);
  const item = syncQueue.find(i => i.id === itemId);
  if (item) {
    item.status = success ? 'completed' : 'failed';
    item.completedAt = new Date().toISOString();
    if (error) {
      item.error = error;
    }
    
    // If failed and retries remaining, reset to pending
    if (!success && item.retryCount < item.maxRetries) {
      item.retryCount++;
      item.status = 'pending';
      item.processedAt = undefined;
      item.completedAt = undefined;
      console.log(`Queuing retry ${item.retryCount}/${item.maxRetries} for item ${itemId}`);
    }
  }
}

// Helper function to get queue statistics
export function getQueueStats(): {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
} {
  const pending = syncQueue.filter(item => item.status === 'pending').length;
  const processing = syncQueue.filter(item => item.status === 'processing').length;
  const completed = syncQueue.filter(item => item.status === 'completed').length;
  const failed = syncQueue.filter(item => item.status === 'failed' && item.retryCount >= item.maxRetries).length;

  return {
    pending,
    processing,
    completed,
    failed,
    total: syncQueue.length
  };
}