import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('SemanticSearch');

export class SemanticSearch {
  private readonly EMBEDDING_DIMENSION = 384; // Using a smaller dimension for efficiency
  private embeddingCache: Map<string, number[]> = new Map();

  constructor() {
    // Initialize with pre-computed embeddings for common terms if needed
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = this.getCacheKey(text);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    try {
      // For now, we'll use a simple TF-IDF-like approach
      // In a real implementation, this would call an embedding API or local model
      const embedding = await this.computeSimpleEmbedding(text);
      
      // Cache the result
      this.embeddingCache.set(cacheKey, embedding);
      
      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      // Return a zero vector as fallback
      return new Array(this.EMBEDDING_DIMENSION).fill(0);
    }
  }

  private async computeSimpleEmbedding(text: string): Promise<number[]> {
    // Simple bag-of-words embedding with TF-IDF weighting
    const words = this.tokenize(text);
    const wordFreq = this.computeWordFrequency(words);
    const vocabulary = this.getVocabulary();
    
    const embedding = new Array(this.EMBEDDING_DIMENSION).fill(0);
    
    // Map words to embedding dimensions using a hash function
    for (const [word, freq] of wordFreq) {
      const dimension = this.hashWordToDimension(word);
      const tfidf = this.computeTFIDF(word, freq, words.length);
      embedding[dimension] += tfidf;
    }
    
    // Normalize the embedding vector
    return this.normalizeVector(embedding);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  private computeWordFrequency(words: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
    return freq;
  }

  private getVocabulary(): Set<string> {
    // Common programming and technical vocabulary
    return new Set([
      'function', 'class', 'method', 'variable', 'constant', 'array', 'object', 'string',
      'number', 'boolean', 'null', 'undefined', 'true', 'false', 'if', 'else', 'for',
      'while', 'loop', 'condition', 'return', 'import', 'export', 'module', 'component',
      'react', 'vue', 'angular', 'node', 'javascript', 'typescript', 'python', 'java',
      'api', 'endpoint', 'route', 'controller', 'service', 'model', 'view', 'database',
      'query', 'insert', 'update', 'delete', 'select', 'join', 'table', 'column',
      'authentication', 'authorization', 'security', 'validation', 'error', 'exception',
      'test', 'testing', 'unit', 'integration', 'deployment', 'build', 'compile',
      'performance', 'optimization', 'cache', 'memory', 'storage', 'file', 'directory',
      'configuration', 'environment', 'development', 'production', 'staging', 'debug'
    ]);
  }

  private hashWordToDimension(word: string): number {
    // Simple hash function to map words to dimensions
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      const char = word.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % this.EMBEDDING_DIMENSION;
  }

  private computeTFIDF(word: string, termFreq: number, totalTerms: number): number {
    // Term Frequency
    const tf = termFreq / totalTerms;
    
    // Inverse Document Frequency (simplified)
    // In a real implementation, this would use actual document frequencies
    const vocabulary = this.getVocabulary();
    const idf = vocabulary.has(word) ? 1.0 : Math.log(1000 / (termFreq + 1));
    
    return tf * idf;
  }

  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    
    return vector.map(val => val / magnitude);
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      logger.warn('Embedding dimensions do not match');
      return 0;
    }

    // Cosine similarity
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  async findSimilarEmbeddings(
    queryEmbedding: number[], 
    candidateEmbeddings: Map<string, number[]>, 
    threshold: number = 0.7,
    maxResults: number = 10
  ): Promise<Array<{ id: string; similarity: number }>> {
    const similarities: Array<{ id: string; similarity: number }> = [];

    for (const [id, embedding] of candidateEmbeddings) {
      const similarity = this.calculateSimilarity(queryEmbedding, embedding);
      if (similarity >= threshold) {
        similarities.push({ id, similarity });
      }
    }

    // Sort by similarity (descending) and limit results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  async clusterEmbeddings(
    embeddings: Map<string, number[]>, 
    numClusters: number = 5
  ): Promise<Array<{ centroid: number[]; members: string[] }>> {
    const embeddingArray = Array.from(embeddings.entries());
    
    if (embeddingArray.length < numClusters) {
      // If we have fewer embeddings than clusters, each embedding is its own cluster
      return embeddingArray.map(([id, embedding]) => ({
        centroid: embedding,
        members: [id]
      }));
    }

    // Simple k-means clustering
    const clusters = await this.kMeansClustering(embeddingArray, numClusters);
    return clusters;
  }

  private async kMeansClustering(
    embeddings: Array<[string, number[]]>, 
    k: number,
    maxIterations: number = 100
  ): Promise<Array<{ centroid: number[]; members: string[] }>> {
    const dimension = embeddings[0][1].length;
    
    // Initialize centroids randomly
    let centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      const randomIndex = Math.floor(Math.random() * embeddings.length);
      centroids.push([...embeddings[randomIndex][1]]);
    }

    let clusters: Array<{ centroid: number[]; members: string[] }> = [];
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Assign points to clusters
      clusters = centroids.map(centroid => ({ centroid, members: [] }));
      
      for (const [id, embedding] of embeddings) {
        let bestCluster = 0;
        let bestSimilarity = -1;
        
        for (let i = 0; i < centroids.length; i++) {
          const similarity = this.calculateSimilarity(embedding, centroids[i]);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestCluster = i;
          }
        }
        
        clusters[bestCluster].members.push(id);
      }
      
      // Update centroids
      let converged = true;
      for (let i = 0; i < k; i++) {
        if (clusters[i].members.length === 0) continue;
        
        const newCentroid = new Array(dimension).fill(0);
        
        for (const memberId of clusters[i].members) {
          const memberEmbedding = embeddings.find(([id]) => id === memberId)?.[1];
          if (memberEmbedding) {
            for (let j = 0; j < dimension; j++) {
              newCentroid[j] += memberEmbedding[j];
            }
          }
        }
        
        // Average the centroid
        for (let j = 0; j < dimension; j++) {
          newCentroid[j] /= clusters[i].members.length;
        }
        
        // Check for convergence
        const similarity = this.calculateSimilarity(centroids[i], newCentroid);
        if (similarity < 0.99) {
          converged = false;
        }
        
        centroids[i] = newCentroid;
        clusters[i].centroid = newCentroid;
      }
      
      if (converged) {
        break;
      }
    }
    
    return clusters.filter(cluster => cluster.members.length > 0);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
      'might', 'must', 'can', 'shall', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our',
      'you', 'your', 'he', 'him', 'his', 'she', 'her', 'hers', 'me', 'my', 'mine'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  private getCacheKey(text: string): string {
    // Create a hash of the text for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  clearCache(): void {
    this.embeddingCache.clear();
    logger.info('Embedding cache cleared');
  }

  getCacheSize(): number {
    return this.embeddingCache.size;
  }

  // Method to integrate with external embedding services
  async generateEmbeddingWithAPI(text: string, apiEndpoint?: string): Promise<number[]> {
    if (!apiEndpoint) {
      // Fallback to simple embedding
      return this.generateEmbedding(text);
    }

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding || [];
    } catch (error) {
      logger.error('Failed to generate embedding with API:', error);
      // Fallback to simple embedding
      return this.generateEmbedding(text);
    }
  }
}
