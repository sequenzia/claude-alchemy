export interface ExecutionArtifact {
  name: string
  content: string
  lastModified: number
}

export interface ActiveTask {
  id: string
  subject: string
  phase: string
}

export interface CompletedTask {
  id: string
  subject: string
  result: string
}

export interface TeamMember {
  role: 'explorer' | 'implementer' | 'reviewer'
  name: string
  status: 'waiting' | 'active' | 'completed' | 'failed'
  currentPhase: string
}

export interface TeamActivityLogEntry {
  timestamp: string
  role: string
  event: string
}

export interface TeamActivity {
  taskId: string
  teamName: string
  strategy: 'solo' | 'review' | 'research' | 'full'
  status: 'active' | 'completed' | 'failed' | 'degraded'
  created: string
  updated: string
  members: TeamMember[]
  activityLog: TeamActivityLogEntry[]
}

export interface ExecutionProgress {
  status: string
  wave: number
  totalWaves: number
  maxParallel?: number
  updated: string
  activeTasks: ActiveTask[]
  completedTasks: CompletedTask[]
  activeTeams?: Array<{
    taskId: string
    teamName: string
    strategy: string
    memberCount: number
    status: string
  }>
}

export interface ExecutionContext {
  executionDir: string
  artifacts: ExecutionArtifact[]
  progress?: ExecutionProgress | null
  teamActivities?: TeamActivity[]
}
