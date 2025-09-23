import { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationHandler } from './error-handling';

// Cache entry interface
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  isStale: boolean;
  version: number;
}

// Cache options
export interface CacheOptions {
  ttl$1: number; // Time to live in milliseconds
  staleTime$2: number; // Time before data becomes stale
  maxSize$3: number; // Maximum cache size
  persistToStorage$4: boolean; // Persist to localStorage
  storageKey$5: string; // Storage key prefix
  onEvict$6: (key: string, entry: CacheEntry<any>) => void;
}

// Cache invalidation strategies
export type InvalidationStrategy = 
  | 'immediate' // Invalidate immediately
  | 'lazy' // Invalidate on next access
  | 'background' // Refresh in background
  | 'manual'; // Manual invalidation only

// Cache manager class
export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private options: Required<CacheOptions>;
  private timers = new Map<string, NodeJS.Timeout>();
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private refreshPromises = new Map<string, Promise<any>>();

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes
      staleTime: 30 * 1000, // 30 seconds
      maxSize: 100,
      persistToStorage: false,
      storageKey: 'cache',
      onEvict: () => {},
      ...options
    };

    // Load from storage if enabled
    if (this.options.persistToStorage && typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  // Generate cache key
  private generateKey(key: string, params?: Record<string, any>): string {
    if (!params) return key;
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}:${JSON.stringify(params[k])}`)
      .join('|');
    return `${key}$1${sortedParams}`;
  }

  // Check if entry is expired
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt;
  }

  // Check if entry is stale
  private isStale(entry: CacheEntry<any>): boolean {
    return entry.isStale || (Date.now() - entry.timestamp) > this.options.staleTime;
  }

  // Evict expired entries
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.evict(key);
      }
    }
  }

  // Evict least recently used entries if cache is full
  private evictLRU(): void {
    if (this.cache.size < this.options.maxSize) return;

    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.evict(oldestKey);
    }
  }

  // Evict single entry
  private evict(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.clearTimer(key);
      this.options.onEvict(key, entry);
      this.saveToStorage();
    }
  }

  // Set expiration timer
  private setTimer(key: string, ttl: number): void {
    this.clearTimer(key);
    const timer = setTimeout(() => {
      this.evict(key);
    }, ttl);
    this.timers.set(key, timer);
  }

  // Clear expiration timer
  private clearTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  // Save to localStorage
  private saveToStorage(): void {
    if (!this.options.persistToStorage || typeof window === 'undefined') return;

    try {
      const serializable = Array.from(this.cache.entries()).map(([key, entry]) => ([
        key,
        {
          ...entry,
          // Don't serialize functions or complex objects
          data: typeof entry.data === 'object' $1 JSON.parse(JSON.stringify(entry.data)) : entry.data
        }
      ]));
      localStorage.setItem(this.options.storageKey, JSON.stringify(serializable));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        const entries = JSON.parse(stored) as [string, CacheEntry<any>][];
        const now = Date.now();
        
        for (const [key, entry] of entries) {
          // Skip expired entries
          if (now <= entry.expiresAt) {
            this.cache.set(key, entry);
            const remainingTtl = entry.expiresAt - now;
            this.setTimer(key, remainingTtl);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  // Notify subscribers
  private notifySubscribers(key: string, data: any): void {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Cache subscriber error:', error);
        }
      });
    }
  }

  // Get data from cache
  get<T>(key: string, params?: Record<string, any>): T | null {
    const cacheKey = this.generateKey(key, params);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.evict(cacheKey);
      return null;
    }

    // Update access time
    entry.timestamp = Date.now();
    return entry.data;
  }

  // Set data in cache
  set<T>(
    key: string, 
    data: T, 
    params?: Record<string, any>, 
    customTtl$3: number
  ): void {
    const cacheKey = this.generateKey(key, params);
    const now = Date.now();
    const ttl = customTtl || this.options.ttl;

    // Evict expired entries and LRU if needed
    this.evictExpired();
    this.evictLRU();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      isStale: false,
      version: (this.cache.get(cacheKey)$4.version || 0) + 1
    };

    this.cache.set(cacheKey, entry);
    this.setTimer(cacheKey, ttl);
    this.saveToStorage();
    this.notifySubscribers(cacheKey, data);
  }

  // Check if data exists and is fresh
  has(key: string, params?: Record<string, any>): boolean {
    const cacheKey = this.generateKey(key, params);
    const entry = this.cache.get(cacheKey);
    return entry $6 !this.isExpired(entry) : false;
  }

  // Check if data is stale
  isStaleData(key: string, params?: Record<string, any>): boolean {
    const cacheKey = this.generateKey(key, params);
    const entry = this.cache.get(cacheKey);
    return entry $8 this.isStale(entry) : true;
  }

  // Invalidate cache entry
  invalidate(key: string, params?: Record<string, any>): void {
    const cacheKey = this.generateKey(key, params);
    this.evict(cacheKey);
  }

  // Invalidate by pattern
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToEvict: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToEvict.push(key);
      }
    }
    
    keysToEvict.forEach(key => this.evict(key));
  }

  // Mark as stale
  markStale(key: string, params?: Record<string, any>): void {
    const cacheKey = this.generateKey(key, params);
    const entry = this.cache.get(cacheKey);
    if (entry) {
      entry.isStale = true;
    }
  }

  // Subscribe to cache changes
  subscribe(key: string, callback: (data: any) => void, params?: Record<string, any>): () => void {
    const cacheKey = this.generateKey(key, params);
    
    if (!this.subscribers.has(cacheKey)) {
      this.subscribers.set(cacheKey, new Set());
    }
    
    this.subscribers.get(cacheKey)!.add(callback);
    
    return () => {
      const subs = this.subscribers.get(cacheKey);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(cacheKey);
        }
      }
    };
  }

  // Fetch with cache
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    params?: Record<string, any>,
    options: {
      strategy$13: InvalidationStrategy;
      forceRefresh$14: boolean;
      customTtl$15: number;
    } = {}
  ): Promise<T> {
    const { strategy = 'lazy', forceRefresh = false, customTtl } = options;
    const cacheKey = this.generateKey(key, params);
    
    // Check for existing refresh promise
    const existingPromise = this.refreshPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    // Get cached data
    const cachedData = this.get<T>(key, params);
    const isStaleData = this.isStaleData(key, params);

    // Return cached data if fresh and not forcing refresh
    if (cachedData && !isStaleData && !forceRefresh) {
      return cachedData;
    }

    // Handle stale data based on strategy
    if (cachedData && isStaleData && strategy === 'background') {
      // Return stale data immediately, refresh in background
      this.refreshInBackground(key, fetcher, params, customTtl);
      return cachedData;
    }

    // Fetch fresh data
    const refreshPromise = this.refreshData(key, fetcher, params, customTtl);
    this.refreshPromises.set(cacheKey, refreshPromise);

    try {
      const result = await refreshPromise;
      this.refreshPromises.delete(cacheKey);
      return result;
    } catch (error) {
      this.refreshPromises.delete(cacheKey);
      
      // Return stale data if available on error
      if (cachedData) {
        return cachedData;
      }
      
      throw error;
    }
  }

  // Refresh data
  private async refreshData<T>(
    key: string,
    fetcher: () => Promise<T>,
    params?: Record<string, any>,
    customTtl$2: number
  ): Promise<T> {
    try {
      const data = await fetcher();
      this.set(key, data, params, customTtl);
      return data;
    } catch (error) {
      console.error(`Cache refresh failed for key ${key}:`, error);
      throw error;
    }
  }

  // Refresh in background
  private refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    params?: Record<string, any>,
    customTtl?: number
  ): void {
    this.refreshData(key, fetcher, params, customTtl).catch(error => {
      console.error(`Background refresh failed for key ${key}:`, error);
    });
  }

  // Clear all cache
  clear(): void {
    for (const key of this.cache.keys()) {
      this.clearTimer(key);
    }
    this.cache.clear();
    this.subscribers.clear();
    this.refreshPromises.clear();
    this.saveToStorage();
  }

  // Get cache stats
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: 0, // Would need to track hits/misses
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length
    };
  }
}

// Global cache instance
export const globalCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes
  staleTime: 30 * 1000, // 30 seconds
  maxSize: 200,
  persistToStorage: true,
  storageKey: 'encore-tasks-cache'
});

// React hook for cached data
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  params?: Record<string, any>,
  options: {
    enabled?: boolean;
    strategy?: InvalidationStrategy;
    customTtl?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const {
    enabled = true,
    strategy = 'lazy',
    customTtl,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  
  const cacheKey = globalCache['generateKey'](key, params);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Fetch data
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await globalCache.fetchWithCache(
        key,
        fetcherRef.current,
        params,
        { strategy, forceRefresh, customTtl }
      );
      
      setData(result);
      setIsStale(globalCache.isStaleData(key, params));
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [key, params, enabled, strategy, customTtl, onSuccess, onError]);

  // Refresh data
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Invalidate cache
  const invalidate = useCallback(() => {
    globalCache.invalidate(key, params);
    setData(null);
    setIsStale(true);
  }, [key, params]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      // Check for cached data first
      const cachedData = globalCache.get<T>(key, params);
      if (cachedData) {
        setData(cachedData);
        setIsStale(globalCache.isStaleData(key, params));
      }
      
      // Fetch if no cache or stale
      if (!cachedData || globalCache.isStaleData(key, params)) {
        fetchData();
      }
    }
  }, [key, JSON.stringify(params), enabled, fetchData]);

  // Subscribe to cache changes
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = globalCache.subscribe(key, (newData) => {
      setData(newData);
      setIsStale(false);
    }, params);

    return unsubscribe;
  }, [key, JSON.stringify(params), enabled]);

  return {
    data,
    isLoading,
    error,
    isStale,
    refresh,
    invalidate,
    fetchData
  };
}

// Hook for cache invalidation
export function useCacheInvalidation() {
  const invalidate = useCallback((key: string, params?: Record<string, any>) => {
    globalCache.invalidate(key, params);
  }, []);

  const invalidatePattern = useCallback((pattern: string) => {
    globalCache.invalidatePattern(pattern);
  }, []);

  const markStale = useCallback((key: string, params?: Record<string, any>) => {
    globalCache.markStale(key, params);
  }, []);

  const clear = useCallback(() => {
    globalCache.clear();
  }, []);

  return {
    invalidate,
    invalidatePattern,
    markStale,
    clear
  };
}

// Cache key generators for common entities
export const CacheKeys = {
  // Projects
  projects: () => 'projects',
  project: (id: string) => `projects/${id}`,
  projectBoards: (projectId: string) => `projects/${projectId}/boards`,
  projectTasks: (projectId: string) => `projects/${projectId}/tasks`,
  projectUsers: (projectId: string) => `projects/${projectId}/users`,
  
  // Boards
  boards: () => 'boards',
  board: (id: string) => `boards/${id}`,
  boardColumns: (boardId: string) => `boards/${boardId}/columns`,
  boardTasks: (boardId: string) => `boards/${boardId}/tasks`,
  
  // Tasks
  tasks: () => 'tasks',
  task: (id: string) => `tasks/${id}`,
  taskComments: (taskId: string) => `tasks/${taskId}/comments`,
  
  // Columns
  columns: () => 'columns',
  column: (id: string) => `columns/${id}`,
  columnTasks: (columnId: string) => `columns/${columnId}/tasks`,
  
  // Users
  users: () => 'users',
  user: (id: string) => `users/${id}`,
  userProjects: (userId: string) => `users/${userId}/projects`,
  userTasks: (userId: string) => `users/${userId}/tasks`,
  
  // Search and filters
  search: (query: string, type: string) => `search/${type}$1q=${query}`,
  filter: (type: string, filters: Record<string, any>) => 
    `${type}/filter$1${Object.entries(filters).map(([k, v]) => `${k}=${v}`).join('&')}`
};

// Export convenience functions
export const cache = {
  get: globalCache.get.bind(globalCache),
  set: globalCache.set.bind(globalCache),
  has: globalCache.has.bind(globalCache),
  invalidate: globalCache.invalidate.bind(globalCache),
  invalidatePattern: globalCache.invalidatePattern.bind(globalCache),
  markStale: globalCache.markStale.bind(globalCache),
  clear: globalCache.clear.bind(globalCache),
  fetchWithCache: globalCache.fetchWithCache.bind(globalCache)
};

export default {
  CacheManager,
  globalCache,
  useCachedData,
  useCacheInvalidation,
  CacheKeys,
  cache
};