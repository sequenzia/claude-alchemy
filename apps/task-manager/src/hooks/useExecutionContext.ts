'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchExecutionContext } from '@/lib/api'
import type { ExecutionContext } from '@/types/execution'

export const executionContextKeys = {
  all: ['execution-context'] as const,
  list: (listId: string) => [...executionContextKeys.all, listId] as const,
}

export function useExecutionContext(
  taskListId: string | null,
  initialData?: ExecutionContext | null
) {
  return useQuery({
    queryKey: executionContextKeys.list(taskListId ?? ''),
    queryFn: () => fetchExecutionContext(taskListId!),
    enabled: !!taskListId,
    initialData: initialData ?? undefined,
  })
}
