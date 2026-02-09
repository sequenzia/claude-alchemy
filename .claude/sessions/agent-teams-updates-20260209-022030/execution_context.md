# Execution Context

## Project Patterns
- Existing reference docs follow a consistent pattern: `# Title Reference`, introductory paragraph, horizontal rules between major sections, tables for structured data, code blocks for format specifications
- The `progress.md` format uses `Key: value` on single lines, making it regex-parseable — the `team_activity.md` format follows the same convention
- Agent Teams in the tools plugin use hub-and-spoke coordination with `TeamCreate`, `SendMessage`, and `TeamDelete` APIs — the task execution teams adapt this but with sequential (not parallel) within-team coordination
- Model tiers from the tools plugin: Sonnet for explorers/workers, Opus for synthesizer/reviewer — this pattern is preserved in the team strategies
- Agent definitions follow YAML frontmatter pattern with `description`, `model`, `skills`, `tools` fields
- The implementer has 3 phases: Understand, Implement, Report (vs task-executor's 4: Understand, Implement, Verify, Complete)
- Reviewer uses PASS/ISSUES_FOUND/FAIL verdict system (ISSUES_FOUND maps to PARTIAL in orchestrator)
- Reviewer tools deliberately exclude Write/Edit to enforce read-only review
- Skills like `code-quality` and `project-conventions` are from the tools plugin, referenced cross-plugin
- Orchestration.md uses em-dashes (`--`) not unicode dashes; step numbering uses half-steps (4.5, 5.5) to avoid renumbering
- Team lifecycle is a 5-step process: Create -> Spawn -> Coordinate -> Collect -> Cleanup
- All team coordination flows through the orchestrator as team lead; agents do not communicate directly
- Degradation is tracked separately from retries and does not count against retry limit
- Agent timeouts: Explorer 5min, Implementer 10min, Reviewer 5min
- Research strategy (no reviewer) uses implementer's self-reported status directly
- team_activity member format: `- [{role}] {agent-name} — {status} — {current-phase}` with em-dash delimiters
- Activity log format: `{timestamp} | {role} | {event}` with pipe delimiters for easy regex parsing
- Solo strategy produces NO team_activity file (only review/research/full)
- Cross-task teams use `group-team-{team_group}-{timestamp}` naming (distinct from per-task `task-team-{task-id}-{timestamp}`)
- Group activity files use `team_activity_group-{team_group}.md` naming pattern
- Groups occupy a single `max_parallel` slot because tasks execute sequentially within the group
- Types file `execution.ts` uses no semicolons (project convention); imported by taskService.ts, api.ts, ExecutionDialog.tsx, ExecutionProgressBar.tsx, useExecutionContext.ts
- Strategy suggestions in create-tasks use "first match wins" priority ordering: XL > P0+L > P0 > L+testing > M+integration > S/XS > default solo
- `parseTeamActivityMd()` is exported (unlike parseProgressMd which is private) for use by getExecutionContext()
- Team member lines use Unicode em-dash (U+2014) as delimiter; activity log uses pipe delimiter
- task-manager app has no test framework (no jest/vitest) — unit tests cannot be written yet
- Radix Collapsible used for expand/collapse (simpler than Accordion for this use case)
- Role color scheme: explorer=blue, implementer=amber, reviewer=purple
- Team data matched to active tasks via taskId lookup Map

## Key Decisions
- Team naming convention `task-team-{task-id}-{timestamp}` ensures uniqueness across retries
- Strategy resolution is Step 4.5 between Check Settings (4) and Present Execution Plan (5)
- Per-task strategy records include `strategy_source` to trace cascade level (default, settings, cli, task_metadata)
- Invalid per-task strategy names fall back to session default (not directly to solo), preserving cascade semantics
- The `[{strategy}]` tag in wave display is optional when all tasks use the same strategy
- Degradation history bridges the gap between degradation and retry systems by passing knowledge of failed strategies to retry attempts
- `team_activity_task-{id}-degraded-{n}.md` naming pattern for preserved degraded team files prevents overwriting
- Strategy resolution for groups uses complexity order Full > Research > Review > Solo

## Known Issues
- Task #135: Edit tool was denied permission; used Write to replace the full orchestration.md file instead
- Concurrent file editing is a significant challenge — orchestration.md had 5 concurrent edit attempts in Wave 5, requiring multiple read-edit-retry cycles
- The Edit tool detects modifications between read and write, requiring re-reads

## File Map
- `plugins/sdd/skills/execute-tasks/references/team-strategies.md` — Defines all 4 team strategies with detailed coordination flows for Review and Research, agent roles, spawn configs, lifecycle steps, degradation targets, failure handling, team_activity.md format specification with regex patterns
- `plugins/sdd/agents/team-implementer.md` — Team implementer agent for Review/Research/Full strategies
- `plugins/sdd/agents/team-reviewer.md` — Independent code reviewer agent for Review and Full strategies (read-only, Opus model)
- `plugins/sdd/agents/team-explorer.md` — Explorer agent for Research and Full strategies (read-only)
- `plugins/sdd/skills/execute-tasks/references/orchestration.md` — Full team-aware orchestration: Step 4.5 (strategy resolution), Step 7a (team group detection), Step 7c (team lifecycle, cross-task groups, concurrent teams), graceful degradation, cross-wave persistence
- `plugins/sdd/skills/execute-tasks/SKILL.md` — Updated with --team-strategy argument, Step 4.5 summary, team strategy key behavior, usage examples
- `apps/task-manager/src/types/execution.ts` — TeamMember, TeamActivityLogEntry, TeamActivity types; ExecutionProgress extended with activeTeams
- `plugins/sdd/skills/create-tasks/SKILL.md` — Phase 4 strategy suggestion logic with priority-ordered rules
- `apps/task-manager/src/lib/taskService.ts` — Exports `parseTeamActivityMd()`, `getExecutionContext()` returns teamActivities
- `apps/task-manager/src/types/execution.ts` — ExecutionContext includes optional `teamActivities?: TeamActivity[]`
- `apps/task-manager/src/components/ExecutionDialog.tsx` — Team monitoring UI with collapsible team sections

## Task History
Prior Sessions Summary: Tasks 131-137 established the foundation: team strategies reference doc, 3 agent definitions (implementer, reviewer, explorer), strategy resolution in orchestration, --team-strategy CLI argument in SKILL.md, and team lifecycle management in orchestration.

### Task [138]: Add graceful degradation logic to orchestration - PASS
- Files modified: `orchestration.md` (comprehensive Graceful Degradation section with 8 subsections)
- Issues: File contention from concurrent edits, required 5 read-edit cycles

### Task [139]: Define team_activity.md file format in session file extensions - PASS
- Files modified: `team-strategies.md` (enhanced format spec with regex patterns), `orchestration.md` (updated templates)
- Issues: Concurrent edit failures, succeeded on third attempt

### Task [146]: Add Review strategy coordination details to references - PASS
- Files modified: `team-strategies.md` (detailed Review coordination), `orchestration.md` (expanded Review flow to 15 steps)
- Issues: Concurrent edit conflict with task #147, succeeded on second attempt

### Task [147]: Add Research strategy coordination details to references - PASS
- Files modified: `team-strategies.md` (detailed Research coordination), `orchestration.md` (enhanced Research flow to 14 steps)
- Issues: Concurrent edit conflicts, required re-reads

### Task [148]: Add cross-task team support to orchestration - PASS
- Files modified: `orchestration.md` (team group detection, shared team lifecycle, cross-wave persistence, slot accounting)
- Issues: None

### Task [140]: Add TeamActivity and TeamMember TypeScript types - PASS
- Files modified: `apps/task-manager/src/types/execution.ts` (added TeamMember, TeamActivityLogEntry, TeamActivity interfaces; extended ExecutionProgress with activeTeams)
- Issues: None

### Task [151]: Add create-tasks integration for team strategy suggestions - PASS
- Files modified: `plugins/sdd/skills/create-tasks/SKILL.md` (added strategy suggestion logic to Phase 4, updated settings/template/preview/example)
- Issues: None

### Task [141]: Implement parseTeamActivityMd() in taskService.ts - PASS
- Files modified: `apps/task-manager/src/lib/taskService.ts` (added parseTeamActivityMd function, updated imports)
- Issues: No test infrastructure in task-manager app

### Task [142]: Extend getExecutionContext() for team activity files - PASS
- Files modified: `taskService.ts` (getExecutionContext extended), `execution.ts` (added teamActivities field)
- Issues: None

### Task [144]: Add team monitoring section to ExecutionDialog - PASS
- Files modified: `ExecutionDialog.tsx` (TeamSection, TeamMemberRow, RoleBadge, MemberStatusDot components)
- Dependencies added: `@radix-ui/react-collapsible`
- Issues: None
