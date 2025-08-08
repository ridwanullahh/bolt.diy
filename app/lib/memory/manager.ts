import { createScopedLogger } from '~/utils/logger';
import type { 
  MemoryEntry, 
  MemoryMetadata, 
  MemoryIndex, 
  MemoryQuery, 
  MemorySearchResult,
  MemoryStats,
  ConversationContext,
  CodeContext,
  ResearchContext
} from './types';
import { MemoryPersistence } from './persistence';
import { ContextAnalyzer } from './context-analyzer';
import { SemanticSearch } from './semantic-search';

const logger = createScopedLogger('MemoryManager');

export class MemoryManager {
  private static _instance: MemoryManager;
  private _memories: Map<string, MemoryEntry> = new Map();
  private _index: MemoryIndex;
  private _persistence: MemoryPersistence;
  private _contextAnalyzer: ContextAnalyzer;
  private _semanticSearch: SemanticSearch;
  private _stats: MemoryStats;

  private constructor() {
    this._persistence = new MemoryPersistence();
    this._contextAnalyzer = new ContextAnalyzer();
    this._semanticSearch = new SemanticSearch();
    this._index = this.initializeIndex();
    this._stats = this.initializeStats();
    this.loadMemories();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager._instance) {
      MemoryManager._instance = new MemoryManager();
    }
    return MemoryManager._instance;
  }

  private initializeIndex(): MemoryIndex {
    return {
      byType: new Map(),
      byTag: new Map(),
      byProject: new Map(),
      byEntity: new Map(),
      byKeyword: new Map(),
      temporal: {
        byDay: new Map(),
        byWeek: new Map(),
        byMonth: new Map(),
        recent: []
      },
      semantic: {
        embeddings: new Map(),
        clusters: [],
        similarityThreshold: 0.7
      }
    };
  }

  private initializeStats(): MemoryStats {
    return {
      totalEntries: 0,
      entriesByType: {},
      averageImportance: 0,
      mostAccessedEntries: [],
      recentActivity: {
        created: 0,
        accessed: 0,
        updated: 0
      },
      storageSize: 0,
      indexSize: 0,
      lastOptimized: Date.now()
    };
  }

  private async loadMemories(): Promise<void> {
    try {
      const memories = await this._persistence.loadMemories();
      
      for (const memory of memories) {
        this._memories.set(memory.id, memory);
        this.updateIndex(memory);
      }

      this.updateStats();
      logger.info(`Loaded ${memories.length} memories`);
    } catch (error) {
      logger.error('Failed to load memories:', error);
    }
  }

  async storeMemory(
    type: MemoryEntry['type'],
    content: string,
    metadata: Partial<MemoryMetadata>,
    importance: number = 0.5
  ): Promise<MemoryEntry> {
    const now = Date.now();
    const memoryId = `memory-${now}-${Math.random().toString(36).substr(2, 9)}`;

    // Analyze content for enhanced metadata
    const analyzedMetadata = await this._contextAnalyzer.analyzeContent(content, metadata);

    // Generate embedding for semantic search
    const embedding = await this._semanticSearch.generateEmbedding(content);

    const memory: MemoryEntry = {
      id: memoryId,
      type,
      content,
      metadata: {
        source: 'user-input',
        fileReferences: [],
        codeReferences: [],
        entities: [],
        summary: '',
        keywords: [],
        confidence: 1.0,
        ...analyzedMetadata
      },
      embedding,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessed: now,
      importance,
      tags: analyzedMetadata.keywords || [],
      relatedEntries: []
    };

    // Find related memories
    memory.relatedEntries = await this.findRelatedMemories(memory);

    this._memories.set(memoryId, memory);
    this.updateIndex(memory);
    
    await this._persistence.saveMemory(memory);
    
    this.updateStats();
    this._stats.recentActivity.created++;

    logger.info(`Stored memory: ${type} (${memoryId})`);
    return memory;
  }

  async storeConversationContext(context: ConversationContext): Promise<MemoryEntry> {
    const content = `${context.role}: ${context.content}`;
    
    const metadata: Partial<MemoryMetadata> = {
      source: 'chat',
      projectId: context.projectContext.id,
      sessionId: context.chatId,
      fileReferences: context.fileContext.map(f => f.path),
      codeReferences: context.codeContext.map(c => ({
        filePath: c.filePath,
        language: c.language,
        snippet: c.functions.map(f => f.name).join(', '),
        functionName: c.functions[0]?.name,
        className: c.classes[0]?.name
      })),
      entities: context.entities,
      summary: context.intent,
      keywords: context.entities.map(e => e.name)
    };

    return this.storeMemory('conversation', content, metadata, 0.7);
  }

  async storeCodeAnalysis(analysis: CodeContext): Promise<MemoryEntry> {
    const content = `Code analysis for ${analysis.filePath}: ${analysis.purpose}`;
    
    const metadata: Partial<MemoryMetadata> = {
      source: 'code',
      fileReferences: [analysis.filePath],
      codeReferences: [{
        filePath: analysis.filePath,
        language: analysis.language,
        snippet: analysis.functions.map(f => f.name).join(', '),
        functionName: analysis.functions[0]?.name,
        className: analysis.classes[0]?.name
      }],
      entities: [
        ...analysis.functions.map(f => ({
          type: 'function' as const,
          name: f.name,
          context: f.purpose,
          confidence: 0.9
        })),
        ...analysis.classes.map(c => ({
          type: 'function' as const,
          name: c.name,
          context: c.purpose,
          confidence: 0.9
        }))
      ],
      summary: analysis.purpose,
      keywords: [analysis.language, analysis.framework, ...analysis.dependencies].filter(Boolean) as string[]
    };

    return this.storeMemory('code-analysis', content, metadata, 0.8);
  }

  async storeResearch(research: ResearchContext): Promise<MemoryEntry> {
    const content = `Research: ${research.query}\n\nFindings:\n${research.findings.map(f => f.content).join('\n')}`;
    
    const metadata: Partial<MemoryMetadata> = {
      source: 'research',
      entities: research.findings.map(f => ({
        type: 'concept' as const,
        name: f.type,
        context: f.content,
        confidence: f.confidence
      })),
      summary: research.synthesis,
      keywords: research.domain.split(' '),
      confidence: research.confidence
    };

    return this.storeMemory('research', content, metadata, research.confidence);
  }

  async searchMemories(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];
    
    // Text-based search
    if (query.text) {
      const textResults = await this.performTextSearch(query.text, query);
      results.push(...textResults);
    }

    // Semantic search
    if (query.semanticSearch && query.text) {
      const semanticResults = await this.performSemanticSearch(query.text, query);
      results.push(...semanticResults);
    }

    // Filter by criteria
    let filteredResults = results;

    if (query.type) {
      filteredResults = filteredResults.filter(r => r.entry.type === query.type);
    }

    if (query.tags && query.tags.length > 0) {
      filteredResults = filteredResults.filter(r => 
        query.tags!.some(tag => r.entry.tags.includes(tag))
      );
    }

    if (query.projectId) {
      filteredResults = filteredResults.filter(r => 
        r.entry.metadata.projectId === query.projectId
      );
    }

    if (query.timeRange) {
      filteredResults = filteredResults.filter(r => 
        r.entry.createdAt >= query.timeRange!.start && 
        r.entry.createdAt <= query.timeRange!.end
      );
    }

    if (query.minImportance !== undefined) {
      filteredResults = filteredResults.filter(r => 
        r.entry.importance >= query.minImportance!
      );
    }

    // Sort by relevance and importance
    filteredResults.sort((a, b) => {
      const scoreA = a.score * a.entry.importance;
      const scoreB = b.score * b.entry.importance;
      return scoreB - scoreA;
    });

    // Limit results
    const maxResults = query.maxResults || 20;
    filteredResults = filteredResults.slice(0, maxResults);

    // Include related memories if requested
    if (query.includeRelated) {
      const relatedResults = await this.getRelatedMemories(filteredResults);
      filteredResults.push(...relatedResults);
    }

    // Update access counts
    filteredResults.forEach(result => {
      result.entry.accessCount++;
      result.entry.lastAccessed = Date.now();
      this._stats.recentActivity.accessed++;
    });

    return filteredResults;
  }

  private async performTextSearch(text: string, query: MemoryQuery): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];
    const searchTerms = text.toLowerCase().split(/\s+/);

    for (const memory of this._memories.values()) {
      const content = memory.content.toLowerCase();
      const metadata = JSON.stringify(memory.metadata).toLowerCase();
      
      let score = 0;
      const highlights: string[] = [];

      // Check for exact matches
      for (const term of searchTerms) {
        if (content.includes(term)) {
          score += 1;
          highlights.push(term);
        }
        if (metadata.includes(term)) {
          score += 0.5;
        }
      }

      // Check tags and keywords
      for (const tag of memory.tags) {
        if (searchTerms.some(term => tag.toLowerCase().includes(term))) {
          score += 0.8;
          highlights.push(tag);
        }
      }

      if (score > 0) {
        results.push({
          entry: memory,
          score: score / searchTerms.length,
          relevance: score / searchTerms.length,
          matchType: 'exact',
          highlights
        });
      }
    }

    return results;
  }

  private async performSemanticSearch(text: string, query: MemoryQuery): Promise<MemorySearchResult[]> {
    const queryEmbedding = await this._semanticSearch.generateEmbedding(text);
    const results: MemorySearchResult[] = [];

    for (const memory of this._memories.values()) {
      if (!memory.embedding) continue;

      const similarity = this._semanticSearch.calculateSimilarity(queryEmbedding, memory.embedding);
      
      if (similarity >= this._index.semantic.similarityThreshold) {
        results.push({
          entry: memory,
          score: similarity,
          relevance: similarity,
          matchType: 'semantic',
          highlights: []
        });
      }
    }

    return results;
  }

  private async findRelatedMemories(memory: MemoryEntry): Promise<string[]> {
    const related: string[] = [];
    
    // Find memories with similar entities
    for (const [id, existingMemory] of this._memories) {
      if (id === memory.id) continue;

      const sharedEntities = memory.metadata.entities.filter(entity =>
        existingMemory.metadata.entities.some(e => 
          e.name === entity.name && e.type === entity.type
        )
      );

      if (sharedEntities.length > 0) {
        related.push(id);
      }
    }

    // Find memories with similar keywords
    for (const [id, existingMemory] of this._memories) {
      if (id === memory.id || related.includes(id)) continue;

      const sharedKeywords = memory.metadata.keywords.filter(keyword =>
        existingMemory.metadata.keywords.includes(keyword)
      );

      if (sharedKeywords.length >= 2) {
        related.push(id);
      }
    }

    return related.slice(0, 10); // Limit to 10 related memories
  }

  private async getRelatedMemories(results: MemorySearchResult[]): Promise<MemorySearchResult[]> {
    const relatedResults: MemorySearchResult[] = [];
    const processedIds = new Set(results.map(r => r.entry.id));

    for (const result of results) {
      for (const relatedId of result.entry.relatedEntries) {
        if (processedIds.has(relatedId)) continue;

        const relatedMemory = this._memories.get(relatedId);
        if (relatedMemory) {
          relatedResults.push({
            entry: relatedMemory,
            score: result.score * 0.7, // Reduce score for related memories
            relevance: result.relevance * 0.7,
            matchType: 'related',
            highlights: []
          });
          processedIds.add(relatedId);
        }
      }
    }

    return relatedResults;
  }

  private updateIndex(memory: MemoryEntry): void {
    // Update type index
    if (!this._index.byType.has(memory.type)) {
      this._index.byType.set(memory.type, []);
    }
    this._index.byType.get(memory.type)!.push(memory.id);

    // Update tag index
    for (const tag of memory.tags) {
      if (!this._index.byTag.has(tag)) {
        this._index.byTag.set(tag, []);
      }
      this._index.byTag.get(tag)!.push(memory.id);
    }

    // Update project index
    if (memory.metadata.projectId) {
      if (!this._index.byProject.has(memory.metadata.projectId)) {
        this._index.byProject.set(memory.metadata.projectId, []);
      }
      this._index.byProject.get(memory.metadata.projectId)!.push(memory.id);
    }

    // Update entity index
    for (const entity of memory.metadata.entities) {
      const entityKey = `${entity.type}:${entity.name}`;
      if (!this._index.byEntity.has(entityKey)) {
        this._index.byEntity.set(entityKey, []);
      }
      this._index.byEntity.get(entityKey)!.push(memory.id);
    }

    // Update keyword index
    for (const keyword of memory.metadata.keywords) {
      if (!this._index.byKeyword.has(keyword)) {
        this._index.byKeyword.set(keyword, []);
      }
      this._index.byKeyword.get(keyword)!.push(memory.id);
    }

    // Update temporal index
    const date = new Date(memory.createdAt);
    const dayKey = date.toISOString().split('T')[0];
    const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!this._index.temporal.byDay.has(dayKey)) {
      this._index.temporal.byDay.set(dayKey, []);
    }
    this._index.temporal.byDay.get(dayKey)!.push(memory.id);

    if (!this._index.temporal.byWeek.has(weekKey)) {
      this._index.temporal.byWeek.set(weekKey, []);
    }
    this._index.temporal.byWeek.get(weekKey)!.push(memory.id);

    if (!this._index.temporal.byMonth.has(monthKey)) {
      this._index.temporal.byMonth.set(monthKey, []);
    }
    this._index.temporal.byMonth.get(monthKey)!.push(memory.id);

    // Update recent index
    this._index.temporal.recent.unshift(memory.id);
    if (this._index.temporal.recent.length > 100) {
      this._index.temporal.recent = this._index.temporal.recent.slice(0, 100);
    }

    // Update semantic index
    if (memory.embedding) {
      this._index.semantic.embeddings.set(memory.id, memory.embedding);
    }
  }

  private updateStats(): void {
    this._stats.totalEntries = this._memories.size;
    
    // Update entries by type
    this._stats.entriesByType = {};
    for (const [type, ids] of this._index.byType) {
      this._stats.entriesByType[type] = ids.length;
    }

    // Calculate average importance
    const importanceSum = Array.from(this._memories.values())
      .reduce((sum, memory) => sum + memory.importance, 0);
    this._stats.averageImportance = this._memories.size > 0 ? importanceSum / this._memories.size : 0;

    // Update most accessed entries
    this._stats.mostAccessedEntries = Array.from(this._memories.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(memory => memory.id);
  }

  getMemory(id: string): MemoryEntry | undefined {
    const memory = this._memories.get(id);
    if (memory) {
      memory.accessCount++;
      memory.lastAccessed = Date.now();
      this._stats.recentActivity.accessed++;
    }
    return memory;
  }

  getStats(): MemoryStats {
    return { ...this._stats };
  }

  async optimizeMemory(): Promise<void> {
    logger.info('Starting memory optimization...');
    
    // Remove low-importance, rarely accessed memories
    const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
    const toRemove: string[] = [];

    for (const [id, memory] of this._memories) {
      if (memory.importance < 0.3 && 
          memory.lastAccessed < cutoffDate && 
          memory.accessCount < 3) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this._memories.delete(id);
      await this._persistence.deleteMemory(id);
    }

    // Rebuild indexes
    this._index = this.initializeIndex();
    for (const memory of this._memories.values()) {
      this.updateIndex(memory);
    }

    this.updateStats();
    this._stats.lastOptimized = Date.now();

    logger.info(`Memory optimization complete. Removed ${toRemove.length} entries.`);
  }
}
