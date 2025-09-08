import { useEffect, useRef } from 'react'

/**
 * Custom hook for setting up a polling mechanism
 * @param callback - Function to call at each interval
 * @param interval - Interval in milliseconds (default: 30000ms = 30 seconds)
 * @param enabled - Whether polling is enabled (default: true)
 */
export function usePolling(
  callback: () => void | Promise<void>,
  interval: number = 30000,
  enabled: boolean = true
) {
  const savedCallback = useRef(callback)
  
  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])
  
  // Set up the interval
  useEffect(() => {
    if (!enabled) {
      return
    }
    
    const tick = async () => {
      await savedCallback.current()
    }
    
    // Call immediately on mount if enabled
    tick()
    
    const id = setInterval(tick, interval)
    
    return () => clearInterval(id)
  }, [interval, enabled])
}

/**
 * Hook for polling with exponential backoff on errors
 */
export function usePollingWithBackoff(
  callback: () => Promise<void>,
  baseInterval: number = 30000,
  maxInterval: number = 300000, // 5 minutes
  enabled: boolean = true
) {
  const currentInterval = useRef(baseInterval)
  const timeoutId = useRef<NodeJS.Timeout>()
  const savedCallback = useRef(callback)
  
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])
  
  useEffect(() => {
    if (!enabled) {
      currentInterval.current = baseInterval
      return
    }
    
    const executePoll = async () => {
      try {
        await savedCallback.current()
        // Reset interval on success
        currentInterval.current = baseInterval
      } catch (error) {
        // Exponential backoff on error
        currentInterval.current = Math.min(
          currentInterval.current * 2,
          maxInterval
        )
        console.error('Polling error, backing off:', error)
      }
      
      // Schedule next poll
      if (enabled) {
        timeoutId.current = setTimeout(executePoll, currentInterval.current)
      }
    }
    
    // Start polling
    executePoll()
    
    // Cleanup
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current)
      }
      currentInterval.current = baseInterval
    }
  }, [baseInterval, maxInterval, enabled])
}