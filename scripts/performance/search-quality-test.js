#!/usr/bin/env node

/**
 * Search Quality Test Script
 * Measures precision and recall for the semantic search implementation
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.ZEP_API_KEY || '';

// Test query set with expected relevant documents
const testQueries = [
  {
    query: 'authentication security',
    expectedRelevant: ['auth-guide.md', 'security-best-practices.md', 'login-flow.md'],
    category: 'security'
  },
  {
    query: 'how to configure database',
    expectedRelevant: ['database-config.md', 'connection-setup.md', 'env-variables.md'],
    category: 'configuration'
  },
  {
    query: 'user management',
    expectedRelevant: ['user-crud.md', 'permissions.md', 'roles-guide.md'],
    category: 'users'
  },
  {
    query: 'error handling best practices',
    expectedRelevant: ['error-handling.md', 'exception-guide.md', 'logging.md'],
    category: 'errors'
  },
  {
    query: 'api documentation',
    expectedRelevant: ['api-reference.md', 'endpoints.md', 'swagger.md'],
    category: 'api'
  },
  {
    query: 'performance optimization techniques',
    expectedRelevant: ['performance-guide.md', 'caching.md', 'optimization.md'],
    category: 'performance'
  },
  {
    query: 'what is semantic search',
    expectedRelevant: ['semantic-search.md', 'search-guide.md', 'zep-integration.md'],
    category: 'search'
  },
  {
    query: 'deployment process',
    expectedRelevant: ['deployment.md', 'ci-cd.md', 'staging.md'],
    category: 'deployment'
  },
  {
    query: 'testing strategies',
    expectedRelevant: ['testing-guide.md', 'unit-tests.md', 'integration-tests.md'],
    category: 'testing'
  },
  {
    query: 'recent updates last week',
    expectedRelevant: ['changelog.md', 'release-notes.md', 'updates.md'],
    category: 'temporal'
  }
];

// Perform search request
async function performSearch(query, limit = 20) {
  try {
    const response = await fetch(`${BASE_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        query: query,
        userId: 'quality-test',
        filters: { limit }
      })
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error searching for "${query}":`, error.message);
    return [];
  }
}

// Calculate precision: relevant results / total results
function calculatePrecision(results, expectedRelevant) {
  if (results.length === 0) return 0;
  
  const relevantFound = results.filter(result => {
    // Check if result source matches any expected document
    return expectedRelevant.some(expected => 
      result.source?.includes(expected) || 
      result.title?.includes(expected.replace('.md', ''))
    );
  }).length;
  
  return relevantFound / results.length;
}

// Calculate recall: relevant found / total relevant
function calculateRecall(results, expectedRelevant) {
  if (expectedRelevant.length === 0) return 1;
  
  const relevantFound = expectedRelevant.filter(expected => {
    return results.some(result => 
      result.source?.includes(expected) || 
      result.title?.includes(expected.replace('.md', ''))
    );
  }).length;
  
  return relevantFound / expectedRelevant.length;
}

// Calculate F1 score
function calculateF1(precision, recall) {
  if (precision + recall === 0) return 0;
  return 2 * (precision * recall) / (precision + recall);
}

// Main test execution
async function runQualityTests() {
  console.log('=== Search Quality Test ===\n');
  
  const results = {
    queries: [],
    categories: {},
    overall: {
      precision: 0,
      recall: 0,
      f1: 0,
      mrr: 0 // Mean Reciprocal Rank
    }
  };
  
  // Test each query
  for (const testCase of testQueries) {
    console.log(`Testing: "${testCase.query}"`);
    
    const searchResults = await performSearch(testCase.query);
    const precision = calculatePrecision(searchResults, testCase.expectedRelevant);
    const recall = calculateRecall(searchResults, testCase.expectedRelevant);
    const f1 = calculateF1(precision, recall);
    
    // Calculate reciprocal rank (position of first relevant result)
    let reciprocalRank = 0;
    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];
      const isRelevant = testCase.expectedRelevant.some(expected => 
        result.source?.includes(expected) || 
        result.title?.includes(expected.replace('.md', ''))
      );
      if (isRelevant) {
        reciprocalRank = 1 / (i + 1);
        break;
      }
    }
    
    const queryResult = {
      query: testCase.query,
      category: testCase.category,
      resultsCount: searchResults.length,
      precision: precision,
      recall: recall,
      f1: f1,
      reciprocalRank: reciprocalRank
    };
    
    results.queries.push(queryResult);
    
    // Aggregate by category
    if (!results.categories[testCase.category]) {
      results.categories[testCase.category] = {
        queries: 0,
        avgPrecision: 0,
        avgRecall: 0,
        avgF1: 0
      };
    }
    const cat = results.categories[testCase.category];
    cat.queries++;
    cat.avgPrecision += precision;
    cat.avgRecall += recall;
    cat.avgF1 += f1;
    
    console.log(`  Precision: ${(precision * 100).toFixed(1)}%`);
    console.log(`  Recall: ${(recall * 100).toFixed(1)}%`);
    console.log(`  F1 Score: ${(f1 * 100).toFixed(1)}%`);
    console.log(`  RR: ${reciprocalRank.toFixed(3)}\n`);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Calculate overall metrics
  const totalQueries = results.queries.length;
  results.overall.precision = results.queries.reduce((sum, q) => sum + q.precision, 0) / totalQueries;
  results.overall.recall = results.queries.reduce((sum, q) => sum + q.recall, 0) / totalQueries;
  results.overall.f1 = results.queries.reduce((sum, q) => sum + q.f1, 0) / totalQueries;
  results.overall.mrr = results.queries.reduce((sum, q) => sum + q.reciprocalRank, 0) / totalQueries;
  
  // Normalize category averages
  Object.keys(results.categories).forEach(cat => {
    const category = results.categories[cat];
    category.avgPrecision /= category.queries;
    category.avgRecall /= category.queries;
    category.avgF1 /= category.queries;
  });
  
  // Print summary
  console.log('=== Overall Results ===');
  console.log(`Average Precision: ${(results.overall.precision * 100).toFixed(1)}% (Target: >70%)`);
  console.log(`Average Recall: ${(results.overall.recall * 100).toFixed(1)}% (Target: >60%)`);
  console.log(`Average F1 Score: ${(results.overall.f1 * 100).toFixed(1)}%`);
  console.log(`Mean Reciprocal Rank: ${results.overall.mrr.toFixed(3)}`);
  
  // Print category breakdown
  console.log('\n=== Results by Category ===');
  Object.entries(results.categories).forEach(([cat, metrics]) => {
    console.log(`${cat}:`);
    console.log(`  Precision: ${(metrics.avgPrecision * 100).toFixed(1)}%`);
    console.log(`  Recall: ${(metrics.avgRecall * 100).toFixed(1)}%`);
    console.log(`  F1: ${(metrics.avgF1 * 100).toFixed(1)}%`);
  });
  
  // Determine gate status
  const passed = results.overall.precision >= 0.7 && results.overall.recall >= 0.6;
  console.log(`\n=== Gate Status ===`);
  console.log(`Quality Gate: ${passed ? 'PASS ✅' : 'FAIL ❌'}`);
  
  // Save results to file
  const fs = await import('fs').then(m => m.default);
  const outputPath = 'search-quality-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${outputPath}`);
  
  return results;
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runQualityTests()
    .then(results => {
      process.exit(results.overall.precision >= 0.7 && results.overall.recall >= 0.6 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { runQualityTests, calculatePrecision, calculateRecall, calculateF1 };