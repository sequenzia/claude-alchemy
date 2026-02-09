'use client'

import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronRight, Search, Wrench, ShieldCheck } from 'lucide-react'
import * as Collapsible from '@radix-ui/react-collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type {
  ExecutionContext,
  ExecutionProgress,
  TeamActivity,
  TeamActivityLogEntry,
  TeamMember,
} from '@/types/execution'

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
  if (TAB_LABELS[name]) return TAB_LABELS[name]

  // Team activity files: team_activity_task-{id} -> "Team: Task {id}"
  const taskTeamMatch = name.match(/^team_activity_task-(.+?)(?:-degraded-\d+)?$/)
  if (taskTeamMatch) {
    const degradedMatch = name.match(/-degraded-(\d+)$/)
    const suffix = degradedMatch ? ` (deg ${degradedMatch[1]})` : ''
    return `Team: Task ${taskTeamMatch[1]}${suffix}`
  }

  // Group team activity: team_activity_group-{name} -> "Team: {name}"
  const groupTeamMatch = name.match(/^team_activity_group-(.+)$/)
  if (groupTeamMatch) return `Team: ${groupTeamMatch[1]}`

  return name.replace(/_/g, ' ')
}

const ROLE_COLORS: Record<string, string> = {
  explorer: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  implementer: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  reviewer: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
}

const ROLE_TIMELINE_COLORS: Record<string, { dot: string, line: string, text: string }> = {
  explorer: { dot: 'bg-blue-500', line: 'bg-blue-500/30', text: 'text-blue-600 dark:text-blue-400' },
  implementer: { dot: 'bg-amber-500', line: 'bg-amber-500/30', text: 'text-amber-600 dark:text-amber-400' },
  reviewer: { dot: 'bg-purple-500', line: 'bg-purple-500/30', text: 'text-purple-600 dark:text-purple-400' },
}

const MEMBER_STATUS_INDICATOR: Record<string, { dot: string, label: string }> = {
  active: { dot: 'bg-chart-2', label: 'Active' },
  completed: { dot: 'bg-chart-1', label: 'Completed' },
  waiting: { dot: 'bg-muted-foreground/50', label: 'Waiting' },
  failed: { dot: 'bg-destructive', label: 'Failed' },
}

const STRATEGY_BADGE_STYLES: Record<string, string> = {
  review: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  research: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  full: 'bg-green-500/15 text-green-600 dark:text-green-400',
}

const STRATEGY_TOOLTIPS: Record<string, string> = {
  review: 'Implementer + Reviewer',
  research: 'Explorer + Implementer',
  full: 'Explorer + Implementer + Reviewer',
}

const ROLE_ICONS: Record<string, typeof Search> = {
  explorer: Search,
  implementer: Wrench,
  reviewer: ShieldCheck,
}

const ROLE_PHASES: Record<string, string[]> = {
  explorer: ['Reconnaissance', 'Deep Exploration', 'Findings Report'],
  implementer: ['Understanding', 'Implementation', 'Self-Verification', 'Report'],
  reviewer: ['Code Review', 'Test Verification', 'Review Report'],
}

const MAX_VISIBLE_LOG_ENTRIES = 50

function StrategyBadge({ strategy }: { strategy: TeamActivity['strategy'] }) {
  // Solo strategy: no badge
  if (strategy === 'solo') return null

  const colors = STRATEGY_BADGE_STYLES[strategy] ?? 'bg-muted text-muted-foreground'
  const tooltip = STRATEGY_TOOLTIPS[strategy]

  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors}`}
      title={tooltip}
    >
      {strategy}
    </span>
  )
}

function RoleBadge({ role }: { role: TeamMember['role'] }) {
  const colors = ROLE_COLORS[role] ?? 'bg-muted text-muted-foreground'
  const Icon = ROLE_ICONS[role]
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors}`}
    >
      {Icon && <Icon className="h-2.5 w-2.5" />}
      {role}
    </span>
  )
}

function MemberStatusDot({ status }: { status: TeamMember['status'] }) {
  const indicator = MEMBER_STATUS_INDICATOR[status] ?? MEMBER_STATUS_INDICATOR.waiting
  const isActive = status === 'active'

  return (
    <span className="relative flex h-2 w-2 shrink-0" title={indicator.label}>
      {isActive && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${indicator.dot} opacity-75`} />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${indicator.dot}`} />
    </span>
  )
}

function PhaseIndicator({ member }: { member: TeamMember }) {
  const phases = ROLE_PHASES[member.role]
  if (!phases) return null

  const currentIndex = member.currentPhase
    ? phases.findIndex(p => member.currentPhase.toLowerCase().includes(p.toLowerCase()))
    : -1

  // Determine completed index based on member status
  const completedIndex = member.status === 'completed'
    ? phases.length - 1
    : member.status === 'waiting'
      ? -1
      : currentIndex

  return (
    <div className="flex items-center gap-0.5 mt-1">
      {phases.map((phase, i) => {
        const isCompleted = i < completedIndex || (i === completedIndex && member.status === 'completed')
        const isCurrent = i === currentIndex && member.status === 'active'
        const isPending = !isCompleted && !isCurrent

        return (
          <div key={phase} className="flex items-center gap-0.5">
            {i > 0 && (
              <div className={`h-px w-2 ${isCompleted ? 'bg-chart-2' : 'bg-border'}`} />
            )}
            <div className="flex items-center" title={phase}>
              <div
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  isCompleted
                    ? 'bg-chart-2'
                    : isCurrent
                      ? 'bg-chart-2 ring-2 ring-chart-2/30'
                      : 'bg-muted-foreground/30'
                }`}
              />
              <span
                className={`ml-1 text-[9px] leading-none whitespace-nowrap ${
                  isPending
                    ? 'text-muted-foreground/50'
                    : isCurrent
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                }`}
              >
                {phase}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ActivityTimeline({ entries }: { entries: TeamActivityLogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showAll, setShowAll] = useState(false)

  const isTruncated = entries.length > MAX_VISIBLE_LOG_ENTRIES
  const visibleEntries = showAll ? entries : entries.slice(-MAX_VISIBLE_LOG_ENTRIES)

  // Auto-scroll to the latest entry when new entries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  if (entries.length === 0) {
    return (
      <div className="py-3 text-center text-xs text-muted-foreground">
        No activity recorded yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {isTruncated && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground py-1 transition-colors"
        >
          {entries.length - MAX_VISIBLE_LOG_ENTRIES} older entries hidden - click to show all
        </button>
      )}
      <div
        ref={scrollRef}
        className="max-h-48 overflow-y-auto space-y-0"
      >
        {visibleEntries.map((entry, i) => {
          const roleKey = entry.role.toLowerCase()
          const colors = ROLE_TIMELINE_COLORS[roleKey] ?? {
            dot: 'bg-muted-foreground',
            line: 'bg-muted-foreground/30',
            text: 'text-muted-foreground',
          }
          const isLast = i === visibleEntries.length - 1

          return (
            <div key={`${entry.timestamp}-${i}`} className="flex gap-2 text-[11px]">
              {/* Timeline spine */}
              <div className="flex flex-col items-center w-3 shrink-0">
                <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${colors.dot}`} />
                {!isLast && (
                  <div className={`w-px flex-1 min-h-3 ${colors.line}`} />
                )}
              </div>
              {/* Entry content */}
              <div className="pb-2 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-muted-foreground/60 font-mono text-[10px] shrink-0">
                    {entry.timestamp}
                  </span>
                  <span className={`font-medium text-[10px] uppercase shrink-0 ${colors.text}`}>
                    {entry.role}
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 leading-snug break-words">
                  {entry.event}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActivitySummary({ members, activityLog }: { members: TeamMember[], activityLog: TeamActivityLogEntry[] }) {
  // Show most recent activity entry for each agent role
  const latestByRole = new Map<string, TeamActivityLogEntry>()
  for (const entry of activityLog) {
    latestByRole.set(entry.role.toLowerCase(), entry)
  }

  if (latestByRole.size === 0) return null

  return (
    <div className="space-y-0.5">
      {members.map((member) => {
        const latest = latestByRole.get(member.role)
        if (!latest) return null
        const colors = ROLE_TIMELINE_COLORS[member.role] ?? {
          dot: 'bg-muted-foreground',
          line: 'bg-muted-foreground/30',
          text: 'text-muted-foreground',
        }

        return (
          <div key={member.role} className="flex items-center gap-1.5 text-[10px]">
            <span className={`h-1 w-1 rounded-full shrink-0 ${colors.dot}`} />
            <span className={`font-medium uppercase shrink-0 ${colors.text}`}>
              {member.role}
            </span>
            <span className="text-muted-foreground truncate">
              {latest.event}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function TeamMemberRow({ member }: { member: TeamMember }) {
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2 text-xs">
        <MemberStatusDot status={member.status} />
        <RoleBadge role={member.role} />
        <span className="text-muted-foreground truncate">{member.name}</span>
        {member.currentPhase && member.status !== 'waiting' && (
          <span className="ml-auto text-muted-foreground shrink-0">
            {member.currentPhase}
          </span>
        )}
      </div>
      {member.status !== 'waiting' && (
        <div className="ml-4">
          <PhaseIndicator member={member} />
        </div>
      )}
    </div>
  )
}

function TeamSection({ team }: { team: TeamActivity }) {
  const [open, setOpen] = useState(false)
  const activeCount = team.members.filter(m => m.status === 'active').length
  const completedCount = team.members.filter(m => m.status === 'completed').length

  const statusSummary = activeCount > 0
    ? `${activeCount} active`
    : completedCount === team.members.length
      ? 'all completed'
      : `${completedCount}/${team.members.length} done`

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger asChild>
        <button
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${open ? 'Collapse' : 'Expand'} team ${team.teamName} details`}
        >
          <ChevronRight
            className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          />
          <span className="text-muted-foreground">Team:</span>
          <span className="font-medium">{team.teamName}</span>
          <StrategyBadge strategy={team.strategy} />
          <span className="text-muted-foreground">
            {team.members.length} {team.members.length === 1 ? 'agent' : 'agents'}
          </span>
          <span className="ml-auto text-muted-foreground">{statusSummary}</span>
        </button>
      </Collapsible.Trigger>

      {/* Collapsed: show activity summary with most recent entry per agent */}
      {!open && team.activityLog.length > 0 && (
        <div className="ml-8 pl-3 py-1">
          <ActivitySummary members={team.members} activityLog={team.activityLog} />
        </div>
      )}

      <Collapsible.Content>
        <div className="ml-6 border-l border-border pl-3 pb-1">
          {/* Agent members with phase indicators */}
          <div className="space-y-0.5">
            {team.members.map((member) => (
              <TeamMemberRow key={`${member.role}-${member.name}`} member={member} />
            ))}
          </div>

          {/* Activity timeline */}
          {team.activityLog.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <h5 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                Activity Timeline
              </h5>
              <ActivityTimeline entries={team.activityLog} />
            </div>
          )}

          {/* Empty state for newly created teams */}
          {team.activityLog.length === 0 && team.members.every(m => m.status === 'waiting') && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground text-center py-2">
                Team created - waiting for agents to start
              </p>
            </div>
          )}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
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

function ProgressView({
  progress,
  teamActivities,
}: {
  progress: ExecutionProgress
  teamActivities?: TeamActivity[]
}) {
  // Build a lookup from taskId to team activity for quick matching
  const teamByTaskId = new Map<string, TeamActivity>()
  if (teamActivities) {
    for (const team of teamActivities) {
      // Only show active teams in the progress view; completed/failed are historical
      if (team.status === 'active' || team.status === 'degraded') {
        teamByTaskId.set(team.taskId, team)
      }
    }
  }

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
            {progress.activeTasks.map((task) => {
              const team = teamByTaskId.get(task.id)
              return (
                <div key={task.id}>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-chart-2" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      [{task.id}]
                    </span>
                    <span className="font-medium truncate">{task.subject}</span>
                    {team && <StrategyBadge strategy={team.strategy} />}
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {task.phase}
                    </span>
                  </div>
                  {team && (
                    <div className="mt-0.5">
                      <TeamSection team={team} />
                    </div>
                  )}
                </div>
              )
            })}
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

  const { artifacts, progress, teamActivities } = executionContext
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
                <ProgressView progress={progress} teamActivities={teamActivities} />
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
