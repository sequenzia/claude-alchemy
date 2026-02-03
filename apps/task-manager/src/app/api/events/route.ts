import { fileWatcher, type FileWatcherEvent, type ExecutionWatcherEvent } from '@/lib/fileWatcher'
import { getExecutionDir } from '@/lib/taskService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const taskListId = searchParams.get('taskListId')

  // Ensure file watcher is started
  if (!fileWatcher.isStarted()) {
    await fileWatcher.start()
  }

  // Watch the execution directory for this task list if it exists
  if (taskListId) {
    const execDir = await getExecutionDir(taskListId)
    if (execDir) {
      fileWatcher.watchExecutionDir(taskListId, execDir)
    }
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: {}\n\n`))

      // Handler for task events
      const handleTaskEvent = (event: FileWatcherEvent) => {
        // Filter by taskListId if specified
        if (taskListId && event.taskListId !== taskListId) {
          return
        }

        try {
          const data = JSON.stringify(event)
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`))
        } catch (error) {
          console.error('Error sending SSE event:', error)
        }
      }

      // Handler for execution context events
      const handleExecutionEvent = (event: ExecutionWatcherEvent) => {
        if (taskListId && event.taskListId !== taskListId) {
          return
        }

        try {
          const data = JSON.stringify(event)
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`))
        } catch (error) {
          console.error('Error sending execution SSE event:', error)
        }
      }

      // Subscribe to file watcher events
      fileWatcher.on('taskEvent', handleTaskEvent)
      fileWatcher.on('executionEvent', handleExecutionEvent)

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:heartbeat\n\n`))
        } catch {
          // Connection likely closed
          clearInterval(heartbeat)
        }
      }, 30000)

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        fileWatcher.off('taskEvent', handleTaskEvent)
        fileWatcher.off('executionEvent', handleExecutionEvent)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}
