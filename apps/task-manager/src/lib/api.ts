import type { Task, TaskList } from '@/types/task'
import type { ExecutionContext } from '@/types/execution'

const API_BASE = '/api'

export interface TaskListsResponse {
  taskLists: TaskList[]
}

export interface TasksResponse {
  tasks: Task[]
}

export interface ExecutionContextResponse {
  executionContext: ExecutionContext | null
}

export async function fetchTaskLists(): Promise<TaskList[]> {
  const response = await fetch(`${API_BASE}/task-lists`)
  if (!response.ok) {
    throw new Error(`Failed to fetch task lists: ${response.statusText}`)
  }
  const data: TaskListsResponse = await response.json()
  return data.taskLists
}

export async function fetchTasks(taskListId: string): Promise<Task[]> {
  const response = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskListId)}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.statusText}`)
  }
  const data: TasksResponse = await response.json()
  return data.tasks
}

export async function fetchExecutionContext(
  taskListId: string
): Promise<ExecutionContext | null> {
  const response = await fetch(
    `${API_BASE}/execution-context/${encodeURIComponent(taskListId)}`
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch execution context: ${response.statusText}`)
  }
  const data: ExecutionContextResponse = await response.json()
  return data.executionContext
}
