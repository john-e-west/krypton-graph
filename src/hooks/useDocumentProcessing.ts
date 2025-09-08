import { useState, useEffect, useCallback, useRef } from 'react';
import { ProcessingProgress, ProcessingJob } from '../server/queue/processor';

export interface DocumentProcessingState {
  activeJobs: Map<string, ProcessingProgress>;
  isConnected: boolean;
  error?: string;
}

export const useDocumentProcessing = () => {
  const [state, setState] = useState<DocumentProcessingState>({
    activeJobs: new Map(),
    isConnected: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'ws://localhost:5173/ws/document-processing'
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/document-processing`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
        setState(prev => ({ ...prev, isConnected: true, error: undefined }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setState(prev => ({ ...prev, isConnected: false }));

        // Attempt reconnection with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setState(prev => ({ 
            ...prev, 
            error: 'Failed to reconnect to document processing service'
          }));
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Connection error with document processing service'
        }));
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to connect to document processing service'
      }));
    }
  }, []);

  const handleWebSocketMessage = useCallback((message: any) => {
    const { type, data } = message;

    setState(prev => {
      const newActiveJobs = new Map(prev.activeJobs);

      switch (type) {
        case 'job-queued':
        case 'job-started':
        case 'job-progress':
        case 'chunk-processed':
          newActiveJobs.set(data.jobId, data as ProcessingProgress);
          break;

        case 'job-completed':
        case 'job-failed':
        case 'job-cancelled':
          // Keep completed/failed jobs for a short time for user feedback
          newActiveJobs.set(data.jobId, data as ProcessingProgress);
          setTimeout(() => {
            setState(current => {
              const updatedJobs = new Map(current.activeJobs);
              updatedJobs.delete(data.jobId);
              return { ...current, activeJobs: updatedJobs };
            });
          }, 10000); // Remove after 10 seconds
          break;

        case 'job-retried':
          newActiveJobs.set(data.jobId, data as ProcessingProgress);
          break;

        default:
          console.warn('Unknown WebSocket message type:', type);
      }

      return { ...prev, activeJobs: newActiveJobs };
    });
  }, []);

  const startDocumentProcessing = useCallback(async (
    jobData: Omit<ProcessingJob, 'id'>
  ): Promise<string | null> => {
    try {
      const response = await fetch('/api/document-processing/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...jobData,
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { jobId } = await response.json();
      return jobId;
    } catch (error) {
      console.error('Failed to start document processing:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to start document processing'
      }));
      return null;
    }
  }, []);

  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/document-processing/cancel/${jobId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { success } = await response.json();
      return success;
    } catch (error) {
      console.error('Failed to cancel job:', error);
      return false;
    }
  }, []);

  const retryJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/document-processing/retry/${jobId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { success } = await response.json();
      return success;
    } catch (error) {
      console.error('Failed to retry job:', error);
      return false;
    }
  }, []);

  const getQueueStats = useCallback(async () => {
    try {
      const response = await fetch('/api/document-processing/stats');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch queue stats:', error);
      return null;
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Helper methods
  const getJobProgress = useCallback((jobId: string): ProcessingProgress | null => {
    return state.activeJobs.get(jobId) || null;
  }, [state.activeJobs]);

  const getActiveJobs = useCallback((): ProcessingProgress[] => {
    return Array.from(state.activeJobs.values()).filter(
      job => job.status === 'queued' || job.status === 'processing'
    );
  }, [state.activeJobs]);

  const getCompletedJobs = useCallback((): ProcessingProgress[] => {
    return Array.from(state.activeJobs.values()).filter(
      job => job.status === 'completed'
    );
  }, [state.activeJobs]);

  const getFailedJobs = useCallback((): ProcessingProgress[] => {
    return Array.from(state.activeJobs.values()).filter(
      job => job.status === 'failed'
    );
  }, [state.activeJobs]);

  const formatTimeRemaining = useCallback((seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }, []);

  const getProgressPercentage = useCallback((progress: ProcessingProgress): number => {
    if (progress.totalChunks === 0) return 0;
    return Math.floor((progress.processedChunks / progress.totalChunks) * 100);
  }, []);

  return {
    // State
    activeJobs: state.activeJobs,
    isConnected: state.isConnected,
    error: state.error,

    // Actions
    startDocumentProcessing,
    cancelJob,
    retryJob,
    getQueueStats,

    // Getters
    getJobProgress,
    getActiveJobs,
    getCompletedJobs,
    getFailedJobs,

    // Utilities
    formatTimeRemaining,
    getProgressPercentage,

    // Connection management
    reconnect: connect,
  };
};