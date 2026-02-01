'use client'

import type { Task } from '@/types/task'
import { useTaskStats } from '@/hooks/useTaskStats'

interface SummaryStatsProps {
  tasks: Task[]
}

interface StatCardProps {
  label: string
  value: number | string
  colorClass: string
}

function StatCard({ label, value, colorClass }: StatCardProps) {
  return (
    <div className={`rounded-lg border px-4 py-2 text-center ${colorClass}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  )
}

export function SummaryStats({ tasks }: SummaryStatsProps) {
  const stats = useTaskStats(tasks)

  return (
    <div className="border-b bg-card px-4 py-3">
      <div className="flex flex-wrap gap-3">
        <StatCard
          label="Total"
          value={stats.total}
          colorClass="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          colorClass="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          colorClass="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          colorClass="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        />
        <StatCard
          label="Blocked"
          value={stats.blocked}
          colorClass="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        />
        <StatCard
          label="Completion"
          value={`${stats.completionRate}%`}
          colorClass="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
        />
      </div>
    </div>
  )
}
