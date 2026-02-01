import { NextResponse } from 'next/server'
import { getTaskLists } from '@/lib/taskService'

export async function GET() {
  try {
    const taskLists = await getTaskLists()
    return NextResponse.json({ taskLists })
  } catch (error) {
    console.error('Error fetching task lists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task lists' },
      { status: 500 }
    )
  }
}
