import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cloneBeforeModify } from '../clone-before-modify.decorator'
import { graphCloneService } from '../../services/graph-clone.service'

vi.mock('../../services/graph-clone.service', () => ({
  graphCloneService: {
    cloneBeforeModify: vi.fn()
  }
}))

describe('cloneBeforeModify decorator', () => {
  let instance: any
  
  beforeEach(() => {
    class TestClass {
      async testMethod(graphId: string, data: any) {
        return { graphId, data, success: true }
      }
      
      async anotherMethod(graphId: string, param1: string, param2: number) {
        return { graphId, param1, param2 }
      }
    }
    
    TestClass.prototype.testMethod = cloneBeforeModify(
      TestClass.prototype,
      'testMethod',
      Object.getOwnPropertyDescriptor(TestClass.prototype, 'testMethod')!
    ).value
    
    TestClass.prototype.anotherMethod = cloneBeforeModify(
      TestClass.prototype,
      'anotherMethod',
      Object.getOwnPropertyDescriptor(TestClass.prototype, 'anotherMethod')!
    ).value
    
    instance = new TestClass()
    vi.clearAllMocks()
  })
  
  it('should intercept method and create clone', async () => {
    const mockClone = {
      id: 'clone-123',
      parentGraphId: 'graph-123',
      status: 'active',
      createdAt: new Date(),
      operations: [],
      ttl: 86400,
      size: { entities: 0, edges: 0, bytes: 0 },
      entities: [],
      edges: [],
      isStale: () => false,
      registerOperation: vi.fn()
    }
    
    vi.mocked(graphCloneService.cloneBeforeModify).mockResolvedValue(mockClone)
    
    const result = await instance.testMethod('graph-123', { test: 'data' })
    
    expect(graphCloneService.cloneBeforeModify).toHaveBeenCalledWith(
      'graph-123',
      expect.objectContaining({
        method: 'testMethod'
      })
    )
    
    expect(result).toEqual({
      result: {
        graphId: 'clone-123',
        data: { test: 'data' },
        success: true
      },
      cloneId: 'clone-123',
      requiresReview: true
    })
  })
  
  it('should pass clone id as first argument to original method', async () => {
    const mockClone = {
      id: 'clone-456',
      parentGraphId: 'graph-456',
      status: 'active',
      createdAt: new Date(),
      operations: [],
      ttl: 86400,
      size: { entities: 0, edges: 0, bytes: 0 },
      entities: [],
      edges: [],
      isStale: () => false,
      registerOperation: vi.fn()
    }
    
    vi.mocked(graphCloneService.cloneBeforeModify).mockResolvedValue(mockClone)
    
    const result = await instance.anotherMethod('graph-456', 'param', 42)
    
    expect(result.result.graphId).toBe('clone-456')
    expect(result.result.param1).toBe('param')
    expect(result.result.param2).toBe(42)
  })
  
  it('should throw error if graphId is invalid', async () => {
    await expect(instance.testMethod(null as any, {})).rejects.toThrow(
      'First argument must be a valid graphId'
    )
    
    await expect(instance.testMethod(123 as any, {})).rejects.toThrow(
      'First argument must be a valid graphId'
    )
  })
  
  it('should preserve method context', async () => {
    class ContextTest {
      private value = 'test-value'
      
      async methodWithContext(graphId: string) {
        return { graphId, value: this.value }
      }
    }
    
    ContextTest.prototype.methodWithContext = cloneBeforeModify(
      ContextTest.prototype,
      'methodWithContext',
      Object.getOwnPropertyDescriptor(ContextTest.prototype, 'methodWithContext')!
    ).value
    
    const mockClone = {
      id: 'clone-context',
      parentGraphId: 'graph-context',
      status: 'active',
      createdAt: new Date(),
      operations: [],
      ttl: 86400,
      size: { entities: 0, edges: 0, bytes: 0 },
      entities: [],
      edges: [],
      isStale: () => false,
      registerOperation: vi.fn()
    }
    
    vi.mocked(graphCloneService.cloneBeforeModify).mockResolvedValue(mockClone)
    
    const contextInstance = new ContextTest()
    const result = await contextInstance.methodWithContext('graph-context')
    
    expect(result.result.value).toBe('test-value')
  })
})