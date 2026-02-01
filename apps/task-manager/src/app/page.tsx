import { redirect } from 'next/navigation'
import { getTaskLists } from '@/lib/taskService'

export default async function HomePage() {
  const taskLists = await getTaskLists()

  if (taskLists.length > 0) {
    redirect(`/lists/${encodeURIComponent(taskLists[0].id)}`)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Claude Task Manager</h1>
        <p className="text-muted-foreground">
          No task lists found. Create task files in ~/.claude/tasks/ to get started.
        </p>
      </div>
    </div>
  )
}
