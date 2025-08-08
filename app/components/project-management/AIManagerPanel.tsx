import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import type { AIProjectManager, AIDecision } from '~/lib/project-management/types';
import { Card, Badge, Button } from '~/components/ui';

interface AIManagerPanelProps {
  projectManager: any; // ProjectManager instance
}

export function AIManagerPanel({ projectManager }: AIManagerPanelProps) {
  const [aiManagers, setAIManagers] = useState<AIProjectManager[]>([]);
  const [selectedManager, setSelectedManager] = useState<AIProjectManager | null>(null);
  const [recentDecisions, setRecentDecisions] = useState<AIDecision[]>([]);

  useEffect(() => {
    loadAIManagers();
  }, []);

  const loadAIManagers = () => {
    const managers = projectManager.aiOrchestrator.getAIManagers();
    setAIManagers(managers);
    
    if (managers.length > 0 && !selectedManager) {
      setSelectedManager(managers[0]);
    }

    // Get recent decisions from all managers
    const allDecisions = managers.flatMap(manager => manager.decisions);
    const sortedDecisions = allDecisions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
    setRecentDecisions(sortedDecisions);
  };

  const getRoleIcon = (role: AIProjectManager['role']) => {
    switch (role) {
      case 'project-manager':
        return 'i-ph:kanban';
      case 'tech-lead':
        return 'i-ph:code';
      case 'architect':
        return 'i-ph:blueprint';
      case 'qa-lead':
        return 'i-ph:bug';
      default:
        return 'i-ph:robot';
    }
  };

  const getRoleColor = (role: AIProjectManager['role']) => {
    switch (role) {
      case 'project-manager':
        return 'text-blue-500';
      case 'tech-lead':
        return 'text-green-500';
      case 'architect':
        return 'text-purple-500';
      case 'qa-lead':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  const getDecisionTypeIcon = (type: AIDecision['type']) => {
    switch (type) {
      case 'task-creation':
        return 'i-ph:plus-circle';
      case 'task-assignment':
        return 'i-ph:user-circle';
      case 'priority-change':
        return 'i-ph:arrow-up';
      case 'milestone-update':
        return 'i-ph:flag';
      case 'sprint-planning':
        return 'i-ph:calendar';
      default:
        return 'i-ph:gear';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getImpactColor = (impact: AIDecision['impact']) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Managers Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {aiManagers.map((manager) => (
          <Card
            key={manager.id}
            className={classNames(
              'p-4 cursor-pointer transition-all hover:shadow-md',
              selectedManager?.id === manager.id && 'ring-2 ring-bolt-elements-focus'
            )}
            onClick={() => setSelectedManager(manager)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={classNames(getRoleIcon(manager.role), 'text-lg', getRoleColor(manager.role))} />
                <div>
                  <h4 className="font-medium text-bolt-elements-textPrimary">{manager.name}</h4>
                  <p className="text-xs text-bolt-elements-textSecondary capitalize">
                    {manager.role.replace('-', ' ')}
                  </p>
                </div>
              </div>
              
              <div className={classNames(
                'w-2 h-2 rounded-full',
                manager.active ? 'bg-green-500' : 'bg-gray-400'
              )} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-bolt-elements-textSecondary">Tasks Managed</span>
                <span className="text-bolt-elements-textPrimary font-medium">
                  {manager.tasksManaged.length}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-bolt-elements-textSecondary">Decisions Made</span>
                <span className="text-bolt-elements-textPrimary font-medium">
                  {manager.decisions.length}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-bolt-elements-textSecondary">Last Active</span>
                <span className="text-bolt-elements-textPrimary font-medium">
                  {new Date(manager.lastActive).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Capabilities */}
            <div className="mt-3">
              <div className="flex flex-wrap gap-1">
                {manager.capabilities.slice(0, 3).map((capability) => (
                  <Badge
                    key={capability}
                    className="text-xs bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary"
                  >
                    {capability.replace('-', ' ')}
                  </Badge>
                ))}
                {manager.capabilities.length > 3 && (
                  <Badge className="text-xs bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary">
                    +{manager.capabilities.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Selected Manager Details */}
      {selectedManager && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={classNames(
                getRoleIcon(selectedManager.role), 
                'text-2xl', 
                getRoleColor(selectedManager.role)
              )} />
              <div>
                <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">
                  {selectedManager.name}
                </h3>
                <p className="text-sm text-bolt-elements-textSecondary capitalize">
                  {selectedManager.role.replace('-', ' ')}
                </p>
              </div>
            </div>
            
            <Badge className={classNames(
              'text-sm',
              selectedManager.active 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            )}>
              {selectedManager.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {/* Capabilities */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-bolt-elements-textPrimary mb-2">Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {selectedManager.capabilities.map((capability) => (
                <Badge
                  key={capability}
                  className="text-sm bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary"
                >
                  {capability.replace('-', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Recent Decisions */}
          <div>
            <h4 className="text-sm font-medium text-bolt-elements-textPrimary mb-3">Recent Decisions</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedManager.decisions.length === 0 ? (
                <p className="text-sm text-bolt-elements-textSecondary">No decisions made yet</p>
              ) : (
                selectedManager.decisions
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 5)
                  .map((decision) => (
                    <div
                      key={decision.id}
                      className="flex items-start gap-3 p-3 bg-bolt-elements-background-depth-1 rounded-lg"
                    >
                      <div className={classNames(
                        getDecisionTypeIcon(decision.type),
                        'text-lg text-bolt-elements-textSecondary mt-0.5'
                      )} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h5 className="text-sm font-medium text-bolt-elements-textPrimary">
                            {decision.type.replace('-', ' ')}
                          </h5>
                          <div className="flex items-center gap-2">
                            <Badge className={classNames('text-xs', getImpactColor(decision.impact))}>
                              {decision.impact}
                            </Badge>
                            <span className={classNames(
                              'text-xs font-medium',
                              getConfidenceColor(decision.confidence)
                            )}>
                              {Math.round(decision.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-bolt-elements-textSecondary mb-2">
                          {decision.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-bolt-elements-textTertiary">
                          <span>{new Date(decision.timestamp).toLocaleString()}</span>
                          <div className="flex items-center gap-2">
                            {decision.approved && (
                              <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Approved
                              </Badge>
                            )}
                            {decision.humanOverride && (
                              <Badge className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                Override
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Recent Decisions Across All Managers */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-4">
          Recent AI Decisions
        </h3>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {recentDecisions.length === 0 ? (
            <p className="text-sm text-bolt-elements-textSecondary">No recent decisions</p>
          ) : (
            recentDecisions.map((decision) => {
              const manager = aiManagers.find(m => m.id === decision.managerId);
              return (
                <div
                  key={decision.id}
                  className="flex items-start gap-3 p-4 bg-bolt-elements-background-depth-1 rounded-lg"
                >
                  <div className={classNames(
                    getDecisionTypeIcon(decision.type),
                    'text-lg text-bolt-elements-textSecondary mt-0.5'
                  )} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-medium text-bolt-elements-textPrimary">
                          {decision.type.replace('-', ' ')}
                        </h5>
                        <span className="text-xs text-bolt-elements-textSecondary">
                          by {manager?.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={classNames('text-xs', getImpactColor(decision.impact))}>
                          {decision.impact}
                        </Badge>
                        <span className={classNames(
                          'text-xs font-medium',
                          getConfidenceColor(decision.confidence)
                        )}>
                          {Math.round(decision.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-bolt-elements-textPrimary mb-2">
                      {decision.description}
                    </p>
                    
                    <p className="text-xs text-bolt-elements-textSecondary mb-2">
                      {decision.reasoning}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-bolt-elements-textTertiary">
                      <span>{new Date(decision.timestamp).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        {!decision.approved && (
                          <Button size="sm" variant="secondary" className="text-xs px-2 py-1">
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
