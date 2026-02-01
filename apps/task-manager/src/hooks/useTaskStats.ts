'use client'

import { useMemo } from 'react'
import type { Task } from '@/types/task'

export interface TaskStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  blocked: number
  completionRate: number
}

export function useTaskStats(tasks: Task[]): TaskStats {
  return useMemo(() => {
    const total = tasks.length
    const pending = tasks.filter((t) => t.status === 'pending').length
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length
    const completed = tasks.filter((t) => t.status === 'completed').length
    const blocked = tasks.filter((t) => t.blockedBy.length > 0).length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      total,
      pending,
      inProgress,
      completed,
      blocked,
      completionRate,
    }
  }, [tasks])
}
