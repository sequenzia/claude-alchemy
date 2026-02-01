export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-bold">Claude Task Manager</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="h-10 w-48 rounded-md border bg-muted animate-pulse" />
            <div className="h-10 w-10 rounded-md border bg-muted animate-pulse" />
          </div>
        </div>
      </header>
      <div className="flex items-center justify-center h-[calc(100vh-65px)]">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    </div>
  )
}
