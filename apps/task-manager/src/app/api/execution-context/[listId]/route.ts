import { NextResponse } from 'next/server'
import { getExecutionContext } from '@/lib/taskService'

interface RouteParams {
  params: Promise<{ listId: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { listId } = await params

    if (!listId || listId.includes('..') || listId.includes('/')) {
      return NextResponse.json(
        { error: 'Invalid task list ID' },
        { status: 400 }
      )
    }

    const executionContext = await getExecutionContext(listId)
    return NextResponse.json({ executionContext })
  } catch (error) {
    console.error('Error fetching execution context:', error)
    return NextResponse.json(
      { error: 'Failed to fetch execution context' },
      { status: 500 }
    )
  }
}
