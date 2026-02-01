import { notFound } from 'next/navigation'
import { getTaskLists, getTasks, getExecutionContext } from '@/lib/taskService'
import { TaskBoardClient } from '@/components/TaskBoardClient'

interface PageProps {
  params: Promise<{ listId: string }>
}

export default async function TaskListPage({ params }: PageProps) {
  const { listId } = await params
  const decodedListId = decodeURIComponent(listId)

  // Fetch data on the server in parallel
  const [taskLists, tasks, executionContext] = await Promise.all([
    getTaskLists(),
    getTasks(decodedListId),
    getExecutionContext(decodedListId),
  ])

  // Check if the task list exists
  const currentList = taskLists.find((list) => list.id === decodedListId)
  if (!currentList) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <TaskBoardClient
        listId={decodedListId}
        initialTasks={tasks}
        taskLists={taskLists}
        initialExecutionContext={executionContext}
      />
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { listId } = await params
  return {
    title: `${decodeURIComponent(listId)} - Claude Task Manager`,
  }
}
