import { NextRequest, NextResponse } from 'next/server'

interface RefinementRequest {
  ontologyId: string
  currentTypes: Array<{
    id: string
    name: string
    description: string
    classifiedCount: number
  }>
  unclassifiedItems: Array<{
    id: string
    text: string
    context?: string
  }>
  currentClassificationRate: number
  targetRate?: number
}

interface RefinementSuggestion {
  id: string
  type: 'merge' | 'split' | 'attribute' | 'pattern'
  title: string
  description: string
  expectedImprovement: number
  effort: 'low' | 'medium' | 'high'
  priority: number
  affectedTypes: string[]
  details: {
    currentClassification?: number
    projectedClassification?: number
    itemsAffected?: number
    confidence?: number
  }
}

interface RefinementStep {
  id: string
  title: string
  description: string
  suggestions: RefinementSuggestion[]
  completed: boolean
}

const generateRefinementSuggestions = (
  currentTypes: RefinementRequest['currentTypes'],
  unclassifiedItems: RefinementRequest['unclassifiedItems'],
  currentRate: number
): RefinementSuggestion[] => {
  const suggestions: RefinementSuggestion[] = []

  // Suggest type merges for similar types with low classification counts
  const lowUsageTypes = currentTypes.filter(type => type.classifiedCount < 10)
  if (lowUsageTypes.length >= 2) {
    suggestions.push({
      id: 'merge-low-usage',
      type: 'merge',
      title: 'Merge Low Usage Types',
      description: `Merge ${lowUsageTypes.slice(0, 2).map(t => t.name).join(' and ')} into a single more general type to improve classification.`,
      expectedImprovement: 5 + Math.random() * 10,
      effort: 'low',
      priority: 1,
      affectedTypes: lowUsageTypes.slice(0, 2).map(t => t.name),
      details: {
        itemsAffected: lowUsageTypes.slice(0, 2).reduce((sum, t) => sum + t.classifiedCount, 0),
        confidence: 0.8,
        projectedClassification: currentRate + 7
      }
    })
  }

  // Suggest adding attributes based on unclassified patterns
  const commonWords = findCommonWords(unclassifiedItems.map(item => item.text))
  if (commonWords.length > 0) {
    suggestions.push({
      id: 'add-attributes',
      type: 'attribute',
      title: 'Add Descriptive Attributes',
      description: `Add attributes to capture common patterns like "${commonWords[0]}" found in unclassified items.`,
      expectedImprovement: 8 + Math.random() * 12,
      effort: 'medium',
      priority: 2,
      affectedTypes: currentTypes.slice(0, 2).map(t => t.name),
      details: {
        itemsAffected: Math.floor(unclassifiedItems.length * 0.3),
        confidence: 0.75,
        projectedClassification: currentRate + 10
      }
    })
  }

  // Suggest splitting over-broad types
  const highUsageType = currentTypes.find(type => type.classifiedCount > 50)
  if (highUsageType) {
    suggestions.push({
      id: 'split-broad-type',
      type: 'split',
      title: `Split Broad "${highUsageType.name}" Type`,
      description: `The ${highUsageType.name} type captures too many diverse items. Split into more specific subtypes.`,
      expectedImprovement: 10 + Math.random() * 15,
      effort: 'high',
      priority: 3,
      affectedTypes: [highUsageType.name],
      details: {
        itemsAffected: Math.floor(highUsageType.classifiedCount * 0.6),
        confidence: 0.9,
        projectedClassification: currentRate + 12
      }
    })
  }

  // Suggest pattern-based improvements
  suggestions.push({
    id: 'improve-patterns',
    type: 'pattern',
    title: 'Improve Recognition Patterns',
    description: 'Refine regex patterns and matching rules to better identify entity boundaries and types.',
    expectedImprovement: 6 + Math.random() * 8,
    effort: 'medium',
    priority: 4,
    affectedTypes: currentTypes.slice(0, 3).map(t => t.name),
    details: {
      itemsAffected: Math.floor(unclassifiedItems.length * 0.4),
      confidence: 0.7,
      projectedClassification: currentRate + 7
    }
  })

  return suggestions.sort((a, b) => b.expectedImprovement - a.expectedImprovement).slice(0, 4)
}

const findCommonWords = (texts: string[]): string[] => {
  const wordCounts: Record<string, number> = {}
  
  texts.forEach(text => {
    const words = text.toLowerCase().match(/\b\w+\b/g) || []
    words.forEach(word => {
      if (word.length > 3) { // Only consider meaningful words
        wordCounts[word] = (wordCounts[word] || 0) + 1
      }
    })
  })
  
  return Object.entries(wordCounts)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

const createRefinementSteps = (suggestions: RefinementSuggestion[]): RefinementStep[] => {
  const stepGroups: Record<string, RefinementSuggestion[]> = {
    'Quick Wins': suggestions.filter(s => s.effort === 'low'),
    'Pattern Improvements': suggestions.filter(s => s.type === 'pattern' || s.type === 'attribute'),
    'Structure Changes': suggestions.filter(s => s.type === 'merge' || s.type === 'split'),
    'Advanced Optimizations': suggestions.filter(s => s.effort === 'high')
  }

  return Object.entries(stepGroups)
    .filter(([_, suggestions]) => suggestions.length > 0)
    .map(([title, stepSuggestions], index) => ({
      id: `step-${index + 1}`,
      title,
      description: getStepDescription(title),
      suggestions: stepSuggestions,
      completed: false
    }))
}

const getStepDescription = (title: string): string => {
  const descriptions: Record<string, string> = {
    'Quick Wins': 'Start with low-effort improvements that provide immediate classification gains.',
    'Pattern Improvements': 'Enhance recognition patterns and add attributes to capture more items.',
    'Structure Changes': 'Reorganize your type hierarchy for better coverage and accuracy.',
    'Advanced Optimizations': 'Complex changes that require more effort but provide significant improvements.'
  }
  return descriptions[title] || 'Apply these refinements to improve classification.'
}

export async function POST(request: NextRequest) {
  try {
    const body: RefinementRequest = await request.json()
    const { ontologyId, currentTypes, unclassifiedItems, currentClassificationRate, targetRate = 95 } = body

    if (!ontologyId || !currentTypes || !unclassifiedItems) {
      return NextResponse.json(
        { error: 'Missing required fields: ontologyId, currentTypes, unclassifiedItems' },
        { status: 400 }
      )
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700))

    const suggestions = generateRefinementSuggestions(currentTypes, unclassifiedItems, currentClassificationRate)
    const steps = createRefinementSteps(suggestions)

    const response = {
      ontologyId,
      currentClassificationRate,
      targetRate,
      projectedImprovement: suggestions.reduce((total, s) => total + s.expectedImprovement, 0),
      steps,
      totalSuggestions: suggestions.length,
      estimatedTimeToTarget: Math.ceil(suggestions.length * 2.5), // minutes
      confidence: 0.8
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Refinement API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate refinement suggestions' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to get refinement suggestions.' },
    { status: 405 }
  )
}