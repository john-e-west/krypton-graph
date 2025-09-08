import { Annotation } from '../types/review'
import { v4 as uuidv4 } from 'uuid'

const generateId = () => uuidv4()
const currentUser = { id: 'current-user-id' } // Placeholder for auth

export class AnnotationManager {
  private annotations: Map<string, Annotation[]> = new Map()

  addAnnotation(
    changeId: string,
    text: string,
    type: Annotation['type'] = 'comment'
  ): Annotation {
    const annotation: Annotation = {
      id: generateId(),
      changeId,
      text,
      author: currentUser.id,
      timestamp: new Date(),
      type
    }

    const changeAnnotations = this.annotations.get(changeId) || []
    changeAnnotations.push(annotation)
    this.annotations.set(changeId, changeAnnotations)

    // Persist annotation
    this.persistAnnotation(annotation)

    return annotation
  }

  replyToAnnotation(
    parentId: string,
    text: string
  ): Annotation {
    // Find parent annotation
    for (const [changeId, annotations] of this.annotations) {
      const parent = annotations.find(a => a.id === parentId)
      if (parent) {
        const reply: Annotation = {
          id: generateId(),
          changeId,
          text,
          author: currentUser.id,
          timestamp: new Date(),
          type: 'comment'
        }

        parent.replies = parent.replies || []
        parent.replies.push(reply)

        // Persist the updated parent annotation
        this.persistAnnotation(parent)

        return reply
      }
    }

    throw new Error('Parent annotation not found')
  }

  getAnnotations(changeId: string): Annotation[] {
    return this.annotations.get(changeId) || []
  }

  getAllAnnotations(): Map<string, Annotation[]> {
    return new Map(this.annotations)
  }

  updateAnnotation(annotationId: string, text: string): Annotation {
    for (const [changeId, annotations] of this.annotations) {
      const annotation = annotations.find(a => a.id === annotationId)
      if (annotation) {
        annotation.text = text
        annotation.timestamp = new Date() // Update timestamp
        
        // Persist the updated annotation
        this.persistAnnotation(annotation)
        
        return annotation
      }

      // Check replies
      for (const ann of annotations) {
        if (ann.replies) {
          const reply = ann.replies.find(r => r.id === annotationId)
          if (reply) {
            reply.text = text
            reply.timestamp = new Date()
            
            // Persist the parent annotation (which contains the reply)
            this.persistAnnotation(ann)
            
            return reply
          }
        }
      }
    }

    throw new Error('Annotation not found')
  }

  deleteAnnotation(annotationId: string): boolean {
    for (const [changeId, annotations] of this.annotations) {
      const index = annotations.findIndex(a => a.id === annotationId)
      if (index !== -1) {
        annotations.splice(index, 1)
        
        // Update the map
        if (annotations.length === 0) {
          this.annotations.delete(changeId)
        } else {
          this.annotations.set(changeId, annotations)
        }
        
        // Persist the change
        this.persistAnnotationDeletion(changeId, annotationId)
        
        return true
      }

      // Check replies
      for (const annotation of annotations) {
        if (annotation.replies) {
          const replyIndex = annotation.replies.findIndex(r => r.id === annotationId)
          if (replyIndex !== -1) {
            annotation.replies.splice(replyIndex, 1)
            
            // Persist the updated parent annotation
            this.persistAnnotation(annotation)
            
            return true
          }
        }
      }
    }

    return false
  }

  searchAnnotations(query: string): Annotation[] {
    const results: Annotation[] = []
    const lowercaseQuery = query.toLowerCase()

    for (const annotations of this.annotations.values()) {
      for (const annotation of annotations) {
        if (annotation.text.toLowerCase().includes(lowercaseQuery) ||
            annotation.author.toLowerCase().includes(lowercaseQuery)) {
          results.push(annotation)
        }

        // Search in replies
        if (annotation.replies) {
          for (const reply of annotation.replies) {
            if (reply.text.toLowerCase().includes(lowercaseQuery) ||
                reply.author.toLowerCase().includes(lowercaseQuery)) {
              results.push(reply)
            }
          }
        }
      }
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getAnnotationsByAuthor(author: string): Annotation[] {
    const results: Annotation[] = []

    for (const annotations of this.annotations.values()) {
      for (const annotation of annotations) {
        if (annotation.author === author) {
          results.push(annotation)
        }

        // Check replies
        if (annotation.replies) {
          for (const reply of annotation.replies) {
            if (reply.author === author) {
              results.push(reply)
            }
          }
        }
      }
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getAnnotationsByType(type: Annotation['type']): Annotation[] {
    const results: Annotation[] = []

    for (const annotations of this.annotations.values()) {
      for (const annotation of annotations) {
        if (annotation.type === type) {
          results.push(annotation)
        }

        // Note: replies are always type 'comment', so we don't need to check them for other types
      }
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getRecentAnnotations(limit: number = 10): Annotation[] {
    const allAnnotations: Annotation[] = []

    for (const annotations of this.annotations.values()) {
      allAnnotations.push(...annotations)
      
      // Add replies
      for (const annotation of annotations) {
        if (annotation.replies) {
          allAnnotations.push(...annotation.replies)
        }
      }
    }

    return allAnnotations
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  getAnnotationCount(): number {
    let count = 0

    for (const annotations of this.annotations.values()) {
      count += annotations.length
      
      // Count replies
      for (const annotation of annotations) {
        if (annotation.replies) {
          count += annotation.replies.length
        }
      }
    }

    return count
  }

  getAnnotationStats(): {
    totalAnnotations: number
    byType: Record<Annotation['type'], number>
    byAuthor: Record<string, number>
    avgPerChange: number
  } {
    const totalAnnotations = this.getAnnotationCount()
    const byType: Record<Annotation['type'], number> = {
      comment: 0,
      concern: 0,
      approval: 0
    }
    const byAuthor: Record<string, number> = {}

    for (const annotations of this.annotations.values()) {
      for (const annotation of annotations) {
        byType[annotation.type]++
        byAuthor[annotation.author] = (byAuthor[annotation.author] || 0) + 1

        // Count replies
        if (annotation.replies) {
          for (const reply of annotation.replies) {
            byType.comment++ // All replies are comments
            byAuthor[reply.author] = (byAuthor[reply.author] || 0) + 1
          }
        }
      }
    }

    const avgPerChange = this.annotations.size > 0 ? 
      totalAnnotations / this.annotations.size : 0

    return {
      totalAnnotations,
      byType,
      byAuthor,
      avgPerChange: Math.round(avgPerChange * 100) / 100
    }
  }

  // Import/Export functionality
  exportAnnotations(): string {
    const data = {
      exportDate: new Date().toISOString(),
      annotationCount: this.getAnnotationCount(),
      annotations: Object.fromEntries(this.annotations)
    }

    return JSON.stringify(data, null, 2)
  }

  importAnnotations(data: string): void {
    try {
      const parsed = JSON.parse(data)
      
      if (!parsed.annotations || typeof parsed.annotations !== 'object') {
        throw new Error('Invalid annotation data format')
      }

      // Validate structure
      for (const [changeId, annotations] of Object.entries(parsed.annotations)) {
        if (!Array.isArray(annotations)) {
          throw new Error(`Invalid annotations for change ${changeId}`)
        }

        for (const annotation of annotations as any[]) {
          if (!annotation.id || !annotation.text || !annotation.author || !annotation.timestamp) {
            throw new Error('Invalid annotation structure')
          }
        }
      }

      // Clear existing and import new
      this.annotations = new Map(Object.entries(parsed.annotations))
      
      console.log(`Imported annotations for ${this.annotations.size} changes`)
    } catch (error) {
      throw new Error(`Failed to import annotations: ${error}`)
    }
  }

  private persistAnnotation(annotation: Annotation): void {
    try {
      // TODO: Persist to actual backend
      console.log('Persisting annotation:', annotation.id)
      
      // For now, store in localStorage
      const stored = localStorage.getItem('annotations')
      const data = stored ? JSON.parse(stored) : {}
      
      if (!data[annotation.changeId]) {
        data[annotation.changeId] = []
      }
      
      // Update or add annotation
      const existingIndex = data[annotation.changeId].findIndex(
        (a: Annotation) => a.id === annotation.id
      )
      
      if (existingIndex !== -1) {
        data[annotation.changeId][existingIndex] = annotation
      } else {
        data[annotation.changeId].push(annotation)
      }
      
      localStorage.setItem('annotations', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to persist annotation:', error)
    }
  }

  private persistAnnotationDeletion(changeId: string, annotationId: string): void {
    try {
      const stored = localStorage.getItem('annotations')
      if (!stored) return
      
      const data = JSON.parse(stored)
      
      if (data[changeId]) {
        data[changeId] = data[changeId].filter(
          (a: Annotation) => a.id !== annotationId
        )
        
        if (data[changeId].length === 0) {
          delete data[changeId]
        }
      }
      
      localStorage.setItem('annotations', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to persist annotation deletion:', error)
    }
  }

  // Load annotations from storage on initialization
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('annotations')
      if (stored) {
        const data = JSON.parse(stored)
        this.annotations = new Map(Object.entries(data))
        console.log(`Loaded annotations for ${this.annotations.size} changes`)
      }
    } catch (error) {
      console.error('Failed to load annotations from storage:', error)
    }
  }

  // Clear all annotations - useful for testing
  clearAll(): void {
    this.annotations.clear()
    try {
      localStorage.removeItem('annotations')
    } catch (error) {
      console.error('Failed to clear annotations from storage:', error)
    }
  }
}