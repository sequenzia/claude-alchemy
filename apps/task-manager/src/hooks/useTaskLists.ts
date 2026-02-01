'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTaskLists } from '@/lib/api'

export const taskListKeys = {
  all: ['task-lists'] as const,
}

export function useTaskLists() {
  return useQuery({
    queryKey: taskListKeys.all,
    queryFn: fetchTaskLists,
  })
}
