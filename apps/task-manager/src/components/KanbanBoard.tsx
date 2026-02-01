'use client'

import type { Task } from '@/types/task'

interface KanbanBoardProps {
  tasks: Task[]
  searchQuery?: string
  onTaskClick?: (task: Task) => void
}

interface ColumnConfig {
  status: 'pending' | 'in_progress' | 'completed'
  title: string
  bgColor: string
  headerColor: string
}

const columns: ColumnConfig[] = [
  {
    status: 'pending',
    title: 'Pending',
    bgColor: 'bg-slate-50 dark:bg-slate-900/50',
    headerColor: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  },
  {
    status: 'in_progress',
    title: 'In Progress',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    headerColor: 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  {
    status: 'completed',
    title: 'Completed',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    headerColor: 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
]

export function KanbanBoard({ tasks, searchQuery, onTaskClick }: KanbanBoardProps) {
  // Filter tasks by search query
  const filteredTasks = searchQuery
    ? tasks.filter(
        (task) =>
          task.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks

  // Group tasks by status
  const tasksByStatus = columns.reduce(
    (acc, col) => {
      acc[col.status] = filteredTasks.filter((t) => t.status === col.status)
      return acc
    },
    {} as Record<string, Task[]>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 h-full">
      {columns.map((column) => (
        <div
          key={column.status}
          className={`flex flex-col rounded-lg border ${column.bgColor} overflow-hidden`}
        >
          <div className={`px-4 py-3 font-semibold ${column.headerColor}`}>
            {column.title} ({tasksByStatus[column.status].length})
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {tasksByStatus[column.status].map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="bg-white dark:bg-slate-800 rounded-md border p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    #{task.id}
                  </span>
                  {task.activeForm && (
                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium mt-1 line-clamp-2">
                  {task.subject}
                </p>
                {(task.blockedBy.length > 0 || task.blocks.length > 0) && (
                  <div className="flex gap-2 mt-2 text-xs">
                    {task.blockedBy.length > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        Blocked by {task.blockedBy.length}
                      </span>
                    )}
                    {task.blocks.length > 0 && (
                      <span className="text-orange-600 dark:text-orange-400">
                        Blocks {task.blocks.length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {tasksByStatus[column.status].length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                No tasks
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
