// lib/cache.ts
// 캐싱 관리 관련 함수들 - 메모리 캐시, 로컬 스토리지 캐시, TTL 관리 등

import { CACHE_CONSTANTS } from "./constants";
import { storageUtils } from "./utils";

/**
 * 캐시 아이템 인터페이스
 */
interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

/**
 * 캐시 통계 인터페이스
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

/**
 * 캐시 옵션 인터페이스
 */
interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  storage?: "memory" | "localStorage" | "sessionStorage";
  serialize?: (data: any) => string;
  deserialize?: (data: string) => any;
}

/**
 * 메모리 캐시 클래스
 */
class MemoryCache {
  private cache: Map<string, CacheItem> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    hitRate: 0,
  };
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = CACHE_CONSTANTS.TTL.MEDIUM) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    // 주기적으로 만료된 아이템 정리
    setInterval(() => this.cleanup(), 60000); // 1분마다
  }

  /**
   * 캐시에 데이터 저장
   */
  set<T>(key: string, data: T, ttl?: number): void {
    try {
      // 캐시 크기 제한 확인
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        this.evictLRU();
      }

      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
        key,
      };

      this.cache.set(key, item);
      this.stats.sets++;
      this.stats.size = this.cache.size;
      this.updateHitRate();
    } catch (error) {
      console.error("메모리 캐시 저장 오류:", error);
    }
  }

  /**
   * 캐시에서 데이터 조회
   */
  get<T>(key: string): T | null {
    try {
      const item = this.cache.get(key);

      if (!item) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // TTL 확인
      const now = Date.now();
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        this.stats.misses++;
        this.stats.size = this.cache.size;
        this.updateHitRate();
        return null;
      }

      // LRU를 위해 아이템을 다시 설정 (Map은 삽입 순서를 유지)
      this.cache.delete(key);
      this.cache.set(key, { ...item, timestamp: now });

      this.stats.hits++;
      this.updateHitRate();
      return item.data as T;
    } catch (error) {
      console.error("메모리 캐시 조회 오류:", error);
      return null;
    }
  }

  /**
   * 캐시에서 데이터 삭제
   */
  delete(key: string): boolean {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.stats.deletes++;
        this.stats.size = this.cache.size;
      }
      return deleted;
    } catch (error) {
      console.error("메모리 캐시 삭제 오류:", error);
      return false;
    }
  }

  /**
   * 캐시 존재 여부 확인
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 캐시 전체 삭제
   */
  clear(): void {
    try {
      this.cache.clear();
      this.stats.size = 0;
    } catch (error) {
      console.error("메모리 캐시 초기화 오류:", error);
    }
  }

  /**
   * 캐시 크기 조회
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * LRU 정책으로 가장 오래된 아이템 제거
   */
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.stats.size = this.cache.size;
    }
  }

  /**
   * 만료된 아이템 정리
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach((key) => this.cache.delete(key));

    if (toDelete.length > 0) {
      this.stats.size = this.cache.size;
    }
  }

  /**
   * 히트율 업데이트
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * 스토리지 캐시 클래스
 */
class StorageCache {
  private storage: Storage;
  private prefix: string;
  private defaultTTL: number;
  private serialize: (data: any) => string;
  private deserialize: (data: string) => any;

  constructor(
    storage: Storage,
    prefix: string = "cache_",
    defaultTTL: number = CACHE_CONSTANTS.TTL.MEDIUM
  ) {
    this.storage = storage;
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
    this.serialize = JSON.stringify;
    this.deserialize = JSON.parse;
  }

  /**
   * 스토리지에 데이터 저장
   */
  set<T>(key: string, data: T, ttl?: number): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
        key,
      };

      const serialized = this.serialize(item);
      this.storage.setItem(this.prefix + key, serialized);
    } catch (error) {
      console.error("스토리지 캐시 저장 오류:", error);
    }
  }

  /**
   * 스토리지에서 데이터 조회
   */
  get<T>(key: string): T | null {
    try {
      const serialized = this.storage.getItem(this.prefix + key);

      if (!serialized) {
        return null;
      }

      const item: CacheItem<T> = this.deserialize(serialized);

      // TTL 확인
      const now = Date.now();
      if (now - item.timestamp > item.ttl) {
        this.storage.removeItem(this.prefix + key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.error("스토리지 캐시 조회 오류:", error);
      // 손상된 데이터 제거
      this.storage.removeItem(this.prefix + key);
      return null;
    }
  }

  /**
   * 스토리지에서 데이터 삭제
   */
  delete(key: string): boolean {
    try {
      const fullKey = this.prefix + key;
      const existed = this.storage.getItem(fullKey) !== null;
      this.storage.removeItem(fullKey);
      return existed;
    } catch (error) {
      console.error("스토리지 캐시 삭제 오류:", error);
      return false;
    }
  }

  /**
   * 스토리지 캐시 존재 여부 확인
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 캐시 전체 삭제
   */
  clear(): void {
    try {
      const keys = Object.keys(this.storage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          this.storage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("스토리지 캐시 초기화 오류:", error);
    }
  }

  /**
   * 만료된 아이템 정리
   */
  cleanup(): void {
    try {
      const keys = Object.keys(this.storage);
      const now = Date.now();

      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          try {
            const serialized = this.storage.getItem(key);
            if (serialized) {
              const item = this.deserialize(serialized);
              if (now - item.timestamp > item.ttl) {
                this.storage.removeItem(key);
              }
            }
          } catch {
            // 손상된 데이터 제거
            this.storage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error("스토리지 캐시 정리 오류:", error);
    }
  }
}

/**
 * 통합 캐시 매니저 클래스
 */
class CacheManager {
  private memoryCache: MemoryCache;
  private localStorageCache: StorageCache;
  private sessionStorageCache: StorageCache;

  constructor() {
    this.memoryCache = new MemoryCache();
    this.localStorageCache = new StorageCache(
      typeof window !== "undefined" ? window.localStorage : ({} as Storage),
      "cache_local_"
    );
    this.sessionStorageCache = new StorageCache(
      typeof window !== "undefined" ? window.sessionStorage : ({} as Storage),
      "cache_session_"
    );

    // 앱 시작시 스토리지 정리
    this.cleanup();
  }

  /**
   * 데이터 저장
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const { storage = "memory", ttl } = options;

    switch (storage) {
      case "memory":
        this.memoryCache.set(key, data, ttl);
        break;
      case "localStorage":
        this.localStorageCache.set(key, data, ttl);
        break;
      case "sessionStorage":
        this.sessionStorageCache.set(key, data, ttl);
        break;
    }
  }

  /**
   * 데이터 조회
   */
  get<T>(key: string, storage: "memory" | "localStorage" | "sessionStorage" = "memory"): T | null {
    switch (storage) {
      case "memory":
        return this.memoryCache.get<T>(key);
      case "localStorage":
        return this.localStorageCache.get<T>(key);
      case "sessionStorage":
        return this.sessionStorageCache.get<T>(key);
      default:
        return null;
    }
  }

  /**
   * 데이터 삭제
   */
  delete(key: string, storage?: "memory" | "localStorage" | "sessionStorage"): boolean {
    if (storage) {
      switch (storage) {
        case "memory":
          return this.memoryCache.delete(key);
        case "localStorage":
          return this.localStorageCache.delete(key);
        case "sessionStorage":
          return this.sessionStorageCache.delete(key);
        default:
          return false;
      }
    } else {
      // 모든 스토리지에서 삭제
      const results = [
        this.memoryCache.delete(key),
        this.localStorageCache.delete(key),
        this.sessionStorageCache.delete(key),
      ];
      return results.some((result) => result);
    }
  }

  /**
   * 존재 여부 확인
   */
  has(key: string, storage?: "memory" | "localStorage" | "sessionStorage"): boolean {
    if (storage) {
      switch (storage) {
        case "memory":
          return this.memoryCache.has(key);
        case "localStorage":
          return this.localStorageCache.has(key);
        case "sessionStorage":
          return this.sessionStorageCache.has(key);
        default:
          return false;
      }
    } else {
      // 어느 스토리지에든 존재하는지 확인
      return (
        this.memoryCache.has(key) ||
        this.localStorageCache.has(key) ||
        this.sessionStorageCache.has(key)
      );
    }
  }

  /**
   * 전체 캐시 삭제
   */
  clear(storage?: "memory" | "localStorage" | "sessionStorage"): void {
    if (storage) {
      switch (storage) {
        case "memory":
          this.memoryCache.clear();
          break;
        case "localStorage":
          this.localStorageCache.clear();
          break;
        case "sessionStorage":
          this.sessionStorageCache.clear();
          break;
      }
    } else {
      // 모든 캐시 삭제
      this.memoryCache.clear();
      this.localStorageCache.clear();
      this.sessionStorageCache.clear();
    }
  }

  /**
   * 만료된 캐시 정리
   */
  cleanup(): void {
    this.localStorageCache.cleanup();
    this.sessionStorageCache.cleanup();
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): { memory: CacheStats } {
    return {
      memory: this.memoryCache.getStats(),
    };
  }

  /**
   * 캐시 with 콜백 패턴
   */
  async remember<T>(
    key: string,
    callback: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    const { storage = "memory" } = options;

    // 캐시에서 먼저 확인
    const cached = this.get<T>(key, storage);
    if (cached !== null) {
      return cached;
    }

    // 캐시에 없으면 콜백 실행
    const result = await callback();

    // 결과를 캐시에 저장
    this.set(key, result, options);

    return result;
  }

  /**
   * 다중 캐시 조회
   */
  getMultiple<T>(
    keys: string[],
    storage: "memory" | "localStorage" | "sessionStorage" = "memory"
  ): Record<string, T | null> {
    const results: Record<string, T | null> = {};

    keys.forEach((key) => {
      results[key] = this.get<T>(key, storage);
    });

    return results;
  }

  /**
   * 다중 캐시 저장
   */
  setMultiple<T>(data: Record<string, T>, options: CacheOptions = {}): void {
    Object.entries(data).forEach(([key, value]) => {
      this.set(key, value, options);
    });
  }

  /**
   * 캐시 키 패턴으로 삭제
   */
  deletePattern(pattern: RegExp, storage?: "memory" | "localStorage" | "sessionStorage"): number {
    let deletedCount = 0;

    if (!storage || storage === "localStorage") {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.startsWith("cache_local_") && pattern.test(key.replace("cache_local_", ""))) {
            localStorage.removeItem(key);
            deletedCount++;
          }
        });
      } catch (error) {
        console.error("로컬 스토리지 패턴 삭제 오류:", error);
      }
    }

    if (!storage || storage === "sessionStorage") {
      try {
        const keys = Object.keys(sessionStorage);
        keys.forEach((key) => {
          if (key.startsWith("cache_session_") && pattern.test(key.replace("cache_session_", ""))) {
            sessionStorage.removeItem(key);
            deletedCount++;
          }
        });
      } catch (error) {
        console.error("세션 스토리지 패턴 삭제 오류:", error);
      }
    }

    return deletedCount;
  }
}

// 전역 캐시 매니저 인스턴스
export const cacheManager = new CacheManager();

/**
 * 단축 헬퍼 함수들
 */

/**
 * 메모리 캐시에 저장
 */
export function setCache<T>(key: string, data: T, ttl?: number): void {
  cacheManager.set(key, data, { storage: "memory", ttl });
}

/**
 * 메모리 캐시에서 조회
 */
export function getCache<T>(key: string): T | null {
  return cacheManager.get<T>(key, "memory");
}

/**
 * 로컬 스토리지 캐시에 저장
 */
export function setLocalCache<T>(key: string, data: T, ttl?: number): void {
  cacheManager.set(key, data, { storage: "localStorage", ttl });
}

/**
 * 로컬 스토리지 캐시에서 조회
 */
export function getLocalCache<T>(key: string): T | null {
  return cacheManager.get<T>(key, "localStorage");
}

/**
 * 세션 스토리지 캐시에 저장
 */
export function setSessionCache<T>(key: string, data: T, ttl?: number): void {
  cacheManager.set(key, data, { storage: "sessionStorage", ttl });
}

/**
 * 세션 스토리지 캐시에서 조회
 */
export function getSessionCache<T>(key: string): T | null {
  return cacheManager.get<T>(key, "sessionStorage");
}

/**
 * 캐시 삭제
 */
export function deleteCache(key: string): boolean {
  return cacheManager.delete(key);
}

/**
 * 캐시 존재 여부 확인
 */
export function hasCache(key: string): boolean {
  return cacheManager.has(key);
}

/**
 * 전체 캐시 삭제
 */
export function clearCache(): void {
  cacheManager.clear();
}

/**
 * 캐시 with 콜백 패턴
 */
export async function rememberCache<T>(
  key: string,
  callback: () => Promise<T> | T,
  ttl?: number
): Promise<T> {
  return cacheManager.remember(key, callback, { ttl });
}

/**
 * 캐시 데코레이터 (함수용)
 */
export function cached<T extends (...args: any[]) => any>(
  ttl: number = CACHE_CONSTANTS.TTL.MEDIUM,
  keyGenerator?: (...args: Parameters<T>) => string
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>) {
      const cacheKey = keyGenerator
        ? keyGenerator(...args)
        : `${target.constructor.name}_${propertyKey}_${JSON.stringify(args)}`;

      return rememberCache(cacheKey, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}

/**
 * 태그 기반 캐시 무효화
 */
class TaggedCache {
  private tags: Map<string, Set<string>> = new Map();

  /**
   * 태그와 함께 캐시 저장
   */
  setWithTags<T>(key: string, data: T, tags: string[], options: CacheOptions = {}): void {
    cacheManager.set(key, data, options);

    // 태그 매핑 저장
    tags.forEach((tag) => {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    });
  }

  /**
   * 태그로 캐시 무효화
   */
  invalidateTag(tag: string): number {
    const keys = this.tags.get(tag);
    if (!keys) return 0;

    let deletedCount = 0;
    keys.forEach((key) => {
      if (cacheManager.delete(key)) {
        deletedCount++;
      }
    });

    // 다른 태그에서도 해당 키들 제거
    this.tags.forEach((keySet, otherTag) => {
      if (otherTag !== tag) {
        keys.forEach((key) => keySet.delete(key));
      }
    });

    this.tags.delete(tag);
    return deletedCount;
  }

  /**
   * 여러 태그로 캐시 무효화
   */
  invalidateTags(tags: string[]): number {
    let totalDeleted = 0;
    tags.forEach((tag) => {
      totalDeleted += this.invalidateTag(tag);
    });
    return totalDeleted;
  }
}

export const taggedCache = new TaggedCache();

/**
 * 캐시 워밍업 (미리 데이터 로드)
 */
export async function warmupCache<T>(
  keys: Array<{ key: string; loader: () => Promise<T>; options?: CacheOptions }>
): Promise<void> {
  const promises = keys.map(async ({ key, loader, options }) => {
    try {
      const data = await loader();
      cacheManager.set(key, data, options);
    } catch (error) {
      console.error(`캐시 워밍업 실패 (${key}):`, error);
    }
  });

  await Promise.allSettled(promises);
}

// 앱 시작시 주기적인 캐시 정리 설정
if (typeof window !== "undefined") {
  // 5분마다 만료된 캐시 정리
  setInterval(() => {
    cacheManager.cleanup();
  }, 5 * 60 * 1000);

  // 페이지 언로드시 세션 캐시만 유지, 나머지는 정리
  window.addEventListener("beforeunload", () => {
    cacheManager.clear("memory");
  });
}

export default cacheManager;
