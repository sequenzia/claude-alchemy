export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export interface TaskMetadata {
  priority?: 'critical' | 'high' | 'medium' | 'low'
  complexity?: 'XS' | 'S' | 'M' | 'L' | 'XL'
  source_section?: string
  prd_path?: string
  feature_name?: string
  task_uid?: string
  phase?: number
  [key: string]: unknown
}

export interface Task {
  id: string
  subject: string
  description: string
  activeForm?: string
  status: TaskStatus
  blocks: string[]
  blockedBy: string[]
  metadata?: TaskMetadata
}

export interface TaskList {
  id: string
  name: string
  taskCount: number
}

export type SSEEventType = 'task:created' | 'task:updated' | 'task:deleted'
export type ExecutionSSEEventType = 'execution:updated'

export interface SSEEvent {
  type: SSEEventType
  taskListId: string
  taskId: string
  task?: Task
}

export interface ExecutionSSEEvent {
  type: ExecutionSSEEventType
  taskListId: string
}
