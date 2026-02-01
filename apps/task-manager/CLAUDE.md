# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## Architecture Overview

This is a **Next.js 14+ App Router** application that provides a real-time Kanban board for visualizing Claude AI task files from `~/.claude/tasks/`.

### Data Flow

```
~/.claude/tasks/<list>/*.json
         ↓
   [chokidar watcher]
         ↓
   Route Handler (SSE) → React Client (useSSE hook)
         ↑                          ↓
   Server Components       TanStack Query cache invalidation
```

### Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with Providers
│   ├── page.tsx                # Redirects to first task list
│   ├── globals.css             # Tailwind CSS + shadcn/ui variables
│   ├── lists/[listId]/
│   │   ├── page.tsx            # Server Component - fetches tasks
│   │   └── loading.tsx         # Loading skeleton
│   └── api/
│       ├── task-lists/route.ts # GET task lists
│       ├── tasks/[listId]/route.ts # GET tasks for a list
│       ├── events/route.ts     # SSE endpoint for real-time updates
│       └── health/route.ts     # Health check
├── components/
│   ├── KanbanBoard.tsx         # Client component - 3-column board
│   ├── TaskBoardClient.tsx     # Client wrapper with state/SSE
│   ├── TaskDetail.tsx          # Task detail modal dialog
│   ├── SummaryStats.tsx        # Task statistics bar
│   ├── TaskListSelector.tsx    # Dropdown with URL navigation
│   ├── SearchInput.tsx         # Search filter input
│   ├── ThemeToggle.tsx         # Dark/light mode toggle
│   ├── Providers.tsx           # QueryClient + ThemeProvider
│   └── ui/                     # shadcn/ui components
├── hooks/
│   ├── useSSE.ts               # SSE connection + query invalidation
│   ├── useTasks.ts             # TanStack Query for tasks
│   ├── useTaskLists.ts         # TanStack Query for task lists
│   └── useTaskStats.ts         # Task statistics calculation
├── lib/
│   ├── taskService.ts          # Server-side file reading
│   ├── fileWatcher.ts          # Chokidar singleton + events
│   ├── api.ts                  # Client-side fetch functions
│   └── utils.ts                # cn() utility for classnames
└── types/
    └── task.ts                 # Shared TypeScript types
```

### Key Patterns

- **Server Components**: Initial data fetched in `page.tsx`, passed to client components
- **TanStack Query**: Client-side cache with SSE-triggered invalidation
- **SSE via Route Handler**: `ReadableStream` for real-time updates
- **Global FileWatcher Singleton**: Prevents multiple watchers during hot reload
- **URL-based Routing**: `/lists/[listId]` for task list selection
- **next-themes**: SSR-safe dark/light mode

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/task-lists` | List available task lists |
| `GET /api/tasks/:listId` | Get tasks for a specific list |
| `GET /api/events?taskListId=<id>` | SSE stream for real-time updates |

## Task File Format

Task files are JSON in `~/.claude/tasks/<task-list-name>/`:

```json
{
  "id": "1",
  "subject": "Task subject",
  "description": "Detailed description",
  "status": "pending",
  "blocks": ["2", "3"],
  "blockedBy": [],
  "activeForm": "Working on...",
  "metadata": {
    "priority": "high",
    "complexity": "M"
  }
}
```

Valid `status` values: `pending`, `in_progress`, `completed`
Valid `priority` values: `critical`, `high`, `medium`, `low`
Valid `complexity` values: `XS`, `S`, `M`, `L`, `XL`

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **State Management**: TanStack Query v5
- **UI Components**: shadcn/ui (Radix primitives)
- **Styling**: Tailwind CSS v4
- **Theme**: next-themes
- **File Watching**: Chokidar v5
- **Icons**: Lucide React
