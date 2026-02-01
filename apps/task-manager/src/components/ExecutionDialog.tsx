'use client'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { ExecutionContext } from '@/types/execution'

interface ExecutionDialogProps {
  executionContext: ExecutionContext | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TAB_LABELS: Record<string, string> = {
  execution_context: 'Context',
  task_log: 'Log',
  execution_plan: 'Plan',
  session_summary: 'Summary',
}

function getTabLabel(name: string): string {
  return TAB_LABELS[name] ?? name.replace(/_/g, ' ')
}

export function ExecutionDialog({
  executionContext,
  open,
  onOpenChange,
}: ExecutionDialogProps) {
  if (!executionContext) return null

  const { artifacts } = executionContext
  const defaultTab = artifacts[0]?.name ?? ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Execution Context</DialogTitle>
          <DialogDescription>
            Artifacts from the current task execution session
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="flex-1 min-h-0 px-6 pb-6 pt-4">
          <TabsList variant="line">
            {artifacts.map((artifact) => (
              <TabsTrigger key={artifact.name} value={artifact.name}>
                {getTabLabel(artifact.name)}
              </TabsTrigger>
            ))}
          </TabsList>

          {artifacts.map((artifact) => (
            <TabsContent
              key={artifact.name}
              value={artifact.name}
              className="overflow-y-auto mt-4"
              style={{ maxHeight: 'calc(85vh - 180px)' }}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-sm prose-headings:font-semibold prose-p:text-sm prose-p:leading-relaxed prose-code:text-xs prose-pre:text-xs prose-pre:bg-muted prose-pre:border prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-table:border-collapse [&_table]:w-full [&_th]:border [&_td]:border [&_th]:border-border [&_td]:border-border [&_th]:bg-muted">
                <Markdown remarkPlugins={[remarkGfm]}>
                  {artifact.content}
                </Markdown>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
