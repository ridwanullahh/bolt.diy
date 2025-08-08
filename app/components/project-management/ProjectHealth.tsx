import React from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import type { ProjectHealth } from '~/lib/project-management/types';
import { Card, Badge } from '~/components/ui';

interface ProjectHealthProps {
  health: ProjectHealth;
}

export function ProjectHealth({ health }: ProjectHealthProps) {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const HealthMetric = ({ 
    label, 
    score, 
    icon, 
    description 
  }: { 
    label: string; 
    score: number; 
    icon: string; 
    description: string;
  }) => (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={classNames(icon, 'text-lg', getHealthColor(score))} />
          <span className="font-medium text-bolt-elements-textPrimary">{label}</span>
        </div>
        <span className={classNames('font-bold text-lg', getHealthColor(score))}>
          {score}%
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-bolt-elements-background-depth-2 rounded-full h-2 mb-2">
        <motion.div
          className={classNames('h-2 rounded-full', getHealthBgColor(score))}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      
      <p className="text-xs text-bolt-elements-textSecondary">{description}</p>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <Card className="p-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-bolt-elements-background-depth-2"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className={getHealthColor(health.overall)}
                  initial={{ strokeDasharray: '0 251.2' }}
                  animate={{ strokeDasharray: `${(health.overall / 100) * 251.2} 251.2` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={classNames('text-2xl font-bold', getHealthColor(health.overall))}>
                  {health.overall}%
                </span>
              </div>
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">
            Project Health: {getHealthLabel(health.overall)}
          </h3>
          
          <p className="text-sm text-bolt-elements-textSecondary">
            Last assessed: {new Date(health.lastAssessed).toLocaleString()}
          </p>
        </div>
      </Card>

      {/* Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HealthMetric
          label="Task Progress"
          score={health.taskProgress}
          icon="i-ph:list-checks"
          description="Percentage of completed tasks"
        />
        
        <HealthMetric
          label="Code Quality"
          score={health.codeQuality}
          icon="i-ph:code"
          description="Code maintainability and organization"
        />
        
        <HealthMetric
          label="Velocity"
          score={health.velocity}
          icon="i-ph:rocket"
          description="Development speed and momentum"
        />
        
        <HealthMetric
          label="Risk Level"
          score={health.riskLevel}
          icon="i-ph:shield-check"
          description="Project stability and risk assessment"
        />
      </div>

      {/* Recommendations */}
      {health.recommendations.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="i-ph:lightbulb text-lg text-yellow-500" />
            <h4 className="font-medium text-bolt-elements-textPrimary">Recommendations</h4>
          </div>
          
          <div className="space-y-2">
            {health.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-bolt-elements-background-depth-1 rounded-lg"
              >
                <div className="i-ph:arrow-right text-sm text-bolt-elements-textSecondary mt-0.5" />
                <p className="text-sm text-bolt-elements-textPrimary">{recommendation}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="i-ph:lightning text-lg text-blue-500" />
          <h4 className="font-medium text-bolt-elements-textPrimary">Quick Actions</h4>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button className="flex items-center gap-2 p-3 bg-bolt-elements-background-depth-1 rounded-lg hover:bg-bolt-elements-background-depth-2 transition-colors text-left">
            <div className="i-ph:robot text-blue-500" />
            <div>
              <div className="text-sm font-medium text-bolt-elements-textPrimary">Generate Tasks</div>
              <div className="text-xs text-bolt-elements-textSecondary">AI-powered task suggestions</div>
            </div>
          </button>
          
          <button className="flex items-center gap-2 p-3 bg-bolt-elements-background-depth-1 rounded-lg hover:bg-bolt-elements-background-depth-2 transition-colors text-left">
            <div className="i-ph:chart-line text-green-500" />
            <div>
              <div className="text-sm font-medium text-bolt-elements-textPrimary">View Analytics</div>
              <div className="text-xs text-bolt-elements-textSecondary">Detailed project metrics</div>
            </div>
          </button>
          
          <button className="flex items-center gap-2 p-3 bg-bolt-elements-background-depth-1 rounded-lg hover:bg-bolt-elements-background-depth-2 transition-colors text-left">
            <div className="i-ph:warning-circle text-orange-500" />
            <div>
              <div className="text-sm font-medium text-bolt-elements-textPrimary">Review Risks</div>
              <div className="text-xs text-bolt-elements-textSecondary">Identify potential issues</div>
            </div>
          </button>
          
          <button className="flex items-center gap-2 p-3 bg-bolt-elements-background-depth-1 rounded-lg hover:bg-bolt-elements-background-depth-2 transition-colors text-left">
            <div className="i-ph:gear text-gray-500" />
            <div>
              <div className="text-sm font-medium text-bolt-elements-textPrimary">Settings</div>
              <div className="text-xs text-bolt-elements-textSecondary">Configure project settings</div>
            </div>
          </button>
        </div>
      </Card>
    </div>
  );
}
