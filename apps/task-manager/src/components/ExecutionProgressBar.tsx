'use client'

import { ScrollText, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ExecutionProgress } from '@/types/execution'

interface ExecutionProgressBarProps {
  progress: ExecutionProgress | null | undefined
  hasExecContext: boolean
  onClick: () => void
}

export function ExecutionProgressBar({
  progress,
  hasExecContext,
  onClick,
}: ExecutionProgressBarProps) {
  if (progress?.status === 'Executing') {
    const activeCount = progress.activeTasks.length
    const doneCount = progress.completedTasks.length

    // Count active teams (non-solo strategies only)
    const activeTeams = progress.activeTeams?.filter(
      (t) => t.strategy !== 'solo' && t.status === 'active'
    ) ?? []
    const teamCount = activeTeams.length
    const totalAgents = activeTeams.reduce((sum, t) => sum + t.memberCount, 0)
    const hasTeams = teamCount > 0

    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-chart-2" />
        </span>
        <span className="text-muted-foreground">
          Wave {progress.wave}/{progress.totalWaves}
        </span>
        <span className="text-border">|</span>
        {hasTeams ? (
          <>
            <span className="text-foreground font-medium">
              {activeCount} {activeCount === 1 ? 'task' : 'tasks'}
            </span>
            <span className="text-border">|</span>
            <span className="inline-flex items-center gap-1 text-foreground font-medium">
              <Users className="h-3.5 w-3.5" />
              {totalAgents} {totalAgents === 1 ? 'agent' : 'agents'}
            </span>
          </>
        ) : (
          <span className="text-foreground font-medium">{activeCount} active</span>
        )}
        <span className="text-border">|</span>
        <span className="text-muted-foreground">{doneCount} done</span>
      </button>
    )
  }

  if (!hasExecContext) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      title="View execution context"
    >
      <ScrollText className="h-5 w-5" />
      <span className="sr-only">View execution context</span>
    </Button>
  )
}
