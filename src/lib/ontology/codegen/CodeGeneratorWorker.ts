// Web Worker for handling large ontology code generation
// This worker runs in a separate thread to prevent UI blocking

import { OntologyCodeGenerator, GenerationOptions, GeneratedCode } from './OntologyCodeGenerator'
import { OntologyRecord, EntityDefinitionRecord, EdgeDefinitionRecord } from '../../types/airtable'

export interface WorkerMessage {
  type: 'generate' | 'cancel'
  id: string
  data?: {
    ontology: OntologyRecord
    entities: EntityDefinitionRecord[]
    edges: EdgeDefinitionRecord[]
    options?: GenerationOptions
  }
}

export interface WorkerResponse {
  type: 'result' | 'error' | 'progress'
  id: string
  data?: GeneratedCode
  error?: string
  progress?: number
}

// Worker implementation
if (typeof self !== 'undefined') {
  let currentTask: AbortController | null = null

  self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
    const { type, id, data } = event.data

    if (type === 'cancel' && currentTask) {
      currentTask.abort()
      currentTask = null
      self.postMessage({
        type: 'error',
        id,
        error: 'Task cancelled'
      } as WorkerResponse)
      return
    }

    if (type === 'generate' && data) {
      currentTask = new AbortController()
      
      try {
        // Send progress update
        self.postMessage({
          type: 'progress',
          id,
          progress: 10
        } as WorkerResponse)

        const generator = new OntologyCodeGenerator(
          data.ontology,
          data.entities,
          data.edges
        )

        // Check if cancelled
        if (currentTask.signal.aborted) {
          throw new Error('Task cancelled')
        }

        // Send progress update
        self.postMessage({
          type: 'progress',
          id,
          progress: 50
        } as WorkerResponse)

        const result = await generator.generate(data.options || {})

        // Check if cancelled
        if (currentTask.signal.aborted) {
          throw new Error('Task cancelled')
        }

        // Send progress update
        self.postMessage({
          type: 'progress',
          id,
          progress: 90
        } as WorkerResponse)

        // Send result
        self.postMessage({
          type: 'result',
          id,
          data: result
        } as WorkerResponse)

      } catch (error) {
        self.postMessage({
          type: 'error',
          id,
          error: error instanceof Error ? error.message : 'Generation failed'
        } as WorkerResponse)
      } finally {
        currentTask = null
      }
    }
  })
}

// Manager class for using the worker from the main thread
export class CodeGeneratorWorkerManager {
  private worker: Worker | null = null
  private pendingTasks = new Map<string, {
    resolve: (value: GeneratedCode) => void
    reject: (error: Error) => void
  }>()
  private taskIdCounter = 0

  constructor() {
    this.initWorker()
  }

  private initWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        // Create worker from the same file
        const workerUrl = new URL('./CodeGeneratorWorker.ts', import.meta.url)
        this.worker = new Worker(workerUrl, { type: 'module' })
        
        this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(event.data)
        })

        this.worker.addEventListener('error', (error) => {
          console.error('Worker error:', error)
          // Reject all pending tasks
          for (const [_id, task] of this.pendingTasks) {
            task.reject(new Error('Worker error: ' + error.message))
          }
          this.pendingTasks.clear()
        })
      } catch (error) {
        console.warn('Web Worker not available, falling back to main thread', error)
        this.worker = null
      }
    }
  }

  private handleWorkerMessage(response: WorkerResponse): void {
    const task = this.pendingTasks.get(response.id)
    if (!task) return

    switch (response.type) {
      case 'result':
        if (response.data) {
          task.resolve(response.data)
          this.pendingTasks.delete(response.id)
        }
        break
      
      case 'error':
        task.reject(new Error(response.error || 'Unknown error'))
        this.pendingTasks.delete(response.id)
        break
      
      case 'progress':
        // Could emit progress events here if needed
        console.log(`Task ${response.id} progress: ${response.progress}%`)
        break
    }
  }

  async generate(
    ontology: OntologyRecord,
    entities: EntityDefinitionRecord[],
    edges: EdgeDefinitionRecord[],
    options?: GenerationOptions
  ): Promise<GeneratedCode> {
    // Use worker if available and ontology is large
    const isLarge = entities.length > 50 || edges.length > 100
    
    if (this.worker && isLarge) {
      return this.generateWithWorker(ontology, entities, edges, options)
    } else {
      // Fallback to main thread for small ontologies or if worker unavailable
      return this.generateOnMainThread(ontology, entities, edges, options)
    }
  }

  private async generateWithWorker(
    ontology: OntologyRecord,
    entities: EntityDefinitionRecord[],
    edges: EdgeDefinitionRecord[],
    options?: GenerationOptions
  ): Promise<GeneratedCode> {
    if (!this.worker) {
      throw new Error('Worker not available')
    }

    const taskId = `task-${++this.taskIdCounter}`
    
    return new Promise((resolve, reject) => {
      this.pendingTasks.set(taskId, { resolve, reject })
      
      this.worker!.postMessage({
        type: 'generate',
        id: taskId,
        data: {
          ontology,
          entities,
          edges,
          options
        }
      } as WorkerMessage)
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingTasks.has(taskId)) {
          this.pendingTasks.delete(taskId)
          reject(new Error('Generation timeout'))
        }
      }, 30000)
    })
  }

  private async generateOnMainThread(
    ontology: OntologyRecord,
    entities: EntityDefinitionRecord[],
    edges: EdgeDefinitionRecord[],
    options?: GenerationOptions
  ): Promise<GeneratedCode> {
    const generator = new OntologyCodeGenerator(ontology, entities, edges)
    return generator.generate(options)
  }

  cancelTask(_taskId: string): void {
    if (this.worker && this.pendingTasks.has(_taskId)) {
      this.worker.postMessage({
        type: 'cancel',
        id: _taskId
      } as WorkerMessage)
    }
  }

  dispose(): void {
    if (this.worker) {
      // Cancel all pending tasks
      for (const [_id, task] of this.pendingTasks) {
        task.reject(new Error('Worker disposed'))
      }
      this.pendingTasks.clear()
      
      // Terminate worker
      this.worker.terminate()
      this.worker = null
    }
  }
}