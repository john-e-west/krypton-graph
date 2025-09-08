import { RateLimiterOptions } from './types';

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private queue: Array<() => void> = [];
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.burstSize || options.requestsPerMinute;
    this.tokens = this.maxTokens;
    this.refillRate = options.requestsPerMinute / 60000; // tokens per millisecond
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;

    this.refillTokens();
    this.updateMetrics();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      this.requestCount++;
      const resolve = this.queue.shift();
      if (resolve) resolve();
      
      // Log when approaching limits
      const usageRatio = this.getCurrentUsage() / this.maxTokens;
      if (usageRatio > 0.8) {
        console.warn(`Rate limit warning: ${Math.round(usageRatio * 100)}% of limit used`);
      }
      
      // Process next item immediately if we have tokens
      if (this.tokens >= 1 && this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 0);
      }
    } else {
      // Calculate wait time until next token
      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
      setTimeout(() => this.processQueue(), waitTime);
    }
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private updateMetrics(): void {
    const now = Date.now();
    // Reset metrics every minute
    if (now - this.windowStart > 60000) {
      this.requestCount = 0;
      this.windowStart = now;
    }
  }

  getCurrentUsage(): number {
    return this.maxTokens - this.tokens;
  }

  getMetrics() {
    return {
      currentUsage: this.getCurrentUsage(),
      limit: this.maxTokens,
      usageRatio: this.getCurrentUsage() / this.maxTokens,
      queueLength: this.queue.length,
      requestCount: this.requestCount
    };
  }

  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.queue = [];
    this.requestCount = 0;
    this.windowStart = Date.now();
  }
}