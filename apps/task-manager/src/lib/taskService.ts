import { readdir, readFile, access, stat } from 'node:fs/promises'
import { join, basename, resolve, relative } from 'node:path'
import { homedir } from 'node:os'
import type { Task, TaskList, TaskStatus } from '@/types/task'
import type { ExecutionContext, ExecutionArtifact, ExecutionProgress, TeamActivity, TeamMember, TeamActivityLogEntry } from '@/types/execution'

const TASKS_DIR = join(homedir(), '.claude', 'tasks')

function isValidTaskStatus(status: unknown): status is TaskStatus {
  return status === 'pending' || status === 'in_progress' || status === 'completed'
}

function parseTask(content: string, filename: string): Task | null {
  try {
    const data = JSON.parse(content)

    // Validate required fields
    if (typeof data.id !== 'string' && typeof data.id !== 'number') {
      data.id = basename(filename, '.json')
    } else {
      data.id = String(data.id)
    }

    if (typeof data.subject !== 'string') {
      console.warn(`Task ${data.id}: missing subject`)
      return null
    }

    // Normalize status
    if (!isValidTaskStatus(data.status)) {
      data.status = 'pending'
    }

    // Ensure arrays exist
    data.blocks = Array.isArray(data.blocks) ? data.blocks.map(String) : []
    data.blockedBy = Array.isArray(data.blockedBy) ? data.blockedBy.map(String) : []

    // Optional fields
    data.description = typeof data.description === 'string' ? data.description : ''
    if (data.activeForm !== undefined && typeof data.activeForm !== 'string') {
      delete data.activeForm
    }

    return data as Task
  } catch (error) {
    console.error(`Error parsing task file ${filename}:`, error)
    return null
  }
}

export async function getTaskLists(): Promise<TaskList[]> {
  try {
    await access(TASKS_DIR)
  } catch {
    console.warn(`Tasks directory not found: ${TASKS_DIR}`)
    return []
  }

  const entries = await readdir(TASKS_DIR, { withFileTypes: true })
  const taskLists: TaskList[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const dirPath = join(TASKS_DIR, entry.name)
    try {
      const files = await readdir(dirPath)
      const jsonFiles = files.filter((f) => f.endsWith('.json'))

      if (jsonFiles.length > 0) {
        taskLists.push({
          id: entry.name,
          name: entry.name,
          taskCount: jsonFiles.length,
        })
      }
    } catch (error) {
      console.warn(`Error reading directory ${dirPath}:`, error)
    }
  }

  return taskLists.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getTasks(taskListId: string): Promise<Task[]> {
  const dirPath = join(TASKS_DIR, taskListId)

  try {
    await access(dirPath)
  } catch {
    return []
  }

  const files = await readdir(dirPath)
  const jsonFiles = files.filter((f) => f.endsWith('.json'))
  const tasks: Task[] = []

  for (const file of jsonFiles) {
    try {
      const content = await readFile(join(dirPath, file), 'utf-8')
      const task = parseTask(content, file)
      if (task) {
        tasks.push(task)
      }
    } catch (error) {
      console.warn(`Error reading task file ${file}:`, error)
    }
  }

  // Sort by ID numerically if possible, otherwise alphabetically
  return tasks.sort((a, b) => {
    const aNum = parseInt(a.id, 10)
    const bNum = parseInt(b.id, 10)
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum
    }
    return a.id.localeCompare(b.id)
  })
}

export async function getTask(
  taskListId: string,
  taskId: string
): Promise<Task | null> {
  const filePath = join(TASKS_DIR, taskListId, `${taskId}.json`)

  try {
    const content = await readFile(filePath, 'utf-8')
    return parseTask(content, `${taskId}.json`)
  } catch {
    return null
  }
}

export function getTasksDir(): string {
  return TASKS_DIR
}

/**
 * Resolve the execution directory from an execution_pointer.md file.
 * The pointer contains an absolute path to the session folder
 * (e.g., the absolute path to `.claude/session/__live_session__/`).
 * Returns null if the resolved path escapes the home directory (path traversal).
 */
function resolveExecutionDir(pointerContent: string): string | null {
  const raw = pointerContent.trim()
  if (!raw) return null

  const home = homedir()
  const resolved = raw.startsWith('/') ? resolve(raw) : resolve(home, raw)

  // Guard against path traversal — execution dir must be under home
  const rel = relative(home, resolved)
  if (rel.startsWith('..') || resolve(home, rel) !== resolved) {
    console.warn(`Execution pointer path escapes home directory: ${raw}`)
    return null
  }

  return resolved
}

/**
 * Resolve the execution directory path for a given task list.
 * Returns null if the pointer doesn't exist or the path is invalid.
 */
export async function getExecutionDir(
  taskListId: string
): Promise<string | null> {
  const pointerPath = join(TASKS_DIR, taskListId, 'execution_pointer.md')

  let pointerContent: string
  try {
    pointerContent = await readFile(pointerPath, 'utf-8')
  } catch {
    return null
  }

  return resolveExecutionDir(pointerContent)
}

function parseProgressMd(content: string): ExecutionProgress | null {
  try {
    const statusMatch = content.match(/Status:\s*(.+)/)
    const updatedMatch = content.match(/Updated:\s*(.+)/)
    if (!statusMatch || !updatedMatch) return null

    const status = statusMatch[1].trim()
    const updated = updatedMatch[1].trim()

    // Detect old format (has "Current Task:" instead of "## Active Tasks")
    const isOldFormat = /Current Task:/.test(content) && !/## Active Tasks/.test(content)

    if (isOldFormat) {
      const currentTaskMatch = content.match(/Current Task:\s*\[(\d+)\]\s*(.+?)(?:\s*\(.+\))?\s*$/)
      const phaseMatch = content.match(/Phase:\s*(.+)/)
      const activeTasks = currentTaskMatch
        ? [{ id: currentTaskMatch[1], subject: currentTaskMatch[2].trim(), phase: phaseMatch ? phaseMatch[1].trim() : '' }]
        : []

      return {
        status,
        wave: 1,
        totalWaves: 1,
        updated,
        activeTasks,
        completedTasks: [],
      }
    }

    // New format
    const waveMatch = content.match(/Wave:\s*(\d+)\s*of\s*(\d+)/)
    const maxParallelMatch = content.match(/Max Parallel:\s*(\d+)/)

    const wave = waveMatch ? parseInt(waveMatch[1], 10) : 1
    const totalWaves = waveMatch ? parseInt(waveMatch[2], 10) : 1
    const maxParallel = maxParallelMatch ? parseInt(maxParallelMatch[1], 10) : undefined

    const activeTasks: ExecutionProgress['activeTasks'] = []
    const activeSection = content.match(/## Active Tasks\n([\s\S]*?)(?=\n##|$)/)
    if (activeSection) {
      const lines = activeSection[1].trim().split('\n')
      for (const line of lines) {
        const m = line.match(/^- \[(\d+)\]\s*(.+?)\s*—\s*(.+)$/)
        if (m) {
          activeTasks.push({ id: m[1], subject: m[2].trim(), phase: m[3].trim() })
        }
      }
    }

    const completedTasks: ExecutionProgress['completedTasks'] = []
    const completedSection = content.match(/## Completed This Session\n([\s\S]*?)(?=\n##|$)/)
    if (completedSection) {
      const lines = completedSection[1].trim().split('\n')
      for (const line of lines) {
        const m = line.match(/^- \[(\d+)\]\s*(.+?)\s*—\s*(.+)$/)
        if (m) {
          completedTasks.push({ id: m[1], subject: m[2].trim(), result: m[3].trim() })
        }
      }
    }

    return { status, wave, totalWaves, maxParallel, updated, activeTasks, completedTasks }
  } catch {
    return null
  }
}

export function parseTeamActivityMd(content: string, taskId: string): TeamActivity | null {
  try {
    const teamNameMatch = content.match(/^Team:\s+(.+)$/m)
    const strategyMatch = content.match(/^Strategy:\s+(review|research|full)$/m)
    const statusMatch = content.match(/^Status:\s+(active|completed|failed|degraded)$/m)
    const createdMatch = content.match(/^Created:\s+(.+)$/m)
    const updatedMatch = content.match(/^Updated:\s+(.+)$/m)

    // Require at minimum team name and strategy for a valid parse
    if (!teamNameMatch || !strategyMatch) return null

    const teamName = teamNameMatch[1].trim()
    const strategy = strategyMatch[1].trim() as TeamActivity['strategy']
    const status = statusMatch ? statusMatch[1].trim() as TeamActivity['status'] : 'active'
    const created = createdMatch ? createdMatch[1].trim() : ''
    const updated = updatedMatch ? updatedMatch[1].trim() : ''

    // Parse team members: - [{role}] {name} — {status} — {phase}
    const members: TeamMember[] = []
    const memberPattern = /^-\s+\[(\w+)\]\s+(\S+)\s+\u2014\s+(\w+)\s+\u2014\s+(.+)$/gm
    let memberMatch: RegExpExecArray | null
    while ((memberMatch = memberPattern.exec(content)) !== null) {
      members.push({
        role: memberMatch[1].trim() as TeamMember['role'],
        name: memberMatch[2].trim(),
        status: memberMatch[3].trim() as TeamMember['status'],
        currentPhase: memberMatch[4].trim(),
      })
    }

    // Parse activity log entries: {timestamp} | {role} | {event}
    const activityLog: TeamActivityLogEntry[] = []
    const logPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+\|\s+(\w+)\s+\|\s+(.+)$/gm
    let logMatch: RegExpExecArray | null
    while ((logMatch = logPattern.exec(content)) !== null) {
      activityLog.push({
        timestamp: logMatch[1].trim(),
        role: logMatch[2].trim(),
        event: logMatch[3].trim(),
      })
    }

    return {
      taskId,
      teamName,
      strategy,
      status,
      created,
      updated,
      members,
      activityLog,
    }
  } catch {
    return null
  }
}

export async function getExecutionContext(
  taskListId: string
): Promise<ExecutionContext | null> {
  const listDir = join(TASKS_DIR, taskListId)
  const pointerPath = join(listDir, 'execution_pointer.md')

  let pointerContent: string
  try {
    pointerContent = await readFile(pointerPath, 'utf-8')
  } catch {
    // No pointer file — no execution context
    return null
  }

  const execDir = resolveExecutionDir(pointerContent)
  if (!execDir) return null

  try {
    await access(execDir)
  } catch {
    console.warn(`Execution directory not found: ${execDir}`)
    return null
  }

  const entries = await readdir(execDir)
  const mdFiles = entries.filter((f) => f.endsWith('.md'))

  const allArtifacts: ExecutionArtifact[] = []
  for (const file of mdFiles) {
    const filePath = join(execDir, file)
    try {
      const [content, fileStat] = await Promise.all([
        readFile(filePath, 'utf-8'),
        stat(filePath),
      ])
      allArtifacts.push({
        name: basename(file, '.md'),
        content,
        lastModified: fileStat.mtimeMs,
      })
    } catch (error) {
      console.warn(`Error reading execution artifact ${file}:`, error)
    }
  }

  // Filter out temporary per-wave context files (but keep team activity files)
  const artifacts = allArtifacts.filter(a => !a.name.startsWith('context-task-'))

  if (artifacts.length === 0) return null

  const progressArtifact = artifacts.find(a => a.name === 'progress')
  const progress = progressArtifact ? parseProgressMd(progressArtifact.content) : null

  // Parse team activity files into structured data
  const teamActivityPattern = /^team_activity_task-(.+?)(?:-degraded-\d+)?$/
  const teamActivityGroupPattern = /^team_activity_group-(.+)$/
  const teamActivities: TeamActivity[] = []

  for (const artifact of artifacts) {
    const taskMatch = artifact.name.match(teamActivityPattern)
    const groupMatch = artifact.name.match(teamActivityGroupPattern)
    if (taskMatch || groupMatch) {
      const taskId = taskMatch ? taskMatch[1] : (groupMatch ? groupMatch[1] : artifact.name)
      try {
        const parsed = parseTeamActivityMd(artifact.content, taskId)
        if (parsed) {
          teamActivities.push(parsed)
        }
      } catch {
        // Parse failure — skip gracefully, artifact remains in list as raw
      }
    }
  }

  // Sort: execution_context first, then task_log, execution_plan, session_summary,
  // progress, team_activity files, rest alpha
  const isTeamActivity = (name: string) =>
    name.startsWith('team_activity_task-') || name.startsWith('team_activity_group-')

  const order = ['execution_context', 'task_log', 'execution_plan', 'session_summary', 'progress']
  artifacts.sort((a, b) => {
    const ai = order.indexOf(a.name)
    const bi = order.indexOf(b.name)
    const aIsTeam = isTeamActivity(a.name)
    const bIsTeam = isTeamActivity(b.name)

    // Both in explicit order list
    if (ai !== -1 && bi !== -1) return ai - bi
    // One in explicit order list
    if (ai !== -1 && !aIsTeam) return -1
    if (bi !== -1 && !bIsTeam) return 1
    // Team activity files sort after ordered items but before other artifacts
    if (aIsTeam && bIsTeam) return a.name.localeCompare(b.name)
    if (aIsTeam) return bi !== -1 ? 1 : -1
    if (bIsTeam) return ai !== -1 ? -1 : 1
    // Remaining artifacts sort alphabetically
    return a.name.localeCompare(b.name)
  })

  return {
    executionDir: execDir,
    artifacts,
    progress,
    teamActivities: teamActivities.length > 0 ? teamActivities : undefined,
  }
}
