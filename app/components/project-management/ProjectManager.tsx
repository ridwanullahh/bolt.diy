import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { ProjectManager } from '~/lib/project-management/manager';
import type { ProjectContext, ProjectTask, ProjectHealth } from '~/lib/project-management/types';
import { TaskList } from './TaskList';
import { ProjectHealth as ProjectHealthComponent } from './ProjectHealth';
import { AIManagerPanel } from './AIManagerPanel';
import { Button, IconButton, Dialog, Input, Tabs } from '~/components/ui';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreate?: (task: ProjectTask) => void;
}

export function ProjectManagerComponent({ isOpen, onClose, onTaskCreate }: ProjectManagerProps) {
  const [projectManager] = useState(() => ProjectManager.getInstance());
  const [currentProject, setCurrentProject] = useState<ProjectContext | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [projectHealth, setProjectHealth] = useState<ProjectHealth | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'health' | 'ai-managers'>('tasks');
  const [isLoading, setIsLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProject();
    }
  }, [isOpen]);

  const loadProject = async () => {
    setIsLoading(true);
    try {
      const project = projectManager.getDefaultProject();
      setCurrentProject(project);
      
      const projectTasks = Array.from(project.tasks.values());
      setTasks(projectTasks);

      // Load project health
      const health = await projectManager.analyzeProject(project.id);
      setProjectHealth(health);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!currentProject || !newTaskTitle.trim()) return;

    setIsLoading(true);
    try {
      const task = await projectManager.createTask(currentProject.id, {
        title: newTaskTitle,
        description: newTaskDescription,
        status: 'todo',
        priority: 'medium',
        assignee: 'human',
        tags: [],
        dependencies: [],
        aiGenerated: false,
        subtasks: [],
        files: [],
        commits: []
      });

      setTasks(prev => [...prev, task]);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setShowCreateTask(false);
      onTaskCreate?.(task);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<ProjectTask>) => {
    if (!currentProject) return;

    try {
      const updatedTask = await projectManager.updateTask(currentProject.id, taskId, updates);
      setTasks(prev => prev.map(task => task.id === taskId ? updatedTask : task));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleGenerateAITasks = async () => {
    if (!currentProject) return;

    setIsLoading(true);
    try {
      const aiTasks = await projectManager.generateTasks(
        currentProject.id, 
        'Generate tasks based on current project context and best practices'
      );
      setTasks(prev => [...prev, ...aiTasks]);
    } catch (error) {
      console.error('Failed to generate AI tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog onClose={onClose} className="w-[90vw] max-w-6xl h-[80vh] max-h-[800px]">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-bolt-elements-borderColor">
          <div className="flex items-center gap-3">
            <div className="i-ph:kanban text-2xl text-bolt-elements-textPrimary" />
            <div>
              <h2 className="text-xl font-semibold text-bolt-elements-textPrimary">
                Project Manager
              </h2>
              <p className="text-sm text-bolt-elements-textSecondary">
                {currentProject?.name || 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateAITasks}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <div className="i-ph:robot text-sm" />
              Generate AI Tasks
            </Button>
            <IconButton onClick={onClose} className="text-bolt-elements-textSecondary">
              <div className="i-ph:x text-lg" />
            </IconButton>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            className="flex-1 flex flex-col"
          >
            <div className="flex border-b border-bolt-elements-borderColor px-6">
              <Tabs.List className="flex gap-1">
                <Tabs.Trigger value="tasks" className="flex items-center gap-2 px-4 py-2">
                  <div className="i-ph:list-checks text-sm" />
                  Tasks ({tasks.length})
                </Tabs.Trigger>
                <Tabs.Trigger value="health" className="flex items-center gap-2 px-4 py-2">
                  <div className="i-ph:heart-pulse text-sm" />
                  Health
                </Tabs.Trigger>
                <Tabs.Trigger value="ai-managers" className="flex items-center gap-2 px-4 py-2">
                  <div className="i-ph:robot text-sm" />
                  AI Managers
                </Tabs.Trigger>
              </Tabs.List>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs.Content value="tasks" className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor">
                  <h3 className="font-medium text-bolt-elements-textPrimary">Tasks</h3>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateTask(true)}
                    className="flex items-center gap-2"
                  >
                    <div className="i-ph:plus text-sm" />
                    New Task
                  </Button>
                </div>
                <div className="flex-1 overflow-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="i-svg-spinners:3-dots-fade text-2xl text-bolt-elements-textSecondary" />
                    </div>
                  ) : (
                    <TaskList
                      tasks={tasks}
                      onTaskUpdate={handleTaskUpdate}
                      onTaskSelect={(task) => console.log('Selected task:', task)}
                    />
                  )}
                </div>
              </Tabs.Content>

              <Tabs.Content value="health" className="h-full">
                <div className="p-4">
                  <h3 className="font-medium text-bolt-elements-textPrimary mb-4">Project Health</h3>
                  {projectHealth ? (
                    <ProjectHealthComponent health={projectHealth} />
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <div className="i-svg-spinners:3-dots-fade text-2xl text-bolt-elements-textSecondary" />
                    </div>
                  )}
                </div>
              </Tabs.Content>

              <Tabs.Content value="ai-managers" className="h-full">
                <div className="p-4">
                  <h3 className="font-medium text-bolt-elements-textPrimary mb-4">AI Managers</h3>
                  <AIManagerPanel projectManager={projectManager} />
                </div>
              </Tabs.Content>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Create Task Dialog */}
      <AnimatePresence>
        {showCreateTask && (
          <Dialog
            onClose={() => setShowCreateTask(false)}
            className="w-[500px]"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-4">
                Create New Task
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
                    Title
                  </label>
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Enter task title..."
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
                    Description
                  </label>
                  <textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="Enter task description..."
                    rows={4}
                    className="w-full px-3 py-2 border border-bolt-elements-borderColor rounded-md bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary resize-none focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateTask(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={!newTaskTitle.trim() || isLoading}
                >
                  Create Task
                </Button>
              </div>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

// Hook for easy integration with chat
export function useProjectManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [projectManager] = useState(() => ProjectManager.getInstance());

  const openProjectManager = () => setIsOpen(true);
  const closeProjectManager = () => setIsOpen(false);

  const createTaskFromMessage = async (message: string) => {
    const project = projectManager.getDefaultProject();
    
    // Extract task information from message using simple parsing
    const lines = message.split('\n');
    const title = lines[0]?.replace(/^[-*]\s*/, '').trim() || 'New Task';
    const description = lines.slice(1).join('\n').trim() || message;

    return projectManager.createTask(project.id, {
      title,
      description,
      status: 'todo',
      priority: 'medium',
      assignee: 'human',
      tags: ['chat-generated'],
      dependencies: [],
      aiGenerated: true,
      subtasks: [],
      files: [],
      commits: []
    });
  };

  return {
    isOpen,
    openProjectManager,
    closeProjectManager,
    createTaskFromMessage,
    projectManager
  };
}
