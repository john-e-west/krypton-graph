import { graphCloneService } from '../services/graph-clone.service'

export interface CloneResult<T> {
  result: T
  cloneId: string
  requiresReview: boolean
}

export function cloneBeforeModify(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value
  
  descriptor.value = async function(...args: any[]) {
    const graphId = args[0]
    
    if (!graphId || typeof graphId !== 'string') {
      throw new Error('First argument must be a valid graphId')
    }
    
    const clone = await graphCloneService.cloneBeforeModify(graphId, {
      method: propertyKey,
      args: args,
      timestamp: new Date()
    })
    
    args[0] = clone.id
    const result = await originalMethod.apply(this, args)
    
    return {
      result,
      cloneId: clone.id,
      requiresReview: true
    } as CloneResult<typeof result>
  }
  
  return descriptor
}