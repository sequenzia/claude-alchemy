'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TaskList } from '@/types/task'

interface TaskListSelectorProps {
  taskLists: TaskList[]
  currentListId: string
}

export function TaskListSelector({ taskLists, currentListId }: TaskListSelectorProps) {
  const router = useRouter()

  const handleChange = (value: string) => {
    router.push(`/lists/${encodeURIComponent(value)}`)
  }

  if (!taskLists || taskLists.length === 0) {
    return (
      <div className="h-10 px-3 flex items-center text-sm text-muted-foreground">
        No task lists found
      </div>
    )
  }

  return (
    <Select value={currentListId} onValueChange={handleChange}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a task list" />
      </SelectTrigger>
      <SelectContent>
        {taskLists.map((list) => (
          <SelectItem key={list.id} value={list.id}>
            {list.name} ({list.taskCount})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
