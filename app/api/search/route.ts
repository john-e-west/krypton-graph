import { NextRequest, NextResponse } from 'next/server';
import { SemanticSearchService, SearchQuery, SearchContext } from '../../services/search/semantic-search.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input parameters
    const { query, filters, userId } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 }
      );
    }

    // Construct search query
    const searchQuery: SearchQuery = {
      query: query.trim(),
      filters: {
        dateRange: filters?.dateRange,
        sourceType: filters?.sourceType,
        limit: filters?.limit || 20
      },
      userId: userId || 'anonymous'
    };

    // Create search context
    const context: SearchContext = {
      userId: searchQuery.userId!,
      sessionId: request.headers.get('x-session-id') || 'default',
      timestamp: Date.now(),
      previousQueries: [] // Will be populated from session storage in future
    };

    // Perform search
    const searchService = SemanticSearchService.getInstance();
    const results = await searchService.search(searchQuery, context);

    // Return structured results
    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        timestamp: new Date().toISOString(),
        apiVersion: '1.0'
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.message.includes('Query must be')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  // Convert GET to POST-like structure
  const searchQuery: SearchQuery = {
    query: query.trim(),
    filters: {
      limit: parseInt(searchParams.get('limit') || '20'),
      sourceType: searchParams.get('sourceType')?.split(',')
    },
    userId: searchParams.get('userId') || 'anonymous'
  };

  try {
    const context: SearchContext = {
      userId: searchQuery.userId!,
      sessionId: request.headers.get('x-session-id') || 'default',
      timestamp: Date.now(),
      previousQueries: []
    };

    const searchService = SemanticSearchService.getInstance();
    const results = await searchService.search(searchQuery, context);

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        timestamp: new Date().toISOString(),
        apiVersion: '1.0'
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}