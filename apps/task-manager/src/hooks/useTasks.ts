'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTasks } from '@/lib/api'
import type { Task } from '@/types/task'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (listId: string) => [...taskKeys.all, listId] as const,
}

export function useTasks(taskListId: string | null, initialData?: Task[]) {
  return useQuery({
    queryKey: taskKeys.list(taskListId ?? ''),
    queryFn: () => fetchTasks(taskListId!),
    enabled: !!taskListId,
    initialData,
  })
}
