import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import type { ProjectTask } from '~/lib/project-management/types';
import { Badge, Button, IconButton } from '~/components/ui';

interface TaskListProps {
  tasks: ProjectTask[];
  onTaskUpdate: (taskId: string, updates: Partial<ProjectTask>) => void;
  onTaskSelect: (task: ProjectTask) => void;
}

export function TaskList({ tasks, onTaskUpdate, onTaskSelect }: TaskListProps) {
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'done' | 'blocked'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'created' | 'updated'>('priority');

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'created':
        return b.createdAt - a.createdAt;
      case 'updated':
        return b.updatedAt - a.updatedAt;
      default:
        return 0;
    }
  });

  const getStatusIcon = (status: ProjectTask['status']) => {
    switch (status) {
      case 'todo':
        return 'i-ph:circle';
      case 'in-progress':
        return 'i-ph:clock';
      case 'review':
        return 'i-ph:eye';
      case 'done':
        return 'i-ph:check-circle-fill';
      case 'blocked':
        return 'i-ph:warning-circle';
      default:
        return 'i-ph:circle';
    }
  };

  const getStatusColor = (status: ProjectTask['status']) => {
    switch (status) {
      case 'todo':
        return 'text-gray-400';
      case 'in-progress':
        return 'text-blue-500';
      case 'review':
        return 'text-yellow-500';
      case 'done':
        return 'text-green-500';
      case 'blocked':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority: ProjectTask['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleStatusChange = (task: ProjectTask, newStatus: ProjectTask['status']) => {
    onTaskUpdate(task.id, { status: newStatus });
  };

  const handlePriorityChange = (task: ProjectTask, newPriority: ProjectTask['priority']) => {
    onTaskUpdate(task.id, { priority: newPriority });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters and Sort */}
      <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor">
        <div className="flex items-center gap-2">
          <span className="text-sm text-bolt-elements-textSecondary">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-2 py-1 text-sm border border-bolt-elements-borderColor rounded bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary"
          >
            <option value="all">All ({tasks.length})</option>
            <option value="todo">To Do ({tasks.filter(t => t.status === 'todo').length})</option>
            <option value="in-progress">In Progress ({tasks.filter(t => t.status === 'in-progress').length})</option>
            <option value="review">Review ({tasks.filter(t => t.status === 'review').length})</option>
            <option value="done">Done ({tasks.filter(t => t.status === 'done').length})</option>
            <option value="blocked">Blocked ({tasks.filter(t => t.status === 'blocked').length})</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-bolt-elements-textSecondary">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-2 py-1 text-sm border border-bolt-elements-borderColor rounded bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary"
          >
            <option value="priority">Priority</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-bolt-elements-textSecondary">
            <div className="i-ph:list-dashes text-3xl mb-2" />
            <p>No tasks found</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            <AnimatePresence>
              {sortedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg p-4 hover:border-bolt-elements-focus transition-colors cursor-pointer"
                  onClick={() => onTaskSelect(task)}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextStatus = task.status === 'todo' ? 'in-progress' : 
                                         task.status === 'in-progress' ? 'done' : 'todo';
                        handleStatusChange(task, nextStatus);
                      }}
                      className={classNames(
                        'mt-1 text-lg transition-colors hover:scale-110',
                        getStatusColor(task.status)
                      )}
                    >
                      <div className={getStatusIcon(task.status)} />
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={classNames(
                          'font-medium text-bolt-elements-textPrimary',
                          task.status === 'done' && 'line-through opacity-60'
                        )}>
                          {task.title}
                        </h4>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Priority Badge */}
                          <Badge
                            className={classNames('text-xs', getPriorityColor(task.priority))}
                            onClick={(e) => {
                              e.stopPropagation();
                              const priorities: ProjectTask['priority'][] = ['low', 'medium', 'high', 'critical'];
                              const currentIndex = priorities.indexOf(task.priority);
                              const nextPriority = priorities[(currentIndex + 1) % priorities.length];
                              handlePriorityChange(task, nextPriority);
                            }}
                          >
                            {task.priority}
                          </Badge>

                          {/* AI Generated Badge */}
                          {task.aiGenerated && (
                            <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              <div className="i-ph:robot text-xs mr-1" />
                              AI
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-sm text-bolt-elements-textSecondary mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Tags */}
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.map((tag) => (
                            <Badge
                              key={tag}
                              className="text-xs bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Meta Info */}
                      <div className="flex items-center justify-between mt-3 text-xs text-bolt-elements-textTertiary">
                        <div className="flex items-center gap-4">
                          {task.assignee && (
                            <span className="flex items-center gap-1">
                              <div className="i-ph:user" />
                              {task.assignee}
                            </span>
                          )}
                          
                          {task.estimatedHours && (
                            <span className="flex items-center gap-1">
                              <div className="i-ph:clock" />
                              {task.estimatedHours}h
                            </span>
                          )}

                          {task.dependencies.length > 0 && (
                            <span className="flex items-center gap-1">
                              <div className="i-ph:link" />
                              {task.dependencies.length} deps
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {task.dueDate && (
                            <span className={classNames(
                              'flex items-center gap-1',
                              task.dueDate < Date.now() && task.status !== 'done' && 'text-red-500'
                            )}>
                              <div className="i-ph:calendar" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          
                          <span>
                            {new Date(task.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
