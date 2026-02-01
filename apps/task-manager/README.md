# Claude Task Manager

A real-time Kanban board for visualizing and managing Claude AI task files. Built with Next.js, this application watches your `~/.claude/tasks/` directory and provides a beautiful, responsive interface to track task progress.

## Features

- **Real-time Updates** - File changes are instantly reflected via Server-Sent Events (SSE)
- **Kanban Board** - Three-column layout: Pending, In Progress, Completed
- **Multiple Task Lists** - Switch between different task directories
- **Search & Filter** - Quickly find tasks by subject or description
- **Task Dependencies** - Visual indicators for blocked/blocking tasks
- **Statistics Dashboard** - Track total, pending, in-progress, completed, and blocked tasks
- **Dark/Light Mode** - Toggle between themes with system preference support
- **Responsive Design** - Works on desktop and mobile devices

## Screenshots

![Claude Task Manager](../../internal/images/claude-task-manager.png)

## Prerequisites

- **Node.js** 18.17 or later
- **pnpm** (recommended) or npm/yarn
- **Claude tasks directory** at `~/.claude/tasks/` with task JSON files

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/claude-task-manager.git
   cd claude-task-manager
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start the development server**
   ```bash
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Task Directory Structure

The application reads task files from `~/.claude/tasks/`. Each subdirectory represents a task list:

```
~/.claude/tasks/
├── my-project/
│   ├── 1.json
│   ├── 2.json
│   └── 3.json
└── another-project/
    ├── 1.json
    └── 2.json
```

### Creating Tasks

Create JSON files in your task list directory. The application will automatically detect new files.

### Navigating the Interface

1. **Select a Task List** - Use the dropdown in the header to switch between projects
2. **Search Tasks** - Type in the search box to filter tasks by subject or description
3. **View Task Details** - Click any task card to open the detail modal
4. **Navigate Dependencies** - Click linked task IDs in the detail modal to jump to related tasks
5. **Toggle Theme** - Click the sun/moon icon to switch between light and dark mode

## Task File Format

Each task is a JSON file with the following structure:

```json
{
  "id": "1",
  "subject": "Implement user authentication",
  "description": "Add login and registration functionality with JWT tokens",
  "status": "in_progress",
  "blocks": ["2", "3"],
  "blockedBy": [],
  "activeForm": "Working on login form",
  "metadata": {
    "priority": "high",
    "complexity": "L",
    "feature_name": "auth"
  }
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the task |
| `subject` | string | Yes | Brief title of the task |
| `description` | string | No | Detailed description |
| `status` | string | Yes | One of: `pending`, `in_progress`, `completed` |
| `blocks` | string[] | No | IDs of tasks this task blocks |
| `blockedBy` | string[] | No | IDs of tasks blocking this task |
| `activeForm` | string | No | Current activity (shown as "Active" badge) |
| `metadata` | object | No | Additional metadata (see below) |

### Metadata Fields

| Field | Values | Description |
|-------|--------|-------------|
| `priority` | `critical`, `high`, `medium`, `low` | Task priority level |
| `complexity` | `XS`, `S`, `M`, `L`, `XL` | Estimated complexity |
| `phase` | number | Project phase number |
| `feature_name` | string | Associated feature |

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | React framework with App Router |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [TanStack Query](https://tanstack.com/query) | Server state management |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | UI component library |
| [Chokidar](https://github.com/paulmillr/chokidar) | File system watching |
| [next-themes](https://github.com/pacocoursey/next-themes) | Theme management |
| [Lucide](https://lucide.dev/) | Icon library |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Home page (redirects to first list)
│   ├── lists/[listId]/     # Task list pages
│   └── api/                # API route handlers
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives
│   └── *.tsx               # Application components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions and services
└── types/                  # TypeScript type definitions
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/task-lists` | GET | List all task lists |
| `/api/tasks/:listId` | GET | Get tasks for a specific list |
| `/api/events?taskListId=:id` | GET | SSE stream for real-time updates |

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## License

MIT License - see [LICENSE](LICENSE) for details.
