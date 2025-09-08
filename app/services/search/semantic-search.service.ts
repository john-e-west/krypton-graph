interface SearchQuery {
  query: string;
  filters?: {
    dateRange?: {
      start?: string;
      end?: string;
    };
    sourceType?: string[];
    limit?: number;
  };
  userId?: string;
}

interface QueryIntent {
  type: 'question' | 'statement' | 'command';
  searchType: 'entity' | 'concept' | 'general';
  temporal: boolean;
  confidence: number;
}

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  source: string;
  sourceType: 'document' | 'fact' | 'entity';
  score: number;
  highlights: string[];
  metadata: Record<string, unknown>;
  url?: string;
  scoreExplanation?: ScoreExplanation;
}

interface ScoreExplanation {
  baseScore: number;
  similarityPercentage: number;
  boostFactors: {
    recency?: number;
    sourceWeight?: number;
    queryMatch?: number;
  };
  confidenceLevel: 'high' | 'medium' | 'low';
  finalScore: number;
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  query: string;
  processingTimeMs: number;
  suggestions?: string[];
  queryIntent?: QueryIntent;
}

interface SearchContext {
  userId: string;
  sessionId: string;
  timestamp: number;
  previousQueries: string[];
  userPreferences?: {
    preferredSources?: string[];
    dateRange?: { start?: string; end?: string };
  };
}

interface PerformanceMetrics {
  queryLatency: number;
  cacheHit: boolean;
  resultsCount: number;
  searchScope: string[];
  timestamp: string;
}

class SemanticSearchService {
  private static instance: SemanticSearchService;
  private cache = new Map<string, { data: SearchResponse; timestamp: number; hits: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private performanceMetrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 queries for monitoring
  private readonly SLOW_QUERY_THRESHOLD = 200; // ms

  static getInstance(): SemanticSearchService {
    if (!SemanticSearchService.instance) {
      SemanticSearchService.instance = new SemanticSearchService();
    }
    return SemanticSearchService.instance;
  }

  async search(searchQuery: SearchQuery, context?: SearchContext): Promise<SearchResponse> {
    const startTime = Date.now();
    
    // Generate cache key including user context for better cache targeting
    const cacheKey = this.generateCacheKey(searchQuery, context);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      const response = cached;
      
      // Track performance metrics even for cache hits
      this.recordPerformanceMetrics({
        queryLatency: Date.now() - startTime,
        cacheHit: true,
        resultsCount: response.results.length,
        searchScope: this.determineSearchScope(searchQuery, context),
        timestamp: new Date().toISOString()
      });
      
      return response;
    }

    // Apply query optimization based on context
    const optimizedQuery = this.optimizeQuery(searchQuery, context);
    
    // Preprocess query
    const processedQuery = this.preprocessQuery(optimizedQuery.query);
    
    // Validate query
    this.validateQuery(processedQuery);

    // Detect query intent
    const queryIntent = this.detectQueryIntent(processedQuery);

    // Perform search with early termination support
    const results = await this.performSearchWithOptimizations(
      processedQuery, 
      optimizedQuery.filters, 
      context
    );
    
    const processingTime = Date.now() - startTime;
    
    const response: SearchResponse = {
      results,
      totalCount: results.length,
      query: processedQuery,
      processingTimeMs: processingTime,
      suggestions: this.generateSuggestions(processedQuery),
      queryIntent
    };

    // Cache the results
    this.setCache(cacheKey, response);
    
    // Record performance metrics
    this.recordPerformanceMetrics({
      queryLatency: processingTime,
      cacheHit: false,
      resultsCount: results.length,
      searchScope: this.determineSearchScope(optimizedQuery, context),
      timestamp: new Date().toISOString()
    });
    
    // Alert on slow queries
    if (processingTime > this.SLOW_QUERY_THRESHOLD) {
      this.handleSlowQuery(searchQuery, processingTime, results.length);
    }
    
    return response;
  }

  private preprocessQuery(query: string): string {
    // Remove extra whitespace
    const processed = query.trim().replace(/\s+/g, ' ');
    
    // Convert to lowercase for processing (preserve original case in results)
    const lowerQuery = processed.toLowerCase();
    
    // Remove common stop words (basic implementation)
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = lowerQuery.split(' ');
    const filteredWords = words.filter(word => !stopWords.includes(word) || words.length <= 2);
    
    // Expand common abbreviations
    const expansions: Record<string, string> = {
      'docs': 'documents',
      'info': 'information',
      'config': 'configuration',
      'auth': 'authentication',
      'api': 'application programming interface'
    };
    
    const expandedWords = filteredWords.map(word => expansions[word] || word);
    
    return expandedWords.join(' ');
  }

  private validateQuery(query: string): void {
    if (!query || query.length < 2) {
      throw new Error('Query must be at least 2 characters long');
    }
    
    if (query.length > 500) {
      throw new Error('Query must be less than 500 characters');
    }
    
    // Sanitize special characters (basic implementation)
    const sanitized = query.replace(/[<>"'%;()&+]/g, '');
    if (sanitized !== query) {
      throw new Error('Query contains invalid characters');
    }
  }

  private detectQueryIntent(query: string): QueryIntent {
    const lowercaseQuery = query.toLowerCase();
    let confidence = 0.8;
    
    // Detect question vs statement vs command
    let type: 'question' | 'statement' | 'command' = 'statement';
    
    const questionWords = ['what', 'who', 'when', 'where', 'why', 'how', 'which', 'whom', 'whose'];
    const questionMarkers = ['?', 'can you', 'could you', 'would you', 'do you', 'is there', 'are there'];
    const commandWords = ['show', 'find', 'search', 'get', 'retrieve', 'fetch', 'list', 'display'];
    
    if (lowercaseQuery.includes('?') || questionWords.some(word => lowercaseQuery.startsWith(word + ' '))) {
      type = 'question';
      confidence = 0.9;
    } else if (questionMarkers.some(marker => lowercaseQuery.includes(marker))) {
      type = 'question';
      confidence = 0.85;
    } else if (commandWords.some(cmd => lowercaseQuery.startsWith(cmd + ' '))) {
      type = 'command';
      confidence = 0.9;
    }
    
    // Detect entity vs concept vs general search
    let searchType: 'entity' | 'concept' | 'general' = 'general';
    
    const entityMarkers = ['@', '#', 'person:', 'company:', 'organization:', 'user:', 'author:'];
    const conceptMarkers = ['about', 'regarding', 'concerning', 'related to', 'concept of'];
    const words = query.split(' ');
    const properNouns = words.filter(word => {
      // Skip common words that might be capitalized
      const commonWords = ['find', 'show', 'get', 'search', 'what', 'who', 'when', 'where', 'why', 'how'];
      if (commonWords.includes(word.toLowerCase())) return false;
      
      // Check if word starts with capital letter and has more than 1 character
      return word.length > 1 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase();
    });
    
    if (entityMarkers.some(marker => lowercaseQuery.includes(marker)) || properNouns.length > 0) {
      searchType = 'entity';
      if (entityMarkers.some(marker => lowercaseQuery.includes(marker))) {
        confidence = Math.min(confidence + 0.1, 1.0);
      }
    } else if (conceptMarkers.some(marker => lowercaseQuery.includes(marker))) {
      searchType = 'concept';
      confidence = Math.min(confidence + 0.05, 1.0);
    }
    
    // Detect temporal queries
    const temporalMarkers = [
      'today', 'yesterday', 'tomorrow', 'last', 'this', 'next',
      'before', 'after', 'during', 'since', 'until', 'from',
      '2024', '2025', 'january', 'february', 'march', 'april',
      'may', 'june', 'july', 'august', 'september', 'october',
      'november', 'december', 'recent', 'latest', 'current'
    ];
    
    const temporal = temporalMarkers.some(marker => lowercaseQuery.includes(marker));
    if (temporal) {
      confidence = Math.min(confidence + 0.05, 1.0);
    }
    
    return {
      type,
      searchType,
      temporal,
      confidence: Math.round(confidence * 100) / 100
    };
  }


  private extractTitle(content: string): string {
    // Extract first line or first sentence as title
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim();
    
    if (firstLine && firstLine.length < 100) {
      return firstLine;
    }
    
    // Extract first sentence
    const sentences = content.split(/[.!?]+/);
    const firstSentence = sentences[0]?.trim();
    
    if (firstSentence && firstSentence.length < 150) {
      return firstSentence + '...';
    }
    
    // Fallback: truncate content
    return content.substring(0, 80) + '...';
  }

  private generateSnippet(content: string, query: string): string {
    const maxLength = 150;
    
    if (!content) return '';
    if (content.length <= maxLength) return content;
    
    // Try to find the most relevant part of content
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    const contentLower = content.toLowerCase();
    
    let bestIndex = 0;
    let maxScore = 0;
    
    // Find the position with highest relevance score
    for (let i = 0; i <= content.length - maxLength; i += 10) {
      const windowEnd = Math.min(i + maxLength, content.length);
      const window = contentLower.substring(i, windowEnd);
      
      // Calculate relevance score for this window
      let score = 0;
      queryWords.forEach(word => {
        // Count occurrences and boost for exact matches
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const exactMatches = (window.match(regex) || []).length;
        const partialMatches = (window.match(new RegExp(word, 'g')) || []).length;
        
        score += exactMatches * 3 + partialMatches;
      });
      
      // Boost score if window starts at sentence boundary
      if (i === 0 || content[i - 1] === '.' || content[i - 1] === '\n') {
        score *= 1.2;
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestIndex = i;
      }
    }
    
    // Try to start at sentence or word boundary
    if (bestIndex > 0) {
      const sentenceStart = content.lastIndexOf('. ', bestIndex);
      const wordStart = content.lastIndexOf(' ', bestIndex);
      
      // Prefer sentence boundary, then word
      if (sentenceStart > bestIndex - 30 && sentenceStart > 0) {
        bestIndex = sentenceStart + 2; // Skip ". "
      } else if (wordStart > bestIndex - 10 && wordStart > 0) {
        bestIndex = wordStart + 1; // Skip space
      }
    }
    
    let snippet = content.substring(bestIndex, Math.min(bestIndex + maxLength, content.length));
    
    // Try to end at sentence boundary
    const lastSentenceEnd = snippet.lastIndexOf('. ');
    const lastQuestionEnd = snippet.lastIndexOf('? ');
    
    const sentenceEnds = [lastSentenceEnd, lastQuestionEnd]
      .filter(pos => pos > maxLength * 0.6);
    
    if (sentenceEnds.length > 0) {
      const bestEnd = Math.max(...sentenceEnds);
      snippet = snippet.substring(0, bestEnd + 2);
    } else if (snippet.length === maxLength) {
      // Try to end at word boundary
      const lastSpace = snippet.lastIndexOf(' ');
      if (lastSpace > maxLength * 0.8) {
        snippet = snippet.substring(0, lastSpace);
      }
      snippet = snippet + '...';
    }
    
    // Add ellipsis at start if not starting from beginning
    if (bestIndex > 0) {
      snippet = '...' + snippet;
    }
    
    return snippet.trim();
  }

  private determineSource(metadata: Record<string, unknown>): string {
    if (metadata?.sourceAttribution === 'document') {
      return metadata?.filename as string || metadata?.title as string || 'Document';
    }
    
    if (metadata?.sourceAttribution === 'fact') {
      return 'Knowledge Base';
    }
    
    if (metadata?.sourceAttribution === 'memory') {
      return 'Conversation History';
    }
    
    return metadata?.source as string || 'Unknown';
  }

  private mapSourceType(sourceAttribution: string): 'document' | 'fact' | 'entity' {
    switch (sourceAttribution) {
      case 'document':
      case 'memory':
        return 'document';
      case 'fact':
        return 'fact';
      default:
        return 'entity';
    }
  }

  private generateHighlights(content: string, query: string): string[] {
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    const highlightSet = new Set<string>();
    
    const contentLower = content.toLowerCase();
    
    // Direct word matches
    queryWords.forEach(word => {
      if (contentLower.includes(word)) {
        // Find exact word matches
        const exactRegex = new RegExp(`\\b${word}\\b`, 'gi');
        const exactMatches = content.match(exactRegex);
        
        if (exactMatches) {
          exactMatches.slice(0, 2).forEach(match => highlightSet.add(match));
        }
        
        // Find variations (plurals, verb forms)
        const stemmedWord = this.getStemmedWord(word);
        if (stemmedWord !== word) {
          const stemRegex = new RegExp(`\\b${stemmedWord}\\w*\\b`, 'gi');
          const stemMatches = content.match(stemRegex);
          
          if (stemMatches) {
            stemMatches.slice(0, 1).forEach(match => highlightSet.add(match));
          }
        }
      }
    });
    
    // Semantic highlighting - find related terms
    const semanticTerms = this.getSemanticRelatedTerms(query);
    semanticTerms.forEach(term => {
      if (contentLower.includes(term.toLowerCase())) {
        const semanticRegex = new RegExp(`\\b${term}\\b`, 'gi');
        const semanticMatches = content.match(semanticRegex);
        
        if (semanticMatches) {
          semanticMatches.slice(0, 1).forEach(match => highlightSet.add(match));
        }
      }
    });
    
    // Convert set to array and limit total highlights
    return Array.from(highlightSet).slice(0, 5);
  }
  
  private getStemmedWord(word: string): string {
    // Simple stemming for common endings
    if (word.endsWith('ing')) return word.slice(0, -3);
    if (word.endsWith('ed')) return word.slice(0, -2);
    if (word.endsWith('es')) return word.slice(0, -2);
    if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
    return word;
  }
  
  private getSemanticRelatedTerms(query: string): string[] {
    // Map of semantic relationships for common terms
    const semanticMap: Record<string, string[]> = {
      'authentication': ['auth', 'login', 'security', 'credentials'],
      'document': ['file', 'paper', 'record', 'content'],
      'search': ['find', 'query', 'lookup', 'retrieve'],
      'user': ['person', 'account', 'profile', 'member'],
      'data': ['information', 'records', 'content', 'facts'],
      'config': ['configuration', 'settings', 'setup', 'options'],
      'error': ['mistake', 'issue', 'problem', 'failure'],
      'create': ['make', 'build', 'generate', 'add'],
      'update': ['modify', 'change', 'edit', 'revise'],
      'delete': ['remove', 'destroy', 'clear', 'erase']
    };
    
    const relatedTerms: string[] = [];
    const queryLower = query.toLowerCase();
    
    Object.entries(semanticMap).forEach(([key, values]) => {
      if (queryLower.includes(key)) {
        relatedTerms.push(...values.slice(0, 2));
      }
      // Also check if query contains any of the values
      values.forEach(value => {
        if (queryLower.includes(value) && !relatedTerms.includes(key)) {
          relatedTerms.push(key);
        }
      });
    });
    
    return relatedTerms;
  }

  private generateUrl(result: { documentId?: string; factUuid?: string; episodeId?: string }): string | undefined {
    if (result.documentId) {
      return `/documents/${result.documentId}`;
    }
    
    if (result.factUuid) {
      return `/facts/${result.factUuid}`;
    }
    
    if (result.episodeId) {
      return `/conversations/${result.episodeId}`;
    }
    
    return undefined;
  }

  private enhanceResultScore(result: SearchResult, query: string, _context?: SearchContext): SearchResult {
    const baseScore = result.score;
    const boostFactors: ScoreExplanation['boostFactors'] = {};
    let finalScore = baseScore;

    // Apply recency boost for recent documents
    const recencyBoost = this.calculateRecencyBoost(result.metadata);
    if (recencyBoost > 0) {
      boostFactors.recency = recencyBoost;
      finalScore *= (1 + recencyBoost);
    }

    // Apply source weight boost
    const sourceWeight = this.calculateSourceWeight(result.sourceType, result.source);
    if (sourceWeight !== 1) {
      boostFactors.sourceWeight = sourceWeight;
      finalScore *= sourceWeight;
    }

    // Apply query match boost based on content relevance
    const queryMatchBoost = this.calculateQueryMatchBoost(result, query);
    if (queryMatchBoost > 0) {
      boostFactors.queryMatch = queryMatchBoost;
      finalScore *= (1 + queryMatchBoost);
    }

    // Ensure score doesn't exceed 1.0
    finalScore = Math.min(finalScore, 1.0);

    // Determine confidence level
    const confidenceLevel = this.determineConfidenceLevel(finalScore, result);

    const scoreExplanation: ScoreExplanation = {
      baseScore,
      similarityPercentage: Math.round(baseScore * 100),
      boostFactors,
      confidenceLevel,
      finalScore: Math.round(finalScore * 1000) / 1000 // Round to 3 decimal places
    };

    return {
      ...result,
      score: finalScore,
      scoreExplanation
    };
  }

  private calculateRecencyBoost(metadata: Record<string, unknown>): number {
    const now = Date.now();
    let documentDate: number | null = null;

    // Try to extract date from various metadata fields
    if (metadata.createdAt) {
      documentDate = new Date(metadata.createdAt as string).getTime();
    } else if (metadata.lastModified) {
      documentDate = new Date(metadata.lastModified as string).getTime();
    } else if (metadata.timestamp) {
      documentDate = new Date(metadata.timestamp as string).getTime();
    }

    if (!documentDate || isNaN(documentDate)) {
      return 0; // No boost if date unavailable
    }

    const daysDiff = (now - documentDate) / (1000 * 60 * 60 * 24);

    // Boost recent documents
    if (daysDiff <= 1) return 0.15;      // 15% boost for documents < 1 day old
    if (daysDiff <= 7) return 0.10;      // 10% boost for documents < 1 week old
    if (daysDiff <= 30) return 0.05;     // 5% boost for documents < 1 month old
    if (daysDiff <= 90) return 0.02;     // 2% boost for documents < 3 months old

    return 0; // No boost for older documents
  }

  private calculateSourceWeight(sourceType: SearchResult['sourceType'], source: string): number {
    // Weight different source types
    const typeWeights = {
      'fact': 1.2,        // Facts are highly curated, boost by 20%
      'document': 1.0,    // Documents are baseline
      'entity': 0.9       // Entities might be less comprehensive
    };

    let weight = typeWeights[sourceType] || 1.0;

    // Apply additional weights based on source name/origin
    if (source.toLowerCase().includes('official') || 
        source.toLowerCase().includes('documentation')) {
      weight *= 1.1; // 10% boost for official sources
    }

    if (source.toLowerCase().includes('readme') || 
        source.toLowerCase().includes('guide')) {
      weight *= 1.05; // 5% boost for guides and readmes
    }

    return weight;
  }

  private calculateQueryMatchBoost(result: SearchResult, query: string): number {
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    const content = (result.title + ' ' + result.snippet).toLowerCase();
    
    let exactMatches = 0;
    let partialMatches = 0;

    queryWords.forEach(word => {
      if (content.includes(word)) {
        exactMatches++;
      } else {
        // Check for partial matches (useful for stemming/variations)
        const variations = [word + 's', word + 'ed', word + 'ing'];
        if (variations.some(variation => content.includes(variation))) {
          partialMatches++;
        }
      }
    });

    const matchRatio = (exactMatches + partialMatches * 0.5) / queryWords.length;
    
    // Boost based on match ratio
    if (matchRatio >= 0.8) return 0.15; // High match - 15% boost
    if (matchRatio >= 0.6) return 0.10; // Good match - 10% boost
    if (matchRatio >= 0.4) return 0.05; // Moderate match - 5% boost

    return 0;
  }

  private determineConfidenceLevel(score: number, result: SearchResult): 'high' | 'medium' | 'low' {
    // High confidence: high score + multiple factors
    if (score >= 0.85 && result.highlights.length >= 2) {
      return 'high';
    }

    // Medium confidence: decent score or good content match
    if (score >= 0.7 || result.highlights.length >= 1) {
      return 'medium';
    }

    // Low confidence: everything else
    return 'low';
  }

  private reRankResults(results: SearchResult[], limit: number): SearchResult[] {
    // Group by document/source to avoid duplicate sources dominating results
    const grouped = new Map<string, SearchResult[]>();
    
    results.forEach(result => {
      const groupKey = result.sourceType === 'document' ? 
        result.metadata.zepDocumentId as string || result.source :
        result.id;
      
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(result);
    });

    // Sort each group by score and take the best result from each
    const bestFromEachSource = Array.from(grouped.values()).map(group => {
      return group.sort((a, b) => b.score - a.score)[0];
    });

    // Sort all results by final score
    const sorted = bestFromEachSource.sort((a, b) => b.score - a.score);

    // If we have fewer results than limit, add remaining results from groups
    if (sorted.length < limit) {
      const usedIds = new Set(sorted.map(r => r.id));
      const remaining = results
        .filter(r => !usedIds.has(r.id))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit - sorted.length);
      
      sorted.push(...remaining);
    }

    return sorted.slice(0, limit);
  }

  private optimizeQuery(searchQuery: SearchQuery, context?: SearchContext): SearchQuery {
    const optimized = { ...searchQuery };
    
    // Apply user preferences
    if (context?.userPreferences) {
      // Limit date range based on user preferences
      if (context.userPreferences.dateRange) {
        optimized.filters = {
          ...optimized.filters,
          dateRange: context.userPreferences.dateRange
        };
      }
      
      // Filter by preferred sources
      if (context.userPreferences.preferredSources?.length) {
        optimized.filters = {
          ...optimized.filters,
          sourceType: context.userPreferences.preferredSources as ('document' | 'fact' | 'entity')[]
        };
      }
    }
    
    // Optimize based on query intent (detected later but can pre-optimize)
    if (optimized.query.toLowerCase().includes('recent') || 
        optimized.query.toLowerCase().includes('latest')) {
      // Limit to recent documents for performance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      optimized.filters = {
        ...optimized.filters,
        dateRange: {
          start: thirtyDaysAgo.toISOString(),
          end: new Date().toISOString()
        }
      };
    }
    
    return optimized;
  }

  private async performSearchWithOptimizations(
    query: string,
    filters?: SearchQuery['filters'],
    context?: SearchContext
  ): Promise<SearchResult[]> {
    // Early termination: If we have enough high-quality results, stop early
    const EARLY_TERMINATION_THRESHOLD = 0.9; // Stop if we have results with score > 0.9
    const MIN_RESULTS_FOR_TERMINATION = 5;
    
    try {
      const { getZepClient } = await import('../../../packages/zep-client/src');
      const zepClient = getZepClient();
      
      // Build optimized ZEP search query
      const zepQuery = {
        userId: context?.userId || 'anonymous',
        text: query,
        limit: filters?.limit || 20,
        searchType: 'similarity' as const,
        minScore: 0.7,
        metadata: {
          sessionId: context?.sessionId,
          timestamp: context?.timestamp,
          filters: filters,
          // Add early termination hint
          earlyTermination: true
        }
      };

      // Execute search with potential early termination
      const zepResults = await zepClient.search(zepQuery);
      
      // Check for early termination opportunity
      const highQualityResults = zepResults.filter(r => r.score >= EARLY_TERMINATION_THRESHOLD);
      if (highQualityResults.length >= MIN_RESULTS_FOR_TERMINATION) {
        console.log(`Early termination: Found ${highQualityResults.length} high-quality results`);
        // Process only high-quality results for better performance
        return this.processSearchResults(highQualityResults, query, context);
      }
      
      // Process all results if early termination didn't trigger
      return this.processSearchResults(zepResults, query, context);
      
    } catch (error) {
      console.error('ZEP search error:', error);
      return [];
    }
  }

  private processSearchResults(
    zepResults: SearchResult[],
    query: string,
    context?: SearchContext
  ): SearchResult[] {
    // Transform and enhance results
    const enhancedResults = zepResults.map((result, index) => {
      const baseResult = {
        id: result.documentId || result.factUuid || `result_${index}`,
        title: this.extractTitle(result.content),
        snippet: this.generateSnippet(result.content, query),
        source: this.determineSource(result.metadata),
        sourceType: this.mapSourceType(result.metadata?.sourceAttribution || 'document'),
        score: result.score,
        highlights: this.generateHighlights(result.content, query),
        metadata: {
          ...result.metadata,
          zepEpisodeId: result.episodeId,
          zepDocumentId: result.documentId,
          zepFactUuid: result.factUuid
        },
        url: this.generateUrl(result)
      };

      // Apply advanced scoring
      return this.enhanceResultScore(baseResult, query, context);
    });

    // Apply reranking and grouping
    return this.reRankResults(enhancedResults, 20);
  }

  private recordPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceMetrics.push(metrics);
    
    // Keep only last MAX_METRICS entries
    if (this.performanceMetrics.length > this.MAX_METRICS) {
      this.performanceMetrics.shift();
    }
  }

  private determineSearchScope(searchQuery: SearchQuery, context?: SearchContext): string[] {
    const scope: string[] = [];
    
    if (searchQuery.filters?.sourceType) {
      scope.push(...searchQuery.filters.sourceType);
    } else {
      scope.push('all');
    }
    
    if (searchQuery.filters?.dateRange) {
      scope.push('filtered-by-date');
    }
    
    if (context?.userPreferences?.preferredSources) {
      scope.push('user-preferred');
    }
    
    return scope;
  }

  private handleSlowQuery(query: SearchQuery, latency: number, resultsCount: number): void {
    console.warn(`SLOW QUERY ALERT: Query "${query.query}" took ${latency}ms (threshold: ${this.SLOW_QUERY_THRESHOLD}ms)`, {
      query: query.query,
      latency,
      resultsCount,
      filters: query.filters,
      timestamp: new Date().toISOString()
    });
    
    // In production, this would send to monitoring service
    // For now, just log to console
  }

  getPerformanceMetrics(): {
    queries: number;
    recentQueries: PerformanceMetrics[];
    averageLatency: number;
    cacheHitRate: number;
    slowQueryCount: number;
    p95Latency: number;
    cacheSize: number;
  } {
    if (this.performanceMetrics.length === 0) {
      return {
        queries: 0,
        recentQueries: [],
        averageLatency: 0,
        cacheHitRate: 0,
        slowQueryCount: 0,
        p95Latency: 0,
        cacheSize: this.cache.size
      };
    }
    
    const recentQueries = this.performanceMetrics.slice(-100); // Last 100 queries
    const latencies = recentQueries.map(m => m.queryLatency).sort((a, b) => a - b);
    const cacheHits = recentQueries.filter(m => m.cacheHit).length;
    const slowQueries = recentQueries.filter(m => m.queryLatency > this.SLOW_QUERY_THRESHOLD).length;
    
    const p95Index = Math.floor(latencies.length * 0.95);
    
    return {
      queries: this.performanceMetrics.length,
      recentQueries,
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      cacheHitRate: cacheHits / recentQueries.length,
      slowQueryCount: slowQueries,
      p95Latency: latencies[p95Index] || 0,
      cacheSize: this.cache.size
    };
  }

  invalidateCache(pattern?: string): void {
    if (pattern) {
      // Invalidate entries matching pattern
      for (const [key] of this.cache) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.cache.clear();
    }
    
    console.log(`Cache invalidated${pattern ? ` for pattern: ${pattern}` : ' (all entries)'}`);
  }

  private generateSuggestions(query: string): string[] {
    // Placeholder - will be enhanced with AI/ML suggestions
    const suggestions = [
      `${query} documentation`,
      `${query} examples`,
      `${query} configuration`,
      `how to ${query}`,
      `${query} tutorial`
    ];
    
    return suggestions.slice(0, 3);
  }
  
  formatForUI(searchResponse: SearchResponse): {
    results: Array<{
      id: string;
      title: string;
      snippet: string;
      highlightedSnippet: string;
      source: string;
      sourceIcon: string;
      score: number;
      confidence: 'high' | 'medium' | 'low';
      url?: string;
      metadata: {
        date?: string;
        author?: string;
        tags?: string[];
      };
    }>;
    facets: {
      sources: Array<{ name: string; count: number }>;
      dateRange: { start: string; end: string };
      confidenceLevels: Array<{ level: string; count: number }>;
    };
    meta: {
      totalCount: number;
      processingTime: string;
      cached: boolean;
      suggestions: string[];
    };
  } {
    // Process results for UI
    const uiResults = searchResponse.results.map(result => {
      // Generate highlighted snippet with HTML tags
      const highlightedSnippet = this.applyHighlightMarkup(
        result.snippet,
        result.highlights
      );
      
      // Determine source icon based on type
      const sourceIcon = this.getSourceIcon(result.sourceType);
      
      // Extract metadata for display
      const metadata = {
        date: result.metadata.createdAt as string || 
              result.metadata.lastModified as string ||
              undefined,
        author: result.metadata.author as string || undefined,
        tags: result.metadata.tags as string[] || undefined
      };
      
      // Determine confidence from score explanation
      const confidence = result.scoreExplanation?.confidenceLevel || 
                        this.determineConfidenceLevel(result.score, result);
      
      return {
        id: result.id,
        title: result.title,
        snippet: result.snippet,
        highlightedSnippet,
        source: result.source,
        sourceIcon,
        score: Math.round(result.score * 100),
        confidence,
        url: result.url,
        metadata
      };
    });
    
    // Generate facets for filtering
    const sourceCounts = new Map<string, number>();
    const confidenceCounts = new Map<string, number>();
    let minDate = new Date();
    let maxDate = new Date(0);
    
    searchResponse.results.forEach(result => {
      // Count sources
      const sourceType = result.sourceType;
      sourceCounts.set(sourceType, (sourceCounts.get(sourceType) || 0) + 1);
      
      // Count confidence levels
      const confidence = result.scoreExplanation?.confidenceLevel || 'medium';
      confidenceCounts.set(confidence, (confidenceCounts.get(confidence) || 0) + 1);
      
      // Track date range
      const date = result.metadata.createdAt || result.metadata.lastModified;
      if (date) {
        const d = new Date(date as string);
        if (d < minDate) minDate = d;
        if (d > maxDate) maxDate = d;
      }
    });
    
    return {
      results: uiResults,
      facets: {
        sources: Array.from(sourceCounts.entries()).map(([name, count]) => ({ name, count })),
        dateRange: {
          start: minDate.toISOString(),
          end: maxDate.toISOString()
        },
        confidenceLevels: Array.from(confidenceCounts.entries()).map(([level, count]) => ({ level, count }))
      },
      meta: {
        totalCount: searchResponse.totalCount,
        processingTime: `${searchResponse.processingTimeMs}ms`,
        cached: searchResponse.processingTimeMs < 10,
        suggestions: searchResponse.suggestions || []
      }
    };
  }
  
  private applyHighlightMarkup(text: string, highlights: string[]): string {
    let highlightedText = text;
    
    // Sort highlights by length (longest first) to avoid partial replacements
    const sortedHighlights = [...highlights].sort((a, b) => b.length - a.length);
    
    sortedHighlights.forEach(highlight => {
      const regex = new RegExp(`\\b${this.escapeRegex(highlight)}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, `<mark>$&</mark>`);
    });
    
    return highlightedText;
  }
  
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  private getSourceIcon(sourceType: 'document' | 'fact' | 'entity'): string {
    const icons = {
      document: 'file-text',
      fact: 'info-circle',
      entity: 'tag'
    };
    return icons[sourceType] || 'file';
  }

  private generateCacheKey(searchQuery: SearchQuery, context?: SearchContext): string {
    const keyData = {
      query: searchQuery.query,
      filters: searchQuery.filters,
      userId: searchQuery.userId || context?.userId,
      preferences: context?.userPreferences
    };
    
    return btoa(JSON.stringify(keyData)).replace(/[+/=]/g, '_');
  }

  private getFromCache(key: string): SearchResponse | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    // Increment hit counter
    cached.hits++;
    
    return cached.data;
  }

  private setCache(key: string, data: SearchResponse): void {
    // Implement LRU eviction if cache gets too large
    if (this.cache.size >= 1000) {
      // Find least recently used entry (lowest hits in recent time)
      let lruKey = '';
      let minScore = Infinity;
      
      for (const [k, v] of this.cache) {
        const age = Date.now() - v.timestamp;
        const score = v.hits / (age / 1000); // Hits per second
        if (score < minScore) {
          minScore = score;
          lruKey = k;
        }
      }
      
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }

  // Context management methods
  updateSearchContext(context: SearchContext, query: string): SearchContext {
    return {
      ...context,
      timestamp: Date.now(),
      previousQueries: [...context.previousQueries.slice(-4), query] // Keep last 5 queries
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export { SemanticSearchService, type SearchQuery, type SearchResult, type SearchResponse, type SearchContext, type QueryIntent, type ScoreExplanation };