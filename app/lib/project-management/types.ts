// Project Management System Types

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: 'ai' | 'human' | string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  dependencies: string[]; // Task IDs this task depends on
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  completedAt?: number;
  aiGenerated: boolean;
  parentTaskId?: string;
  subtasks: string[]; // Task IDs of subtasks
  files: string[]; // File paths related to this task
  commits: string[]; // Commit hashes related to this task
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: number;
  status: 'planned' | 'active' | 'completed' | 'delayed';
  tasks: string[]; // Task IDs in this milestone
  progress: number; // 0-100
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSprint {
  id: string;
  title: string;
  description: string;
  startDate: number;
  endDate: number;
  status: 'planned' | 'active' | 'completed';
  tasks: string[]; // Task IDs in this sprint
  goals: string[];
  velocity: number; // Story points completed per day
  createdAt: number;
  updatedAt: number;
}

export interface AIProjectManager {
  id: string;
  name: string;
  role: 'project-manager' | 'tech-lead' | 'architect' | 'qa-lead';
  capabilities: string[];
  active: boolean;
  lastActive: number;
  tasksManaged: string[];
  decisions: AIDecision[];
}

export interface AIDecision {
  id: string;
  managerId: string;
  type: 'task-creation' | 'task-assignment' | 'priority-change' | 'milestone-update' | 'sprint-planning';
  description: string;
  reasoning: string;
  confidence: number; // 0-1
  timestamp: number;
  approved: boolean;
  humanOverride?: boolean;
  impact: 'low' | 'medium' | 'high';
}

export interface ProjectContext {
  id: string;
  name: string;
  description: string;
  type: 'web-app' | 'mobile-app' | 'api' | 'library' | 'tool' | 'other';
  technology: string[];
  framework: string[];
  language: string[];
  createdAt: number;
  updatedAt: number;
  lastActivity: number;
  
  // Project structure
  tasks: Map<string, ProjectTask>;
  milestones: Map<string, ProjectMilestone>;
  sprints: Map<string, ProjectSprint>;
  aiManagers: Map<string, AIProjectManager>;
  
  // Settings
  settings: ProjectSettings;
  
  // Metrics
  metrics: ProjectMetrics;
}

export interface ProjectSettings {
  aiAutomation: {
    enabled: boolean;
    autoTaskCreation: boolean;
    autoTaskAssignment: boolean;
    autoPriorityAdjustment: boolean;
    autoSprintPlanning: boolean;
    requireHumanApproval: boolean;
    confidenceThreshold: number; // 0-1, minimum confidence for auto-decisions
  };
  
  notifications: {
    taskUpdates: boolean;
    milestoneAlerts: boolean;
    sprintUpdates: boolean;
    aiDecisions: boolean;
  };
  
  workflow: {
    defaultTaskStatus: ProjectTask['status'];
    allowedTransitions: Record<ProjectTask['status'], ProjectTask['status'][]>;
    requireReviewForCompletion: boolean;
    autoCloseCompletedTasks: boolean;
  };
  
  integration: {
    gitIntegration: boolean;
    fileTracking: boolean;
    commitLinking: boolean;
    branchNaming: string; // Template for branch names
  };
}

export interface ProjectMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  
  totalStoryPoints: number;
  completedStoryPoints: number;
  
  averageTaskCompletionTime: number; // in hours
  averageTasksPerDay: number;
  
  aiDecisionAccuracy: number; // 0-1
  aiTasksCreated: number;
  humanTasksCreated: number;
  
  sprintVelocity: number[];
  burndownData: { date: number; remaining: number }[];
  
  lastCalculated: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  author: 'ai' | 'human' | string;
  content: string;
  timestamp: number;
  type: 'comment' | 'status-change' | 'assignment' | 'priority-change';
  metadata?: Record<string, any>;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: ProjectContext['type'];
  defaultTasks: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>[];
  defaultMilestones: Omit<ProjectMilestone, 'id' | 'createdAt' | 'updatedAt'>[];
  defaultSettings: Partial<ProjectSettings>;
  tags: string[];
}

// Event system for project management
export interface ProjectEvent {
  id: string;
  type: 'task-created' | 'task-updated' | 'task-completed' | 'milestone-reached' | 'sprint-started' | 'sprint-completed' | 'ai-decision';
  projectId: string;
  entityId: string; // ID of the task, milestone, etc.
  timestamp: number;
  data: Record<string, any>;
  triggeredBy: 'ai' | 'human' | string;
}

// AI Analysis interfaces
export interface CodeAnalysis {
  complexity: number; // 1-10
  maintainability: number; // 1-10
  testCoverage: number; // 0-100
  dependencies: string[];
  suggestedTasks: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>[];
  risks: string[];
  opportunities: string[];
}

export interface ProjectHealth {
  overall: number; // 0-100
  taskProgress: number;
  codeQuality: number;
  velocity: number;
  riskLevel: number;
  recommendations: string[];
  lastAssessed: number;
}
