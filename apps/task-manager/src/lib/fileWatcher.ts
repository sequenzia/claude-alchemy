import { watch, type FSWatcher } from 'chokidar'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, basename, dirname, relative } from 'node:path'
import type { Task, SSEEventType, ExecutionSSEEventType } from '@/types/task'

export interface FileWatcherEvent {
  type: SSEEventType
  taskListId: string
  taskId: string
  task?: Task
}

export interface ExecutionWatcherEvent {
  type: ExecutionSSEEventType
  taskListId: string
}

export class FileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null
  private readonly basePath: string
  private started = false

  constructor() {
    super()
    this.basePath = join(homedir(), '.claude', 'tasks')
  }

  async start(): Promise<void> {
    if (this.started) {
      return
    }

    // Watch the base directory directly - more reliable than glob patterns
    this.watcher = watch(this.basePath, {
      persistent: true,
      ignoreInitial: true,
      usePolling: true,
      interval: 300,
      depth: 2,
    })

    this.watcher
      .on('add', (path) => {
        if (path.endsWith('.json')) {
          this.handleFileChange('task:created', path)
        } else if (this.isExecutionFile(path)) {
          this.handleExecutionChange(path)
        }
      })
      .on('change', (path) => {
        if (path.endsWith('.json')) {
          this.handleFileChange('task:updated', path)
        } else if (this.isExecutionFile(path)) {
          this.handleExecutionChange(path)
        }
      })
      .on('unlink', (path) => {
        if (path.endsWith('.json')) {
          this.handleFileDelete(path)
        } else if (this.isExecutionFile(path)) {
          this.handleExecutionChange(path)
        }
      })
      .on('error', (error) => console.error('File watcher error:', error))

    this.started = true
    console.log(`File watcher started: watching ${this.basePath}`)
  }

  private async handleFileChange(
    type: 'task:created' | 'task:updated',
    filePath: string
  ): Promise<void> {
    try {
      const taskId = basename(filePath, '.json')
      const taskListId = basename(dirname(filePath))

      const content = await readFile(filePath, 'utf-8')
      const task = JSON.parse(content) as Task

      const event: FileWatcherEvent = {
        type,
        taskListId,
        taskId,
        task,
      }

      this.emit('taskEvent', event)
    } catch (error) {
      console.error(`Error processing file change: ${filePath}`, error)
    }
  }

  private isExecutionFile(filePath: string): boolean {
    return filePath.endsWith('.md') || filePath.endsWith('.txt')
  }

  private handleExecutionChange(filePath: string): void {
    // Determine which task list this file belongs to.
    // Files are under ~/.claude/tasks/<listId>/ (depth 1 for pointer)
    // or could be watched externally. We derive the listId from the
    // relative path to the basePath.
    const rel = relative(this.basePath, filePath)
    const taskListId = rel.split('/')[0]
    if (!taskListId) return

    const event: ExecutionWatcherEvent = {
      type: 'execution:updated',
      taskListId,
    }
    this.emit('executionEvent', event)
  }

  private handleFileDelete(filePath: string): void {
    const taskId = basename(filePath, '.json')
    const taskListId = basename(dirname(filePath))

    const event: FileWatcherEvent = {
      type: 'task:deleted',
      taskListId,
      taskId,
    }

    this.emit('taskEvent', event)
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
      this.started = false
      console.log('File watcher stopped')
    }
  }

  getBasePath(): string {
    return this.basePath
  }

  isStarted(): boolean {
    return this.started
  }
}

// Global singleton pattern for development hot reload
// This prevents multiple file watchers from being created during Next.js HMR
const globalForWatcher = globalThis as unknown as {
  fileWatcher: FileWatcher | undefined
}

export const fileWatcher = globalForWatcher.fileWatcher ?? new FileWatcher()

if (process.env.NODE_ENV !== 'production') {
  globalForWatcher.fileWatcher = fileWatcher
}
