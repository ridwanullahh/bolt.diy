import { createScopedLogger } from '~/utils/logger';
import type { 
  ProjectContext, 
  ProjectTask, 
  ProjectMilestone, 
  ProjectSprint, 
  AIProjectManager, 
  AIDecision,
  ProjectEvent,
  ProjectSettings,
  ProjectMetrics,
  TaskComment
} from './types';
import { PMPersistence } from './persistence';
import { AIOrchestrator } from './ai-orchestrator';

const logger = createScopedLogger('ProjectManager');

export class ProjectManager {
  private static _instance: ProjectManager;
  private _projects: Map<string, ProjectContext> = new Map();
  private _persistence: PMPersistence;
  private _aiOrchestrator: AIOrchestrator;
  private _eventListeners: Map<string, ((event: ProjectEvent) => void)[]> = new Map();

  private constructor() {
    this._persistence = new PMPersistence();
    this._aiOrchestrator = new AIOrchestrator(this);
    this.initializeDefaultProject();
  }

  static getInstance(): ProjectManager {
    if (!ProjectManager._instance) {
      ProjectManager._instance = new ProjectManager();
    }
    return ProjectManager._instance;
  }

  private async initializeDefaultProject() {
    try {
      // Load existing projects from persistence
      const projects = await this._persistence.loadProjects();
      
      for (const project of projects) {
        this._projects.set(project.id, project);
      }

      // Create default project if none exist
      if (this._projects.size === 0) {
        const defaultProject = this.createDefaultProject();
        this._projects.set(defaultProject.id, defaultProject);
        await this._persistence.saveProject(defaultProject);
      }

      logger.info(`Loaded ${this._projects.size} projects`);
    } catch (error) {
      logger.error('Failed to initialize projects:', error);
    }
  }

  private createDefaultProject(): ProjectContext {
    const now = Date.now();
    const projectId = `project-${now}`;

    return {
      id: projectId,
      name: 'Default Project',
      description: 'AI-powered development project',
      type: 'web-app',
      technology: ['TypeScript', 'React', 'Node.js'],
      framework: ['Remix', 'Vite'],
      language: ['TypeScript', 'JavaScript'],
      createdAt: now,
      updatedAt: now,
      lastActivity: now,
      
      tasks: new Map(),
      milestones: new Map(),
      sprints: new Map(),
      aiManagers: new Map(),
      
      settings: this.getDefaultSettings(),
      metrics: this.getDefaultMetrics()
    };
  }

  private getDefaultSettings(): ProjectSettings {
    return {
      aiAutomation: {
        enabled: true,
        autoTaskCreation: true,
        autoTaskAssignment: true,
        autoPriorityAdjustment: true,
        autoSprintPlanning: false,
        requireHumanApproval: true,
        confidenceThreshold: 0.8
      },
      notifications: {
        taskUpdates: true,
        milestoneAlerts: true,
        sprintUpdates: true,
        aiDecisions: true
      },
      workflow: {
        defaultTaskStatus: 'todo',
        allowedTransitions: {
          'todo': ['in-progress', 'blocked'],
          'in-progress': ['review', 'blocked', 'done'],
          'review': ['in-progress', 'done'],
          'done': [],
          'blocked': ['todo', 'in-progress']
        },
        requireReviewForCompletion: true,
        autoCloseCompletedTasks: false
      },
      integration: {
        gitIntegration: true,
        fileTracking: true,
        commitLinking: true,
        branchNaming: 'feature/{task-id}-{task-title-slug}'
      }
    };
  }

  private getDefaultMetrics(): ProjectMetrics {
    return {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      blockedTasks: 0,
      totalStoryPoints: 0,
      completedStoryPoints: 0,
      averageTaskCompletionTime: 0,
      averageTasksPerDay: 0,
      aiDecisionAccuracy: 0,
      aiTasksCreated: 0,
      humanTasksCreated: 0,
      sprintVelocity: [],
      burndownData: [],
      lastCalculated: Date.now()
    };
  }

  // Project Management Methods
  async createProject(
    name: string, 
    description: string, 
    type: ProjectContext['type'] = 'web-app'
  ): Promise<ProjectContext> {
    const now = Date.now();
    const projectId = `project-${now}-${Math.random().toString(36).substr(2, 9)}`;

    const project: ProjectContext = {
      id: projectId,
      name,
      description,
      type,
      technology: [],
      framework: [],
      language: [],
      createdAt: now,
      updatedAt: now,
      lastActivity: now,
      
      tasks: new Map(),
      milestones: new Map(),
      sprints: new Map(),
      aiManagers: new Map(),
      
      settings: this.getDefaultSettings(),
      metrics: this.getDefaultMetrics()
    };

    this._projects.set(projectId, project);
    await this._persistence.saveProject(project);

    this.emitEvent({
      id: `event-${Date.now()}`,
      type: 'task-created',
      projectId,
      entityId: projectId,
      timestamp: now,
      data: { project },
      triggeredBy: 'human'
    });

    logger.info(`Created project: ${name} (${projectId})`);
    return project;
  }

  getProject(projectId: string): ProjectContext | undefined {
    return this._projects.get(projectId);
  }

  getAllProjects(): ProjectContext[] {
    return Array.from(this._projects.values());
  }

  getDefaultProject(): ProjectContext {
    const projects = this.getAllProjects();
    return projects[0] || this.createDefaultProject();
  }

  // Task Management Methods
  async createTask(
    projectId: string,
    taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>,
    triggeredBy: 'ai' | 'human' = 'human'
  ): Promise<ProjectTask> {
    const project = this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const now = Date.now();
    const taskId = `task-${now}-${Math.random().toString(36).substr(2, 9)}`;

    const task: ProjectTask = {
      ...taskData,
      id: taskId,
      createdAt: now,
      updatedAt: now
    };

    project.tasks.set(taskId, task);
    project.lastActivity = now;
    project.updatedAt = now;

    // Update metrics
    project.metrics.totalTasks++;
    if (triggeredBy === 'ai') {
      project.metrics.aiTasksCreated++;
    } else {
      project.metrics.humanTasksCreated++;
    }

    await this._persistence.saveProject(project);

    this.emitEvent({
      id: `event-${Date.now()}`,
      type: 'task-created',
      projectId,
      entityId: taskId,
      timestamp: now,
      data: { task },
      triggeredBy
    });

    logger.info(`Created task: ${task.title} (${taskId}) in project ${projectId}`);
    return task;
  }

  async updateTask(
    projectId: string,
    taskId: string,
    updates: Partial<ProjectTask>,
    triggeredBy: 'ai' | 'human' = 'human'
  ): Promise<ProjectTask> {
    const project = this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const task = project.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in project ${projectId}`);
    }

    const now = Date.now();
    const oldStatus = task.status;
    
    Object.assign(task, updates, { updatedAt: now });
    project.lastActivity = now;
    project.updatedAt = now;

    // Update metrics if status changed
    if (updates.status && updates.status !== oldStatus) {
      this.updateTaskMetrics(project, oldStatus, updates.status);
      
      if (updates.status === 'done' && !task.completedAt) {
        task.completedAt = now;
      }
    }

    await this._persistence.saveProject(project);

    this.emitEvent({
      id: `event-${Date.now()}`,
      type: 'task-updated',
      projectId,
      entityId: taskId,
      timestamp: now,
      data: { task, updates, oldStatus },
      triggeredBy
    });

    logger.info(`Updated task: ${task.title} (${taskId})`);
    return task;
  }

  private updateTaskMetrics(project: ProjectContext, oldStatus: ProjectTask['status'], newStatus: ProjectTask['status']) {
    // Decrement old status count
    switch (oldStatus) {
      case 'in-progress':
        project.metrics.inProgressTasks = Math.max(0, project.metrics.inProgressTasks - 1);
        break;
      case 'blocked':
        project.metrics.blockedTasks = Math.max(0, project.metrics.blockedTasks - 1);
        break;
      case 'done':
        project.metrics.completedTasks = Math.max(0, project.metrics.completedTasks - 1);
        break;
    }

    // Increment new status count
    switch (newStatus) {
      case 'in-progress':
        project.metrics.inProgressTasks++;
        break;
      case 'blocked':
        project.metrics.blockedTasks++;
        break;
      case 'done':
        project.metrics.completedTasks++;
        break;
    }
  }

  // Event System
  addEventListener(eventType: string, callback: (event: ProjectEvent) => void): void {
    if (!this._eventListeners.has(eventType)) {
      this._eventListeners.set(eventType, []);
    }
    this._eventListeners.get(eventType)!.push(callback);
  }

  removeEventListener(eventType: string, callback: (event: ProjectEvent) => void): void {
    const listeners = this._eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: ProjectEvent): void {
    const listeners = this._eventListeners.get(event.type) || [];
    const allListeners = this._eventListeners.get('*') || [];
    
    [...listeners, ...allListeners].forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Error in event listener:', error);
      }
    });
  }

  // AI Integration
  get aiOrchestrator(): AIOrchestrator {
    return this._aiOrchestrator;
  }

  async analyzeProject(projectId: string): Promise<any> {
    return this._aiOrchestrator.analyzeProject(projectId);
  }

  async generateTasks(projectId: string, context: string): Promise<ProjectTask[]> {
    return this._aiOrchestrator.generateTasks(projectId, context);
  }
}
