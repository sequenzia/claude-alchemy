'use client'

import { useState } from 'react'
import { ScrollText } from 'lucide-react'
import { KanbanBoard } from '@/components/KanbanBoard'
import { SummaryStats } from '@/components/SummaryStats'
import { TaskDetail } from '@/components/TaskDetail'
import { TaskListSelector } from '@/components/TaskListSelector'
import { SearchInput } from '@/components/SearchInput'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ExecutionDialog } from '@/components/ExecutionDialog'
import { Button } from '@/components/ui/button'
import { useTasks } from '@/hooks/useTasks'
import { useExecutionContext } from '@/hooks/useExecutionContext'
import { useSSE } from '@/hooks/useSSE'
import type { Task, TaskList } from '@/types/task'
import type { ExecutionContext } from '@/types/execution'

interface TaskBoardClientProps {
  listId: string
  initialTasks: Task[]
  taskLists: TaskList[]
  initialExecutionContext?: ExecutionContext | null
}

export function TaskBoardClient({
  listId,
  initialTasks,
  taskLists,
  initialExecutionContext,
}: TaskBoardClientProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false)

  // Use TanStack Query with initial data from server
  const { data: tasks } = useTasks(listId, initialTasks)
  const { data: executionContext } = useExecutionContext(listId, initialExecutionContext)

  // Enable SSE for real-time updates
  useSSE(listId)

  const currentTasks = tasks ?? initialTasks
  const hasExecContext = !!executionContext

  const handleNavigateToTask = (taskId: string) => {
    const task = currentTasks.find((t) => t.id === taskId)
    if (task) {
      setSelectedTask(task)
    }
  }

  return (
    <>
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-bold">Claude Task Manager</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <TaskListSelector taskLists={taskLists} currentListId={listId} />
            <SearchInput value={searchQuery} onChange={setSearchQuery} />
            {hasExecContext && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExecutionDialogOpen(true)}
                title="View execution context"
              >
                <ScrollText className="h-5 w-5" />
                <span className="sr-only">View execution context</span>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      {currentTasks.length > 0 && <SummaryStats tasks={currentTasks} />}
      <main style={{ height: currentTasks.length > 0 ? 'calc(100vh - 121px)' : 'calc(100vh - 65px)' }}>
        {currentTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No tasks found</p>
          </div>
        ) : (
          <KanbanBoard
            tasks={currentTasks}
            searchQuery={searchQuery}
            onTaskClick={setSelectedTask}
          />
        )}
      </main>
      <TaskDetail
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onNavigateToTask={handleNavigateToTask}
        onOpenExecutionContext={hasExecContext ? () => {
          setSelectedTask(null)
          setExecutionDialogOpen(true)
        } : undefined}
      />
      <ExecutionDialog
        executionContext={executionContext ?? null}
        open={executionDialogOpen}
        onOpenChange={setExecutionDialogOpen}
      />
    </>
  )
}
