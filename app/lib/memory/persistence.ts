import { createScopedLogger } from '~/utils/logger';
import type { MemoryEntry } from './types';

const logger = createScopedLogger('MemoryPersistence');

export class MemoryPersistence {
  private readonly MEM_FOLDER = '.mem';
  private readonly MEMORIES_STORE = 'memories';
  private readonly INDEX_STORE = 'memory-index';

  constructor() {
    this.initializeMemFolder();
  }

  private async initializeMemFolder(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        await this.initializeIndexedDB();
      } else {
        await this.initializeFileSystem();
      }
    } catch (error) {
      logger.error('Failed to initialize memory folder:', error);
    }
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MemorySystem', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.MEMORIES_STORE)) {
          const memoryStore = db.createObjectStore(this.MEMORIES_STORE, { keyPath: 'id' });
          memoryStore.createIndex('type', 'type', { unique: false });
          memoryStore.createIndex('createdAt', 'createdAt', { unique: false });
          memoryStore.createIndex('importance', 'importance', { unique: false });
          memoryStore.createIndex('projectId', 'metadata.projectId', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.INDEX_STORE)) {
          db.createObjectStore(this.INDEX_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  private async initializeFileSystem(): Promise<void> {
    logger.info('Memory persistence initialized with localStorage fallback');
  }

  async saveMemory(memory: MemoryEntry): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        await this.saveMemoryToIndexedDB(memory);
      } else {
        await this.saveMemoryToLocalStorage(memory);
      }
      logger.debug(`Saved memory: ${memory.type} (${memory.id})`);
    } catch (error) {
      logger.error('Failed to save memory:', error);
      throw error;
    }
  }

  private async saveMemoryToIndexedDB(memory: MemoryEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MemorySystem', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.MEMORIES_STORE], 'readwrite');
        const store = transaction.objectStore(this.MEMORIES_STORE);

        const saveRequest = store.put(memory);
        saveRequest.onsuccess = () => resolve();
        saveRequest.onerror = () => reject(saveRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async saveMemoryToLocalStorage(memory: MemoryEntry): Promise<void> {
    try {
      localStorage.setItem(`${this.MEM_FOLDER}-memory-${memory.id}`, JSON.stringify(memory));
      
      // Update memory index
      const memoryIndex = this.getMemoryIndex();
      if (!memoryIndex.includes(memory.id)) {
        memoryIndex.push(memory.id);
        localStorage.setItem(`${this.MEM_FOLDER}-index`, JSON.stringify(memoryIndex));
      }
    } catch (error) {
      logger.error('Failed to save memory to localStorage:', error);
      throw error;
    }
  }

  async loadMemories(): Promise<MemoryEntry[]> {
    try {
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        return await this.loadMemoriesFromIndexedDB();
      } else {
        return await this.loadMemoriesFromLocalStorage();
      }
    } catch (error) {
      logger.error('Failed to load memories:', error);
      return [];
    }
  }

  private async loadMemoriesFromIndexedDB(): Promise<MemoryEntry[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MemorySystem', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.MEMORIES_STORE], 'readonly');
        const store = transaction.objectStore(this.MEMORIES_STORE);

        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async loadMemoriesFromLocalStorage(): Promise<MemoryEntry[]> {
    try {
      const memoryIndex = this.getMemoryIndex();
      const memories: MemoryEntry[] = [];

      for (const memoryId of memoryIndex) {
        const memoryData = localStorage.getItem(`${this.MEM_FOLDER}-memory-${memoryId}`);
        if (memoryData) {
          const memory = JSON.parse(memoryData);
          memories.push(memory);
        }
      }

      return memories;
    } catch (error) {
      logger.error('Failed to load memories from localStorage:', error);
      return [];
    }
  }

  private getMemoryIndex(): string[] {
    try {
      const indexData = localStorage.getItem(`${this.MEM_FOLDER}-index`);
      return indexData ? JSON.parse(indexData) : [];
    } catch (error) {
      logger.error('Failed to get memory index:', error);
      return [];
    }
  }

  async deleteMemory(memoryId: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        await this.deleteMemoryFromIndexedDB(memoryId);
      } else {
        await this.deleteMemoryFromLocalStorage(memoryId);
      }
      logger.debug(`Deleted memory: ${memoryId}`);
    } catch (error) {
      logger.error('Failed to delete memory:', error);
      throw error;
    }
  }

  private async deleteMemoryFromIndexedDB(memoryId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MemorySystem', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.MEMORIES_STORE], 'readwrite');
        const store = transaction.objectStore(this.MEMORIES_STORE);

        const deleteRequest = store.delete(memoryId);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async deleteMemoryFromLocalStorage(memoryId: string): Promise<void> {
    localStorage.removeItem(`${this.MEM_FOLDER}-memory-${memoryId}`);
    
    // Update memory index
    const memoryIndex = this.getMemoryIndex();
    const updatedIndex = memoryIndex.filter(id => id !== memoryId);
    localStorage.setItem(`${this.MEM_FOLDER}-index`, JSON.stringify(updatedIndex));
  }

  async updateMemory(memory: MemoryEntry): Promise<void> {
    memory.updatedAt = Date.now();
    await this.saveMemory(memory);
  }

  async searchMemoriesByType(type: string): Promise<MemoryEntry[]> {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      return this.searchMemoriesByTypeIndexedDB(type);
    } else {
      const memories = await this.loadMemoriesFromLocalStorage();
      return memories.filter(memory => memory.type === type);
    }
  }

  private async searchMemoriesByTypeIndexedDB(type: string): Promise<MemoryEntry[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MemorySystem', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.MEMORIES_STORE], 'readonly');
        const store = transaction.objectStore(this.MEMORIES_STORE);
        const index = store.index('type');

        const getRequest = index.getAll(type);
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async searchMemoriesByDateRange(startDate: number, endDate: number): Promise<MemoryEntry[]> {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      return this.searchMemoriesByDateRangeIndexedDB(startDate, endDate);
    } else {
      const memories = await this.loadMemoriesFromLocalStorage();
      return memories.filter(memory => 
        memory.createdAt >= startDate && memory.createdAt <= endDate
      );
    }
  }

  private async searchMemoriesByDateRangeIndexedDB(startDate: number, endDate: number): Promise<MemoryEntry[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MemorySystem', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.MEMORIES_STORE], 'readonly');
        const store = transaction.objectStore(this.MEMORIES_STORE);
        const index = store.index('createdAt');

        const range = IDBKeyRange.bound(startDate, endDate);
        const getRequest = index.getAll(range);
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getMemoriesByImportance(minImportance: number): Promise<MemoryEntry[]> {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      return this.getMemoriesByImportanceIndexedDB(minImportance);
    } else {
      const memories = await this.loadMemoriesFromLocalStorage();
      return memories.filter(memory => memory.importance >= minImportance);
    }
  }

  private async getMemoriesByImportanceIndexedDB(minImportance: number): Promise<MemoryEntry[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MemorySystem', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.MEMORIES_STORE], 'readonly');
        const store = transaction.objectStore(this.MEMORIES_STORE);
        const index = store.index('importance');

        const range = IDBKeyRange.lowerBound(minImportance);
        const getRequest = index.getAll(range);
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async exportMemories(): Promise<string> {
    const memories = await this.loadMemories();
    return JSON.stringify(memories, null, 2);
  }

  async importMemories(data: string): Promise<void> {
    try {
      const memories: MemoryEntry[] = JSON.parse(data);
      
      for (const memory of memories) {
        await this.saveMemory(memory);
      }
      
      logger.info(`Imported ${memories.length} memories`);
    } catch (error) {
      logger.error('Failed to import memories:', error);
      throw error;
    }
  }

  async clearAllMemories(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        await this.clearMemoriesIndexedDB();
      } else {
        await this.clearMemoriesLocalStorage();
      }
      logger.info('Cleared all memories');
    } catch (error) {
      logger.error('Failed to clear memories:', error);
      throw error;
    }
  }

  private async clearMemoriesIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MemorySystem', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.MEMORIES_STORE], 'readwrite');
        const store = transaction.objectStore(this.MEMORIES_STORE);

        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async clearMemoriesLocalStorage(): Promise<void> {
    const memoryIndex = this.getMemoryIndex();
    
    for (const memoryId of memoryIndex) {
      localStorage.removeItem(`${this.MEM_FOLDER}-memory-${memoryId}`);
    }
    
    localStorage.removeItem(`${this.MEM_FOLDER}-index`);
  }
}
