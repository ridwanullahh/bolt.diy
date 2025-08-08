// Enhanced Memory and Context System Types

export interface MemoryEntry {
  id: string;
  type: 'conversation' | 'code-analysis' | 'decision' | 'pattern' | 'context' | 'research';
  content: string;
  metadata: MemoryMetadata;
  embedding?: number[]; // Vector embedding for semantic search
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  lastAccessed: number;
  importance: number; // 0-1, higher means more important
  tags: string[];
  relatedEntries: string[]; // IDs of related memory entries
}

export interface MemoryMetadata {
  source: 'chat' | 'code' | 'file' | 'analysis' | 'research' | 'user-input';
  projectId?: string;
  sessionId?: string;
  userId?: string;
  fileReferences: string[];
  codeReferences: CodeReference[];
  entities: ExtractedEntity[];
  summary: string;
  keywords: string[];
  confidence: number; // 0-1
}

export interface CodeReference {
  filePath: string;
  startLine?: number;
  endLine?: number;
  functionName?: string;
  className?: string;
  language: string;
  snippet: string;
}

export interface ExtractedEntity {
  type: 'person' | 'technology' | 'concept' | 'file' | 'function' | 'variable' | 'api' | 'library';
  name: string;
  context: string;
  confidence: number;
}

export interface ConversationContext {
  id: string;
  chatId: string;
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  
  // Enhanced context
  intent: string;
  entities: ExtractedEntity[];
  codeContext: CodeContext[];
  fileContext: FileContext[];
  projectContext: ProjectContextInfo;
  
  // Memory connections
  relatedMemories: string[];
  triggeredMemories: string[];
  createdMemories: string[];
}

export interface CodeContext {
  filePath: string;
  language: string;
  framework?: string;
  purpose: string;
  complexity: number; // 1-10
  dependencies: string[];
  exports: string[];
  imports: string[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  variables: VariableInfo[];
  comments: CommentInfo[];
}

export interface FileContext {
  path: string;
  type: 'source' | 'config' | 'documentation' | 'test' | 'asset' | 'data';
  size: number;
  lastModified: number;
  encoding: string;
  language?: string;
  purpose: string;
  relationships: FileRelationship[];
}

export interface FileRelationship {
  type: 'imports' | 'exports' | 'references' | 'configures' | 'tests' | 'documents';
  targetPath: string;
  strength: number; // 0-1
}

export interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType?: string;
  purpose: string;
  complexity: number;
  lineStart: number;
  lineEnd: number;
  isAsync: boolean;
  isExported: boolean;
  dependencies: string[];
}

export interface ClassInfo {
  name: string;
  extends?: string;
  implements: string[];
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  purpose: string;
  lineStart: number;
  lineEnd: number;
  isExported: boolean;
}

export interface VariableInfo {
  name: string;
  type?: string;
  scope: 'global' | 'local' | 'class' | 'function';
  isConstant: boolean;
  isExported: boolean;
  line: number;
  purpose: string;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isReadonly: boolean;
  line: number;
}

export interface CommentInfo {
  type: 'single' | 'multi' | 'doc';
  content: string;
  line: number;
  purpose: 'explanation' | 'todo' | 'fixme' | 'documentation' | 'note';
}

export interface ProjectContextInfo {
  id: string;
  name: string;
  type: string;
  technologies: string[];
  frameworks: string[];
  languages: string[];
  architecture: ArchitectureInfo;
  patterns: PatternInfo[];
  conventions: ConventionInfo[];
}

export interface ArchitectureInfo {
  type: 'monolith' | 'microservices' | 'serverless' | 'spa' | 'ssr' | 'hybrid';
  layers: LayerInfo[];
  dataFlow: DataFlowInfo[];
  integrations: IntegrationInfo[];
}

export interface LayerInfo {
  name: string;
  purpose: string;
  technologies: string[];
  files: string[];
  dependencies: string[];
}

export interface DataFlowInfo {
  from: string;
  to: string;
  type: 'api' | 'event' | 'data' | 'ui';
  protocol?: string;
  format?: string;
}

export interface IntegrationInfo {
  name: string;
  type: 'database' | 'api' | 'service' | 'library' | 'framework';
  purpose: string;
  configuration: Record<string, any>;
}

export interface PatternInfo {
  name: string;
  type: 'design' | 'architectural' | 'coding' | 'testing';
  description: string;
  examples: string[];
  benefits: string[];
  tradeoffs: string[];
}

export interface ConventionInfo {
  type: 'naming' | 'structure' | 'formatting' | 'documentation' | 'testing';
  description: string;
  examples: string[];
  rules: string[];
}

export interface ResearchContext {
  id: string;
  query: string;
  domain: string;
  sources: ResearchSource[];
  findings: ResearchFinding[];
  synthesis: string;
  confidence: number;
  timestamp: number;
  relatedQueries: string[];
}

export interface ResearchSource {
  type: 'documentation' | 'code' | 'conversation' | 'analysis' | 'external';
  url?: string;
  title: string;
  content: string;
  relevance: number; // 0-1
  credibility: number; // 0-1
  timestamp: number;
}

export interface ResearchFinding {
  type: 'fact' | 'pattern' | 'best-practice' | 'anti-pattern' | 'recommendation';
  content: string;
  evidence: string[];
  confidence: number;
  importance: number;
  sources: string[];
}

export interface MemoryIndex {
  byType: Map<string, string[]>;
  byTag: Map<string, string[]>;
  byProject: Map<string, string[]>;
  byEntity: Map<string, string[]>;
  byKeyword: Map<string, string[]>;
  temporal: TemporalIndex;
  semantic: SemanticIndex;
}

export interface TemporalIndex {
  byDay: Map<string, string[]>; // YYYY-MM-DD -> memory IDs
  byWeek: Map<string, string[]>; // YYYY-WW -> memory IDs
  byMonth: Map<string, string[]>; // YYYY-MM -> memory IDs
  recent: string[]; // Last 100 memory IDs
}

export interface SemanticIndex {
  embeddings: Map<string, number[]>; // memory ID -> embedding vector
  clusters: SemanticCluster[];
  similarityThreshold: number;
}

export interface SemanticCluster {
  id: string;
  centroid: number[];
  members: string[];
  topic: string;
  keywords: string[];
}

export interface MemoryQuery {
  text?: string;
  type?: MemoryEntry['type'];
  tags?: string[];
  projectId?: string;
  timeRange?: {
    start: number;
    end: number;
  };
  entities?: string[];
  keywords?: string[];
  minImportance?: number;
  maxResults?: number;
  includeRelated?: boolean;
  semanticSearch?: boolean;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
  relevance: number;
  matchType: 'exact' | 'semantic' | 'related' | 'temporal';
  highlights: string[];
}

export interface MemoryStats {
  totalEntries: number;
  entriesByType: Record<string, number>;
  averageImportance: number;
  mostAccessedEntries: string[];
  recentActivity: {
    created: number;
    accessed: number;
    updated: number;
  };
  storageSize: number;
  indexSize: number;
  lastOptimized: number;
}
