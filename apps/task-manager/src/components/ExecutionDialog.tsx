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
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Execution Context</DialogTitle>
          <DialogDescription>
            Artifacts from the current task execution session
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="flex-1 min-h-0">
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
              style={{ maxHeight: 'calc(85vh - 200px)' }}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:border [&_table]:w-full [&_th]:border [&_td]:border [&_th]:border-border [&_td]:border-border [&_th]:bg-muted">
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
