'use client'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { ExecutionContext, ExecutionProgress } from '@/types/execution'

interface ExecutionDialogProps {
  executionContext: ExecutionContext | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TAB_LABELS: Record<string, string> = {
  execution_context: 'Context',
  task_log: 'Log',
  execution_plan: 'Plan',
  session_summary: 'Summary',
  progress: 'Progress',
}

const TAB_ORDER = ['execution_plan', 'progress', 'execution_context', 'task_log', 'session_summary']

function getTabLabel(name: string): string {
  return TAB_LABELS[name] ?? name.replace(/_/g, ' ')
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Initializing: 'bg-muted text-muted-foreground',
    Executing: 'bg-chart-2/15 text-chart-2',
    Complete: 'bg-chart-1/15 text-chart-1',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {status}
    </span>
  )
}

function ProgressView({ progress }: { progress: ExecutionProgress }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <StatusBadge status={progress.status} />
        <span className="text-sm text-muted-foreground">
          Wave {progress.wave} of {progress.totalWaves}
        </span>
        {progress.maxParallel && (
          <span className="text-sm text-muted-foreground">
            Max parallel: {progress.maxParallel}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          Updated: {progress.updated}
        </span>
      </div>

      {progress.activeTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Active Tasks</h4>
          <div className="space-y-1.5">
            {progress.activeTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-chart-2" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  [{task.id}]
                </span>
                <span className="font-medium truncate">{task.subject}</span>
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                  {task.phase}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {progress.completedTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">
            Completed ({progress.completedTasks.length})
          </h4>
          <div className="space-y-1.5">
            {progress.completedTasks.map((task) => {
              const isPassing = task.result.startsWith('PASS')
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isPassing
                        ? 'bg-chart-2/15 text-chart-2'
                        : 'bg-destructive/15 text-destructive'
                    }`}
                  >
                    {isPassing ? 'PASS' : 'FAIL'}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    [{task.id}]
                  </span>
                  <span className="truncate">{task.subject}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {task.result.replace(/^(PASS|FAIL)\s*/, '')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function ExecutionDialog({
  executionContext,
  open,
  onOpenChange,
}: ExecutionDialogProps) {
  if (!executionContext) return null

  const { artifacts, progress } = executionContext
  const sortedArtifacts = [...artifacts].sort((a, b) => {
    const ai = TAB_ORDER.indexOf(a.name)
    const bi = TAB_ORDER.indexOf(b.name)
    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
  })
  const defaultTab = sortedArtifacts.find(a => a.name === 'execution_plan')?.name ?? sortedArtifacts[0]?.name ?? ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-full h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Execution Details</DialogTitle>
          <DialogDescription>
            Details from the current task execution session
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="flex-1 min-h-0">
          <TabsList variant="line">
            {sortedArtifacts.map((artifact) => (
              <TabsTrigger key={artifact.name} value={artifact.name}>
                {getTabLabel(artifact.name)}
              </TabsTrigger>
            ))}
          </TabsList>

          {sortedArtifacts.map((artifact) => (
            <TabsContent
              key={artifact.name}
              value={artifact.name}
              className="flex-1 min-h-0 overflow-y-auto mt-4"
              style={{ maxHeight: 'calc(85vh - 200px)' }}
            >
              {artifact.name === 'progress' && progress ? (
                <ProgressView progress={progress} />
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:border [&_table]:w-full [&_th]:border [&_td]:border [&_th]:border-border [&_td]:border-border [&_th]:bg-muted">
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {artifact.content}
                  </Markdown>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
