export interface ExecutionArtifact {
  name: string
  content: string
  lastModified: number
}

export interface ExecutionContext {
  executionDir: string
  artifacts: ExecutionArtifact[]
}
