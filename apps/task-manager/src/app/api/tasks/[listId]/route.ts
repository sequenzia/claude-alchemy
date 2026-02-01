import { NextResponse } from 'next/server'
import { getTasks } from '@/lib/taskService'

interface RouteParams {
  params: Promise<{ listId: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { listId } = await params

    // Validate listId to prevent path traversal
    if (!listId || listId.includes('..') || listId.includes('/')) {
      return NextResponse.json(
        { error: 'Invalid task list ID' },
        { status: 400 }
      )
    }

    const tasks = await getTasks(listId)
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
