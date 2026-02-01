'use client'

import { ScrollText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Task, TaskMetadata } from '@/types/task'

const priorityColors: Record<NonNullable<TaskMetadata['priority']>, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

function PriorityBadge({ priority }: { priority: NonNullable<TaskMetadata['priority']> }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityColors[priority]}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
    </span>
  )
}

const complexityColors: Record<NonNullable<TaskMetadata['complexity']>, string> = {
  XS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  S: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  M: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  L: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  XL: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
}

function ComplexityBadge({ complexity }: { complexity: NonNullable<TaskMetadata['complexity']> }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${complexityColors[complexity]}`}>
      {complexity}
    </span>
  )
}

interface TaskDetailProps {
  task: Task | null
  onClose: () => void
  onNavigateToTask?: (taskId: string) => void
  onOpenExecutionContext?: () => void
}

export function TaskDetail({ task, onClose, onNavigateToTask, onOpenExecutionContext }: TaskDetailProps) {
  if (!task) return null

  const statusDisplay = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
  }

  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground">#{task.id}</span>
            <span>{task.subject}</span>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  task.status === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : task.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {statusDisplay[task.status]}
              </span>
              {task.activeForm && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                  Active
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {task.description && (
            <div>
              <h4 className="text-sm font-medium mb-1">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {task.activeForm && (
            <div>
              <h4 className="text-sm font-medium mb-1">Active Form</h4>
              <p className="text-sm text-muted-foreground">{task.activeForm}</p>
            </div>
          )}

          {task.blockedBy.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">Blocked By</h4>
              <div className="flex flex-wrap gap-1">
                {task.blockedBy.map((id) => (
                  <button
                    key={id}
                    onClick={() => onNavigateToTask?.(id)}
                    className="text-sm text-red-600 hover:underline cursor-pointer"
                  >
                    #{id}
                  </button>
                ))}
              </div>
            </div>
          )}

          {task.blocks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">Blocks</h4>
              <div className="flex flex-wrap gap-1">
                {task.blocks.map((id) => (
                  <button
                    key={id}
                    onClick={() => onNavigateToTask?.(id)}
                    className="text-sm text-orange-600 hover:underline cursor-pointer"
                  >
                    #{id}
                  </button>
                ))}
              </div>
            </div>
          )}

          {task.metadata && Object.keys(task.metadata).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Metadata</h4>
              <div className="flex flex-wrap gap-2 mb-2">
                {task.metadata.priority && (
                  <PriorityBadge priority={task.metadata.priority} />
                )}
                {task.metadata.complexity && (
                  <ComplexityBadge complexity={task.metadata.complexity} />
                )}
                {task.metadata.phase !== undefined && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    Phase {task.metadata.phase}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {Object.entries(task.metadata)
                  .filter(([key]) => !['priority', 'complexity', 'phase'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

          {onOpenExecutionContext && (
            <div className="border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenExecutionContext}
                className="w-full"
              >
                <ScrollText className="h-4 w-4 mr-2" />
                View Execution Context
              </Button>
            </div>
          )}
      </DialogContent>
    </Dialog>
  )
}
