export * from './client';
export * from './rate-limiter';
export * from './episode-manager';
export * from './types';
export * from './errors';

// Convenience export for singleton instance
import { ZepClientWrapper } from './client';
import type { ZepConfig } from './types';

export function getZepClient(config?: ZepConfig): ZepClientWrapper {
  const apiKey = config?.apiKey || process.env.ZEP_API_KEY;
  const projectId = config?.projectId || process.env.ZEP_PROJECT_ID;
  
  if (!apiKey) {
    throw new Error('ZEP_API_KEY is required');
  }
  
  return ZepClientWrapper.getInstance({
    apiKey,
    projectId,
    ...config
  });
}