import { createScopedLogger } from '~/utils/logger';
import type { 
  ProjectContext, 
  ProjectTask, 
  AIProjectManager, 
  AIDecision,
  CodeAnalysis,
  ProjectHealth
} from './types';

const logger = createScopedLogger('AIOrchestrator');

export class AIOrchestrator {
  private _projectManager: any; // Will be properly typed when ProjectManager is complete
  private _aiManagers: Map<string, AIProjectManager> = new Map();

  constructor(projectManager: any) {
    this._projectManager = projectManager;
    this.initializeAIManagers();
  }

  private initializeAIManagers(): void {
    // Create default AI managers
    const defaultManagers: Omit<AIProjectManager, 'id'>[] = [
      {
        name: 'Project Coordinator',
        role: 'project-manager',
        capabilities: [
          'task-planning',
          'resource-allocation',
          'timeline-management',
          'risk-assessment',
          'stakeholder-communication'
        ],
        active: true,
        lastActive: Date.now(),
        tasksManaged: [],
        decisions: []
      },
      {
        name: 'Technical Lead',
        role: 'tech-lead',
        capabilities: [
          'architecture-design',
          'code-review',
          'technical-debt-analysis',
          'performance-optimization',
          'security-assessment'
        ],
        active: true,
        lastActive: Date.now(),
        tasksManaged: [],
        decisions: []
      },
      {
        name: 'Quality Assurance Lead',
        role: 'qa-lead',
        capabilities: [
          'test-planning',
          'quality-metrics',
          'bug-triage',
          'automation-strategy',
          'compliance-checking'
        ],
        active: true,
        lastActive: Date.now(),
        tasksManaged: [],
        decisions: []
      }
    ];

    defaultManagers.forEach(managerData => {
      const manager: AIProjectManager = {
        ...managerData,
        id: `ai-manager-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      this._aiManagers.set(manager.id, manager);
    });

    logger.info(`Initialized ${this._aiManagers.size} AI managers`);
  }

  async analyzeProject(projectId: string): Promise<ProjectHealth> {
    const project = this._projectManager.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    logger.info(`Analyzing project: ${project.name}`);

    const analysis = await this.performProjectAnalysis(project);
    const health = this.calculateProjectHealth(project, analysis);

    // Generate recommendations based on analysis
    const recommendations = await this.generateRecommendations(project, analysis);
    health.recommendations = recommendations;

    return health;
  }

  private async performProjectAnalysis(project: ProjectContext): Promise<CodeAnalysis> {
    // Simulate AI analysis - in real implementation, this would use LLM
    const tasks = Array.from(project.tasks.values());
    const completedTasks = tasks.filter(t => t.status === 'done');
    const blockedTasks = tasks.filter(t => t.status === 'blocked');

    return {
      complexity: this.calculateComplexity(tasks),
      maintainability: this.calculateMaintainability(project),
      testCoverage: this.estimateTestCoverage(tasks),
      dependencies: this.analyzeDependencies(tasks),
      suggestedTasks: await this.generateSuggestedTasks(project),
      risks: this.identifyRisks(project, blockedTasks),
      opportunities: this.identifyOpportunities(project, completedTasks)
    };
  }

  private calculateComplexity(tasks: ProjectTask[]): number {
    // Simple complexity calculation based on task count and dependencies
    const totalTasks = tasks.length;
    const totalDependencies = tasks.reduce((sum, task) => sum + task.dependencies.length, 0);
    
    if (totalTasks === 0) return 1;
    
    const complexityScore = Math.min(10, 1 + (totalTasks / 10) + (totalDependencies / totalTasks));
    return Math.round(complexityScore);
  }

  private calculateMaintainability(project: ProjectContext): number {
    // Calculate based on task organization and project structure
    const tasks = Array.from(project.tasks.values());
    const wellDocumentedTasks = tasks.filter(t => t.description.length > 50).length;
    const taggedTasks = tasks.filter(t => t.tags.length > 0).length;
    
    if (tasks.length === 0) return 10;
    
    const documentationScore = (wellDocumentedTasks / tasks.length) * 5;
    const organizationScore = (taggedTasks / tasks.length) * 5;
    
    return Math.round(documentationScore + organizationScore);
  }

  private estimateTestCoverage(tasks: ProjectTask[]): number {
    // Estimate test coverage based on testing-related tasks
    const testTasks = tasks.filter(t => 
      t.tags.includes('testing') || 
      t.title.toLowerCase().includes('test') ||
      t.description.toLowerCase().includes('test')
    );
    
    const implementationTasks = tasks.filter(t => 
      t.tags.includes('implementation') || 
      t.tags.includes('feature')
    );
    
    if (implementationTasks.length === 0) return 0;
    
    return Math.round((testTasks.length / implementationTasks.length) * 100);
  }

  private analyzeDependencies(tasks: ProjectTask[]): string[] {
    const dependencies = new Set<string>();
    
    tasks.forEach(task => {
      task.tags.forEach(tag => {
        if (tag.includes('framework') || tag.includes('library') || tag.includes('api')) {
          dependencies.add(tag);
        }
      });
    });
    
    return Array.from(dependencies);
  }

  private async generateSuggestedTasks(project: ProjectContext): Promise<Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>[]> {
    const suggestions: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    const tasks = Array.from(project.tasks.values());
    const hasTestingTasks = tasks.some(t => t.tags.includes('testing'));
    const hasDocumentationTasks = tasks.some(t => t.tags.includes('documentation'));
    const hasSecurityTasks = tasks.some(t => t.tags.includes('security'));
    
    if (!hasTestingTasks) {
      suggestions.push({
        title: 'Implement Unit Tests',
        description: 'Add comprehensive unit tests to improve code quality and reliability',
        status: 'todo',
        priority: 'high',
        assignee: 'ai',
        estimatedHours: 8,
        tags: ['testing', 'quality', 'ai-generated'],
        dependencies: [],
        aiGenerated: true,
        subtasks: [],
        files: [],
        commits: []
      });
    }
    
    if (!hasDocumentationTasks) {
      suggestions.push({
        title: 'Update Project Documentation',
        description: 'Create and maintain comprehensive project documentation',
        status: 'todo',
        priority: 'medium',
        assignee: 'ai',
        estimatedHours: 4,
        tags: ['documentation', 'maintenance', 'ai-generated'],
        dependencies: [],
        aiGenerated: true,
        subtasks: [],
        files: [],
        commits: []
      });
    }
    
    if (!hasSecurityTasks) {
      suggestions.push({
        title: 'Security Audit',
        description: 'Perform security audit and implement necessary security measures',
        status: 'todo',
        priority: 'high',
        assignee: 'ai',
        estimatedHours: 6,
        tags: ['security', 'audit', 'ai-generated'],
        dependencies: [],
        aiGenerated: true,
        subtasks: [],
        files: [],
        commits: []
      });
    }
    
    return suggestions;
  }

  private identifyRisks(project: ProjectContext, blockedTasks: ProjectTask[]): string[] {
    const risks: string[] = [];
    
    if (blockedTasks.length > 0) {
      risks.push(`${blockedTasks.length} blocked tasks may delay project timeline`);
    }
    
    const tasks = Array.from(project.tasks.values());
    const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== 'done');
    
    if (overdueTasks.length > 0) {
      risks.push(`${overdueTasks.length} overdue tasks require immediate attention`);
    }
    
    const highPriorityTasks = tasks.filter(t => t.priority === 'critical' && t.status !== 'done');
    if (highPriorityTasks.length > 3) {
      risks.push('Too many critical priority tasks may indicate scope creep');
    }
    
    return risks;
  }

  private identifyOpportunities(project: ProjectContext, completedTasks: ProjectTask[]): string[] {
    const opportunities: string[] = [];
    
    if (completedTasks.length > 0) {
      const avgCompletionTime = completedTasks
        .filter(t => t.completedAt && t.createdAt)
        .reduce((sum, t) => sum + (t.completedAt! - t.createdAt), 0) / completedTasks.length;
      
      if (avgCompletionTime < 24 * 60 * 60 * 1000) { // Less than 24 hours
        opportunities.push('Fast task completion rate indicates good team velocity');
      }
    }
    
    const tasks = Array.from(project.tasks.values());
    const automationTasks = tasks.filter(t => t.tags.includes('automation'));
    
    if (automationTasks.length === 0) {
      opportunities.push('Consider adding automation tasks to improve efficiency');
    }
    
    return opportunities;
  }

  private calculateProjectHealth(project: ProjectContext, analysis: CodeAnalysis): ProjectHealth {
    const tasks = Array.from(project.tasks.values());
    const completedTasks = tasks.filter(t => t.status === 'done');
    const blockedTasks = tasks.filter(t => t.status === 'blocked');
    
    // Calculate individual scores
    const taskProgress = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
    const codeQuality = (analysis.maintainability / 10) * 100;
    const velocity = this.calculateVelocity(project);
    const riskLevel = Math.max(0, 100 - (analysis.risks.length * 20) - (blockedTasks.length * 10));
    
    // Calculate overall health
    const overall = Math.round((taskProgress + codeQuality + velocity + riskLevel) / 4);
    
    return {
      overall,
      taskProgress: Math.round(taskProgress),
      codeQuality: Math.round(codeQuality),
      velocity: Math.round(velocity),
      riskLevel: Math.round(riskLevel),
      recommendations: [],
      lastAssessed: Date.now()
    };
  }

  private calculateVelocity(project: ProjectContext): number {
    const tasks = Array.from(project.tasks.values());
    const completedTasks = tasks.filter(t => t.status === 'done' && t.completedAt);
    
    if (completedTasks.length === 0) return 0;
    
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const recentCompletions = completedTasks.filter(t => t.completedAt! > oneWeekAgo);
    
    // Velocity based on recent completions
    return Math.min(100, (recentCompletions.length / 7) * 100);
  }

  private async generateRecommendations(project: ProjectContext, analysis: CodeAnalysis): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (analysis.testCoverage < 50) {
      recommendations.push('Increase test coverage to improve code reliability');
    }
    
    if (analysis.complexity > 7) {
      recommendations.push('Consider breaking down complex tasks into smaller, manageable pieces');
    }
    
    if (analysis.maintainability < 6) {
      recommendations.push('Improve task documentation and organization');
    }
    
    const tasks = Array.from(project.tasks.values());
    const blockedTasks = tasks.filter(t => t.status === 'blocked');
    
    if (blockedTasks.length > 0) {
      recommendations.push(`Address ${blockedTasks.length} blocked tasks to maintain project momentum`);
    }
    
    return recommendations;
  }

  async generateTasks(projectId: string, context: string): Promise<ProjectTask[]> {
    const project = this._projectManager.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    logger.info(`Generating tasks for project: ${project.name} with context: ${context}`);

    // This would integrate with the LLM to generate tasks based on context
    // For now, return suggested tasks from analysis
    const analysis = await this.performProjectAnalysis(project);
    
    const generatedTasks: ProjectTask[] = [];
    for (const suggestion of analysis.suggestedTasks) {
      const task = await this._projectManager.createTask(projectId, suggestion, 'ai');
      generatedTasks.push(task);
    }

    return generatedTasks;
  }

  async makeDecision(
    projectId: string,
    type: AIDecision['type'],
    description: string,
    reasoning: string,
    confidence: number
  ): Promise<AIDecision> {
    const managerId = Array.from(this._aiManagers.keys())[0]; // Use first manager for now
    
    const decision: AIDecision = {
      id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      managerId,
      type,
      description,
      reasoning,
      confidence,
      timestamp: Date.now(),
      approved: false,
      impact: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low'
    };

    const manager = this._aiManagers.get(managerId);
    if (manager) {
      manager.decisions.push(decision);
      manager.lastActive = Date.now();
    }

    logger.info(`AI decision made: ${description} (confidence: ${confidence})`);
    return decision;
  }

  getAIManagers(): AIProjectManager[] {
    return Array.from(this._aiManagers.values());
  }

  getAIManager(managerId: string): AIProjectManager | undefined {
    return this._aiManagers.get(managerId);
  }
}
