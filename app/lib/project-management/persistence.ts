import { createScopedLogger } from '~/utils/logger';
import type { ProjectContext, ProjectTask, ProjectMilestone, ProjectSprint, AIProjectManager } from './types';

const logger = createScopedLogger('PMPersistence');

export class PMPersistence {
  private readonly PM_FOLDER = '.pm';
  private readonly PROJECTS_FILE = 'projects.json';
  private readonly TASKS_PREFIX = 'tasks-';
  private readonly MILESTONES_PREFIX = 'milestones-';
  private readonly SPRINTS_PREFIX = 'sprints-';
  private readonly AI_MANAGERS_PREFIX = 'ai-managers-';

  constructor() {
    this.initializePMFolder();
  }

  private async initializePMFolder(): Promise<void> {
    try {
      // Check if running in browser environment
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        await this.initializeIndexedDB();
      } else {
        // Server-side or Node.js environment - use file system
        await this.initializeFileSystem();
      }
    } catch (error) {
      logger.error('Failed to initialize PM folder:', error);
    }
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ProjectManagement', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('projectId', 'projectId', { unique: false });
        }
        if (!db.objectStoreNames.contains('milestones')) {
          const milestoneStore = db.createObjectStore('milestones', { keyPath: 'id' });
          milestoneStore.createIndex('projectId', 'projectId', { unique: false });
        }
        if (!db.objectStoreNames.contains('sprints')) {
          const sprintStore = db.createObjectStore('sprints', { keyPath: 'id' });
          sprintStore.createIndex('projectId', 'projectId', { unique: false });
        }
        if (!db.objectStoreNames.contains('aiManagers')) {
          db.createObjectStore('aiManagers', { keyPath: 'id' });
        }
      };
    });
  }

  private async initializeFileSystem(): Promise<void> {
    // This would be implemented for server-side file system access
    // For now, we'll use localStorage as fallback in browser
    logger.info('PM persistence initialized with localStorage fallback');
  }

  async saveProject(project: ProjectContext): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        await this.saveProjectToIndexedDB(project);
      } else {
        await this.saveProjectToLocalStorage(project);
      }
      logger.info(`Saved project: ${project.name} (${project.id})`);
    } catch (error) {
      logger.error('Failed to save project:', error);
      throw error;
    }
  }

  private async saveProjectToIndexedDB(project: ProjectContext): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ProjectManagement', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['projects', 'tasks', 'milestones', 'sprints', 'aiManagers'], 'readwrite');

        // Save project metadata
        const projectData = {
          ...project,
          tasks: undefined,
          milestones: undefined,
          sprints: undefined,
          aiManagers: undefined
        };
        transaction.objectStore('projects').put(projectData);

        // Save tasks
        const taskStore = transaction.objectStore('tasks');
        project.tasks.forEach(task => {
          taskStore.put({ ...task, projectId: project.id });
        });

        // Save milestones
        const milestoneStore = transaction.objectStore('milestones');
        project.milestones.forEach(milestone => {
          milestoneStore.put({ ...milestone, projectId: project.id });
        });

        // Save sprints
        const sprintStore = transaction.objectStore('sprints');
        project.sprints.forEach(sprint => {
          sprintStore.put({ ...sprint, projectId: project.id });
        });

        // Save AI managers
        const aiManagerStore = transaction.objectStore('aiManagers');
        project.aiManagers.forEach(manager => {
          aiManagerStore.put({ ...manager, projectId: project.id });
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async saveProjectToLocalStorage(project: ProjectContext): Promise<void> {
    try {
      // Convert Maps to objects for JSON serialization
      const serializedProject = {
        ...project,
        tasks: Object.fromEntries(project.tasks),
        milestones: Object.fromEntries(project.milestones),
        sprints: Object.fromEntries(project.sprints),
        aiManagers: Object.fromEntries(project.aiManagers)
      };

      localStorage.setItem(`${this.PM_FOLDER}-project-${project.id}`, JSON.stringify(serializedProject));
      
      // Update projects index
      const projectsIndex = this.getProjectsIndex();
      if (!projectsIndex.includes(project.id)) {
        projectsIndex.push(project.id);
        localStorage.setItem(`${this.PM_FOLDER}-projects-index`, JSON.stringify(projectsIndex));
      }
    } catch (error) {
      logger.error('Failed to save project to localStorage:', error);
      throw error;
    }
  }

  async loadProjects(): Promise<ProjectContext[]> {
    try {
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        return await this.loadProjectsFromIndexedDB();
      } else {
        return await this.loadProjectsFromLocalStorage();
      }
    } catch (error) {
      logger.error('Failed to load projects:', error);
      return [];
    }
  }

  private async loadProjectsFromIndexedDB(): Promise<ProjectContext[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ProjectManagement', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['projects', 'tasks', 'milestones', 'sprints', 'aiManagers'], 'readonly');
        const projects: ProjectContext[] = [];

        const projectStore = transaction.objectStore('projects');
        const projectRequest = projectStore.getAll();

        projectRequest.onsuccess = async () => {
          const projectsData = projectRequest.result;

          for (const projectData of projectsData) {
            const project: ProjectContext = {
              ...projectData,
              tasks: new Map(),
              milestones: new Map(),
              sprints: new Map(),
              aiManagers: new Map()
            };

            // Load tasks
            const taskIndex = transaction.objectStore('tasks').index('projectId');
            const taskRequest = taskIndex.getAll(project.id);
            taskRequest.onsuccess = () => {
              taskRequest.result.forEach(task => {
                project.tasks.set(task.id, task);
              });
            };

            // Load milestones
            const milestoneIndex = transaction.objectStore('milestones').index('projectId');
            const milestoneRequest = milestoneIndex.getAll(project.id);
            milestoneRequest.onsuccess = () => {
              milestoneRequest.result.forEach(milestone => {
                project.milestones.set(milestone.id, milestone);
              });
            };

            // Load sprints
            const sprintIndex = transaction.objectStore('sprints').index('projectId');
            const sprintRequest = sprintIndex.getAll(project.id);
            sprintRequest.onsuccess = () => {
              sprintRequest.result.forEach(sprint => {
                project.sprints.set(sprint.id, sprint);
              });
            };

            // Load AI managers
            const aiManagerStore = transaction.objectStore('aiManagers');
            const aiManagerRequest = aiManagerStore.getAll();
            aiManagerRequest.onsuccess = () => {
              aiManagerRequest.result
                .filter(manager => manager.projectId === project.id)
                .forEach(manager => {
                  project.aiManagers.set(manager.id, manager);
                });
            };

            projects.push(project);
          }

          transaction.oncomplete = () => resolve(projects);
        };

        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async loadProjectsFromLocalStorage(): Promise<ProjectContext[]> {
    try {
      const projectsIndex = this.getProjectsIndex();
      const projects: ProjectContext[] = [];

      for (const projectId of projectsIndex) {
        const projectData = localStorage.getItem(`${this.PM_FOLDER}-project-${projectId}`);
        if (projectData) {
          const parsed = JSON.parse(projectData);
          
          // Convert objects back to Maps
          const project: ProjectContext = {
            ...parsed,
            tasks: new Map(Object.entries(parsed.tasks || {})),
            milestones: new Map(Object.entries(parsed.milestones || {})),
            sprints: new Map(Object.entries(parsed.sprints || {})),
            aiManagers: new Map(Object.entries(parsed.aiManagers || {}))
          };

          projects.push(project);
        }
      }

      return projects;
    } catch (error) {
      logger.error('Failed to load projects from localStorage:', error);
      return [];
    }
  }

  private getProjectsIndex(): string[] {
    try {
      const indexData = localStorage.getItem(`${this.PM_FOLDER}-projects-index`);
      return indexData ? JSON.parse(indexData) : [];
    } catch (error) {
      logger.error('Failed to get projects index:', error);
      return [];
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        await this.deleteProjectFromIndexedDB(projectId);
      } else {
        await this.deleteProjectFromLocalStorage(projectId);
      }
      logger.info(`Deleted project: ${projectId}`);
    } catch (error) {
      logger.error('Failed to delete project:', error);
      throw error;
    }
  }

  private async deleteProjectFromIndexedDB(projectId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ProjectManagement', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['projects', 'tasks', 'milestones', 'sprints', 'aiManagers'], 'readwrite');

        // Delete project
        transaction.objectStore('projects').delete(projectId);

        // Delete related data
        const taskIndex = transaction.objectStore('tasks').index('projectId');
        const taskRequest = taskIndex.getAll(projectId);
        taskRequest.onsuccess = () => {
          const taskStore = transaction.objectStore('tasks');
          taskRequest.result.forEach(task => taskStore.delete(task.id));
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async deleteProjectFromLocalStorage(projectId: string): Promise<void> {
    localStorage.removeItem(`${this.PM_FOLDER}-project-${projectId}`);
    
    // Update projects index
    const projectsIndex = this.getProjectsIndex();
    const updatedIndex = projectsIndex.filter(id => id !== projectId);
    localStorage.setItem(`${this.PM_FOLDER}-projects-index`, JSON.stringify(updatedIndex));
  }

  // Backup and restore functionality
  async exportProjects(): Promise<string> {
    const projects = await this.loadProjects();
    return JSON.stringify(projects, null, 2);
  }

  async importProjects(data: string): Promise<void> {
    try {
      const projects: ProjectContext[] = JSON.parse(data);
      
      for (const project of projects) {
        await this.saveProject(project);
      }
      
      logger.info(`Imported ${projects.length} projects`);
    } catch (error) {
      logger.error('Failed to import projects:', error);
      throw error;
    }
  }
}
