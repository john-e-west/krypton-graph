import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SyncService } from '../../../../packages/zep-client/src/services/sync.service';
import { RateLimiter } from '../../../../packages/zep-client/src/rate-limiter';
import { RetryManager } from '../../../../packages/zep-client/src/retry';
import { EpisodeService } from '../../../../packages/zep-client/src/services/episode.service';
import { UserService } from '../../../../packages/zep-client/src/services/user.service';
import { EpisodeManager } from '../../../../packages/zep-client/src/episode-manager';

// Singleton instances
let syncService: SyncService | null = null;

function getSyncService(): SyncService {
  if (!syncService) {
    // Initialize dependencies
    const rateLimiter = new RateLimiter({ requestsPerMinute: 30 });
    const retryManager = new RetryManager({
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    });
    
    const episodeManager = new EpisodeManager();
    const episodeService = new EpisodeService(episodeManager);
    const userService = new UserService();
    
    syncService = new SyncService(
      rateLimiter,
      retryManager,
      episodeService,
      userService
    );
  }
  
  return syncService;
}

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
    const { documentId, action = 'sync' } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    console.log(`Starting ${action} for document ${documentId} (user: ${userId})`);

    const service = getSyncService();
    let result;

    switch (action) {
      case 'sync':
        result = await service.syncDocumentChunks(documentId, userId);
        break;
      case 'retry':
        result = await service.retryFailedChunks(documentId, userId);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error in sync endpoint:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage
      },
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

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    const service = getSyncService();
    const status = await service.getSyncStatus(documentId);

    return NextResponse.json({
      success: true,
      documentId,
      status
    });

  } catch (error) {
    console.error('Error fetching sync status:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}