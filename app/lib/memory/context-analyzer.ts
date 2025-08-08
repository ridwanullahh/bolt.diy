import { createScopedLogger } from '~/utils/logger';
import type { 
  MemoryMetadata, 
  ExtractedEntity, 
  CodeReference,
  CodeContext,
  FunctionInfo,
  ClassInfo,
  VariableInfo
} from './types';

const logger = createScopedLogger('ContextAnalyzer');

export class ContextAnalyzer {
  private readonly ENTITY_PATTERNS = {
    technology: /\b(React|Vue|Angular|Node\.js|TypeScript|JavaScript|Python|Java|C\+\+|Rust|Go|PHP|Ruby|Swift|Kotlin|Dart|Flutter|Next\.js|Nuxt|Svelte|Express|FastAPI|Django|Spring|Laravel|Rails)\b/gi,
    framework: /\b(React|Vue|Angular|Express|FastAPI|Django|Spring|Laravel|Rails|Next\.js|Nuxt|Svelte|Flutter|Ionic|Cordova|Electron)\b/gi,
    library: /\b(lodash|axios|moment|dayjs|uuid|bcrypt|jwt|passport|multer|cors|helmet|morgan|winston|chalk|commander|inquirer|ora|boxen)\b/gi,
    api: /\b(REST|GraphQL|gRPC|WebSocket|SSE|API|endpoint|route|controller|middleware|handler)\b/gi,
    database: /\b(MongoDB|PostgreSQL|MySQL|SQLite|Redis|Elasticsearch|DynamoDB|Firestore|Supabase|PlanetScale)\b/gi,
    concept: /\b(authentication|authorization|middleware|routing|state management|component|hook|service|repository|model|view|controller|MVC|MVP|MVVM|microservices|monolith|serverless|JAMstack|SSR|SPA|PWA|SEO|performance|optimization|caching|testing|deployment|CI\/CD|Docker|Kubernetes|AWS|Azure|GCP|Vercel|Netlify)\b/gi
  };

  private readonly KEYWORD_PATTERNS = {
    action: /\b(create|build|implement|develop|design|refactor|optimize|fix|debug|test|deploy|configure|setup|install|update|upgrade|migrate|integrate|connect|authenticate|authorize|validate|sanitize|parse|format|transform|convert|generate|compile|bundle|minify|compress|cache|store|retrieve|fetch|send|receive|process|handle|manage|monitor|log|track|analyze|measure|benchmark|profile)\b/gi,
    priority: /\b(urgent|critical|high|medium|low|important|priority|asap|immediately|soon|later|optional|nice to have|must have|should have|could have|won't have)\b/gi,
    status: /\b(todo|in progress|done|completed|finished|pending|blocked|waiting|review|approved|rejected|cancelled|postponed|on hold)\b/gi,
    quality: /\b(bug|issue|error|exception|warning|performance|security|accessibility|usability|maintainability|scalability|reliability|availability|compatibility|responsive|mobile|desktop|cross-platform|cross-browser)\b/gi
  };

  async analyzeContent(content: string, existingMetadata: Partial<MemoryMetadata> = {}): Promise<MemoryMetadata> {
    const entities = this.extractEntities(content);
    const keywords = this.extractKeywords(content);
    const codeReferences = this.extractCodeReferences(content);
    const summary = this.generateSummary(content);
    const confidence = this.calculateConfidence(content, entities, keywords);

    return {
      source: existingMetadata.source || 'user-input',
      projectId: existingMetadata.projectId,
      sessionId: existingMetadata.sessionId,
      userId: existingMetadata.userId,
      fileReferences: existingMetadata.fileReferences || [],
      codeReferences: [...(existingMetadata.codeReferences || []), ...codeReferences],
      entities: [...(existingMetadata.entities || []), ...entities],
      summary,
      keywords: [...new Set([...(existingMetadata.keywords || []), ...keywords])],
      confidence
    };
  }

  private extractEntities(content: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    for (const [type, pattern] of Object.entries(this.ENTITY_PATTERNS)) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const entity: ExtractedEntity = {
            type: type as ExtractedEntity['type'],
            name: match,
            context: this.getEntityContext(content, match),
            confidence: this.calculateEntityConfidence(content, match, type)
          };
          entities.push(entity);
        }
      }
    }

    // Extract file references
    const filePattern = /\b[\w\-\.\/]+\.(js|ts|jsx|tsx|py|java|cpp|c|h|php|rb|go|rs|swift|kt|dart|css|scss|sass|less|html|xml|json|yaml|yml|md|txt|sql|sh|bat|ps1)\b/gi;
    const fileMatches = content.match(filePattern);
    if (fileMatches) {
      for (const match of fileMatches) {
        entities.push({
          type: 'file',
          name: match,
          context: this.getEntityContext(content, match),
          confidence: 0.9
        });
      }
    }

    // Extract function references
    const functionPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    let functionMatch;
    while ((functionMatch = functionPattern.exec(content)) !== null) {
      const functionName = functionMatch[1];
      if (this.isLikelyFunction(functionName)) {
        entities.push({
          type: 'function',
          name: functionName,
          context: this.getEntityContext(content, functionName),
          confidence: 0.7
        });
      }
    }

    // Extract variable references
    const variablePattern = /\b(const|let|var|final|static)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let variableMatch;
    while ((variableMatch = variablePattern.exec(content)) !== null) {
      const variableName = variableMatch[2];
      entities.push({
        type: 'variable',
        name: variableName,
        context: this.getEntityContext(content, variableName),
        confidence: 0.8
      });
    }

    return this.deduplicateEntities(entities);
  }

  private extractKeywords(content: string): string[] {
    const keywords: string[] = [];

    for (const [category, pattern] of Object.entries(this.KEYWORD_PATTERNS)) {
      const matches = content.match(pattern);
      if (matches) {
        keywords.push(...matches.map(match => match.toLowerCase()));
      }
    }

    // Extract important nouns and verbs
    const importantWords = content
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word))
      .filter(word => /^[a-zA-Z]+$/.test(word));

    keywords.push(...importantWords);

    return [...new Set(keywords)];
  }

  private extractCodeReferences(content: string): CodeReference[] {
    const codeReferences: CodeReference[] = [];

    // Extract code blocks
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    let codeMatch;
    while ((codeMatch = codeBlockPattern.exec(content)) !== null) {
      const language = codeMatch[1] || 'unknown';
      const code = codeMatch[2];
      
      const reference: CodeReference = {
        filePath: 'inline-code',
        language,
        snippet: code.substring(0, 200) + (code.length > 200 ? '...' : ''),
        functionName: this.extractFunctionFromCode(code),
        className: this.extractClassFromCode(code)
      };
      
      codeReferences.push(reference);
    }

    // Extract inline code
    const inlineCodePattern = /`([^`]+)`/g;
    let inlineMatch;
    while ((inlineMatch = inlineCodePattern.exec(content)) !== null) {
      const code = inlineMatch[1];
      if (code.length > 5 && this.looksLikeCode(code)) {
        codeReferences.push({
          filePath: 'inline-code',
          language: this.detectLanguage(code),
          snippet: code
        });
      }
    }

    return codeReferences;
  }

  private generateSummary(content: string): string {
    // Simple extractive summarization
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length <= 2) {
      return content.substring(0, 200) + (content.length > 200 ? '...' : '');
    }

    // Score sentences based on keyword frequency and position
    const scoredSentences = sentences.map((sentence, index) => {
      let score = 0;
      
      // Position score (earlier sentences get higher score)
      score += (sentences.length - index) / sentences.length * 0.3;
      
      // Length score (prefer medium-length sentences)
      const words = sentence.split(/\s+/).length;
      if (words >= 5 && words <= 25) {
        score += 0.3;
      }
      
      // Keyword score
      const keywordCount = this.countKeywords(sentence);
      score += keywordCount * 0.4;
      
      return { sentence: sentence.trim(), score };
    });

    // Select top sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(s => s.sentence);

    return topSentences.join('. ') + '.';
  }

  private calculateConfidence(content: string, entities: ExtractedEntity[], keywords: string[]): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on content length
    if (content.length > 100) confidence += 0.1;
    if (content.length > 500) confidence += 0.1;

    // Increase confidence based on entities found
    confidence += Math.min(entities.length * 0.05, 0.2);

    // Increase confidence based on keywords found
    confidence += Math.min(keywords.length * 0.02, 0.1);

    // Increase confidence if code is present
    if (content.includes('```') || content.includes('`')) {
      confidence += 0.1;
    }

    // Increase confidence if structured content is present
    if (content.includes('\n-') || content.includes('\n*') || content.includes('\n1.')) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  private getEntityContext(content: string, entity: string): string {
    const index = content.toLowerCase().indexOf(entity.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + entity.length + 50);
    
    return content.substring(start, end).trim();
  }

  private calculateEntityConfidence(content: string, entity: string, type: string): number {
    let confidence = 0.5;

    // Increase confidence based on context
    const context = this.getEntityContext(content, entity).toLowerCase();
    
    if (type === 'technology' || type === 'framework') {
      if (context.includes('using') || context.includes('with') || context.includes('built')) {
        confidence += 0.3;
      }
    }

    if (type === 'function') {
      if (context.includes('function') || context.includes('method') || context.includes('call')) {
        confidence += 0.2;
      }
    }

    // Increase confidence if entity appears multiple times
    const occurrences = (content.toLowerCase().match(new RegExp(entity.toLowerCase(), 'g')) || []).length;
    confidence += Math.min(occurrences * 0.1, 0.3);

    return Math.min(confidence, 1.0);
  }

  private isLikelyFunction(name: string): boolean {
    // Common function naming patterns
    const functionPatterns = [
      /^[a-z][a-zA-Z0-9]*$/, // camelCase
      /^[a-z][a-z0-9_]*$/, // snake_case
      /^get[A-Z]/, // getter
      /^set[A-Z]/, // setter
      /^is[A-Z]/, // boolean
      /^has[A-Z]/, // boolean
      /^create[A-Z]/, // factory
      /^handle[A-Z]/, // event handler
      /^on[A-Z]/ // event handler
    ];

    return functionPatterns.some(pattern => pattern.test(name)) && 
           name.length > 2 && 
           !this.isCommonWord(name);
  }

  private extractFunctionFromCode(code: string): string | undefined {
    const functionPatterns = [
      /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
      /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\(/,
      /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/
    ];

    for (const pattern of functionPatterns) {
      const match = code.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private extractClassFromCode(code: string): string | undefined {
    const classPatterns = [
      /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
      /interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
      /type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/
    ];

    for (const pattern of classPatterns) {
      const match = code.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private looksLikeCode(text: string): boolean {
    const codeIndicators = [
      /[{}();]/,
      /\b(function|const|let|var|if|else|for|while|return|import|export|class|interface)\b/,
      /[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/,
      /\.[a-zA-Z_$][a-zA-Z0-9_$]*/
    ];

    return codeIndicators.some(pattern => pattern.test(text));
  }

  private detectLanguage(code: string): string {
    if (code.includes('function') || code.includes('const') || code.includes('let')) {
      return 'javascript';
    }
    if (code.includes('def ') || code.includes('import ')) {
      return 'python';
    }
    if (code.includes('public class') || code.includes('private ')) {
      return 'java';
    }
    if (code.includes('fn ') || code.includes('let mut')) {
      return 'rust';
    }
    if (code.includes('func ') || code.includes('package ')) {
      return 'go';
    }
    
    return 'unknown';
  }

  private countKeywords(text: string): number {
    let count = 0;
    for (const pattern of Object.values(this.KEYWORD_PATTERNS)) {
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    return count;
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
      'might', 'must', 'can', 'shall', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'data', 'info', 'item', 'list', 'array', 'object', 'string', 'number', 'boolean',
      'true', 'false', 'null', 'undefined', 'console', 'log', 'error', 'warn', 'debug'
    ]);
    return commonWords.has(word.toLowerCase());
  }

  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Set<string>();
    return entities.filter(entity => {
      const key = `${entity.type}:${entity.name.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
