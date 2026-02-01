'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { taskKeys } from './useTasks'
import { taskListKeys } from './useTaskLists'
import { executionContextKeys } from './useExecutionContext'

export function useSSE(taskListId: string | null) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const eventSourceRef = useRef<EventSource | null>(null)
  const [reconnectKey, setReconnectKey] = useState(0)

  useEffect(() => {
    if (!taskListId) return

    const url = `/api/events?taskListId=${encodeURIComponent(taskListId)}`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    const handleTaskEvent = () => {
      // Invalidate both task queries and task list queries (for counts)
      queryClient.invalidateQueries({ queryKey: taskKeys.list(taskListId) })
      queryClient.invalidateQueries({ queryKey: taskListKeys.all })
      // Also refresh the server component data
      router.refresh()
    }

    const handleExecutionEvent = () => {
      queryClient.invalidateQueries({
        queryKey: executionContextKeys.list(taskListId),
      })
      router.refresh()
    }

    eventSource.addEventListener('task:created', handleTaskEvent)
    eventSource.addEventListener('task:updated', handleTaskEvent)
    eventSource.addEventListener('task:deleted', handleTaskEvent)
    eventSource.addEventListener('execution:updated', handleExecutionEvent)

    eventSource.addEventListener('connected', (event) => {
      console.log('SSE connected:', event.data)
    })

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      eventSource.close()

      // Attempt reconnection after 3 seconds by updating reconnectKey
      setTimeout(() => {
        console.log('Attempting SSE reconnection...')
        setReconnectKey((k) => k + 1)
      }, 3000)
    }

    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [taskListId, queryClient, router, reconnectKey])
}
