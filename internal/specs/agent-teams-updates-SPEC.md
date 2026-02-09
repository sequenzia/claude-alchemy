# Agent Teams Updates PRD

**Version**: 1.0
**Author**: Not specified
**Date**: 2026-02-08
**Status**: Draft
**Spec Type**: New feature
**Spec Depth**: Detailed specifications
**Description**: Enhance the Claude Alchemy toolkit's execute-tasks workflow (SDD plugin) and Task Manager app to support collaborative task execution via Agent Teams with real-time monitoring of team activities.

---

## 1. Executive Summary

This feature introduces Agent Teams into the execute-tasks workflow, enabling multiple specialized agents to collaborate on task execution rather than relying on solo agents. The Task Manager app will be enhanced with progressive-detail real-time monitoring of team activities. Four configurable team strategies (Solo, Review, Research, Full) will be available at three configuration levels (settings file, session, per-task), with graceful degradation on failure.

## 2. Problem Statement

### 2.1 The Problem

The current execute-tasks workflow uses individual `task-executor` agents — each task gets a single agent that must handle exploration, implementation, and self-verification alone. This limits:
- **Task quality**: Complex tasks benefit from specialized roles (researcher, implementer, reviewer) but solo agents must do everything
- **Execution speed**: Work within a task cannot be parallelized across specialized agents
- **Visibility**: Users can only see task-level progress (which task is active, what phase), not the detailed agent activity happening within

### 2.2 Current State

The execute-tasks skill (SDD plugin) orchestrates task execution through a 10-step loop:
- Builds a dependency-aware execution plan from Claude Code Tasks
- Executes tasks in waves, up to `max_parallel` concurrent agents per wave
- Each task is handled by a single `task-executor` agent through a 4-phase workflow: Understand → Implement → Verify → Complete
- Session files in `.claude/sessions/__live_session__/` track progress via `progress.md`, `execution_context.md`, `task_log.md`
- The Task Manager watches these files via Chokidar and streams changes via SSE to the browser

The tools plugin already has a working Agent Teams implementation (`teams-deep-analysis` skill) with hub-and-spoke coordination, but this is separate from the execute-tasks workflow.

### 2.3 Impact Analysis

Without this feature:
- Complex tasks require multiple retry attempts when a solo agent misses edge cases
- Code quality depends entirely on a single agent's self-review (no independent verification)
- Users have limited insight into what agents are actually doing during execution
- The existing Agent Teams infrastructure in the tools plugin cannot be leveraged for task execution

### 2.4 Business Value

- **Foundation for multi-agent workflows**: Establishes patterns reusable across the entire toolkit
- **Quality improvement**: Independent code review by a separate agent catches issues solo agents miss
- **Developer confidence**: Real-time visibility into team activity builds trust in autonomous execution
- **Differentiation**: Positions Claude Alchemy as a sophisticated multi-agent development toolkit

## 3. Goals & Success Metrics

### 3.1 Primary Goals
1. Enable collaborative task execution through configurable team strategies
2. Provide real-time visibility into Agent Teams activity in the Task Manager
3. Maintain developer experience — simple tasks stay simple, teams add value for complex work
4. Build an extensible foundation for future multi-agent patterns

### 3.2 Success Metrics

| Metric | Current Baseline | Target | Measurement Method | Timeline |
|--------|------------------|--------|-------------------|----------|
| Task completion quality | Solo agent pass rate | Measurably fewer PARTIAL/FAIL results with team strategies | Compare pass/fail ratios: solo vs team execution sessions | Phase 1 |
| Agent visibility | Task-level only (which task, what phase) | Agent-level detail (each agent's role, activity, phase) | Task Manager shows real-time team member activity | Phase 1 |
| Configuration simplicity | N/A (no teams) | 3-level cascade working (settings → session → task) | All config levels tested and documented | Phase 2 |
| Strategy coverage | 1 (solo only) | 4 strategies available | Solo, Review, Research, Full team strategies implemented | Phase 2 |

### 3.3 Non-Goals
- Custom user-defined agent types or roles (out of scope)
- Persistent teams that survive across execution sessions (out of scope)
- Replacing the existing solo task-executor pattern (it remains as a strategy)

## 4. User Research

### 4.1 Target Users

#### Primary Persona: Claude Alchemy Developer
- **Role/Description**: Developer using Claude Alchemy's SDD workflow to generate and execute implementation tasks
- **Goals**: Get high-quality code implemented autonomously with confidence
- **Pain Points**: Solo agents sometimes miss edge cases; limited visibility into what's happening during execution; complex tasks need multiple retries
- **Context**: Running `execute-tasks` sessions on medium-to-large codebases, often with 10-30+ tasks per session

#### Secondary Persona: Task Manager Monitor
- **Role/Description**: Developer watching the Task Manager dashboard during execution sessions
- **Goals**: Understand what agents are doing in real-time, catch issues early
- **Pain Points**: Current view shows only task-level progress, not agent-level detail

### 4.2 User Journey Map

```
[Configure team strategy] --> [Run execute-tasks] --> [View execution plan with team info] --> [Confirm execution]
    --> [Watch Task Manager: basic team status] --> [Click to expand: agent detail view]
    --> [See agent activity: exploring/implementing/reviewing] --> [Review results with team context]
```

## 5. Functional Requirements

### 5.1 Feature: Team Strategy System

**Priority**: P0 (Critical)

#### User Stories

**US-001**: As a developer, I want to choose a team strategy for task execution so that complex tasks get the collaborative attention they need.

**Acceptance Criteria**:
- [ ] Four strategies are available: Solo, Review, Research, Full
- [ ] Solo strategy matches current behavior exactly (single task-executor agent)
- [ ] Review strategy spawns an implementer agent and a reviewer agent per task
- [ ] Research strategy spawns an explorer agent and an implementer agent per task
- [ ] Full strategy spawns an explorer, implementer, and reviewer agent per task
- [ ] Strategy selection cascades: settings file default → `--team-strategy` CLI arg → per-task `metadata.team_strategy`

**Edge Cases**:
- No strategy specified: Default to Solo (backwards compatible behavior)
- Invalid strategy name: Warn and fall back to Solo
- Strategy specified for a trivial task (e.g., "fix typo"): Still use the strategy but agents may complete quickly

---

### 5.2 Feature: Three-Level Configuration Cascade

**Priority**: P0 (Critical)

#### User Stories

**US-002**: As a developer, I want to set a default team strategy in my settings file and override it per session or per task so that I have flexible control.

**Acceptance Criteria**:
- [ ] `.claude/claude-alchemy.local.md` supports a `team_strategy` setting (default strategy for all sessions)
- [ ] `--team-strategy <name>` CLI argument overrides the settings file for the current session
- [ ] `metadata.team_strategy` on individual tasks overrides the session-level setting
- [ ] Precedence order: per-task > session arg > settings file > default (solo)
- [ ] The resolved strategy is displayed in the execution plan confirmation step

**Edge Cases**:
- Settings file missing: Use default (solo)
- Mixed strategies in one session: Each task uses its own resolved strategy independently

---

### 5.3 Feature: Team Execution Orchestration

**Priority**: P0 (Critical)

#### User Stories

**US-003**: As a developer, I want the execute-tasks orchestrator to manage team lifecycle for each task so that teams are created, coordinated, and cleaned up automatically.

**Acceptance Criteria**:
- [ ] For non-solo strategies, a team is created per task using `TeamCreate`
- [ ] Agents are spawned with appropriate roles (explorer, implementer, reviewer) based on the strategy
- [ ] The orchestrator coordinates the team workflow: explorer → implementer → reviewer (sequential within team)
- [ ] Team results are collected and translated into the existing pass/partial/fail status
- [ ] Teams are shut down and cleaned up after task completion
- [ ] `progress.md` is updated with team summary information
- [ ] `team_activity.md` is written per active team with detailed agent activity

**Edge Cases**:
- Agent spawn failure: Log error, attempt strategy degradation
- Agent timeout: Set reasonable timeouts per role, degrade on timeout
- Multiple teams active simultaneously (different tasks in same wave): Each team is independent

---

### 5.4 Feature: Graceful Degradation

**Priority**: P0 (Critical)

#### User Stories

**US-004**: As a developer, I want team failures to gracefully degrade to simpler strategies rather than failing the entire task.

**Acceptance Criteria**:
- [ ] Full team failure → attempt Review strategy → attempt Solo strategy
- [ ] Review team failure → attempt Solo strategy
- [ ] Research team failure → attempt Solo strategy
- [ ] Degradation is logged in `task_log.md` with the reason
- [ ] The final successful strategy is recorded in the task result
- [ ] Degradation does not count against the task retry limit

**Edge Cases**:
- All strategies fail: Task enters normal retry flow with solo strategy
- Partial team failure (1 of 3 agents fails): Depends on which role failed — see strategy-specific rules

---

### 5.5 Feature: Cross-Task Teams

**Priority**: P1 (High)

#### User Stories

**US-005**: As a developer, I want a single team to handle multiple related tasks so that agents can maintain context across task boundaries.

**Acceptance Criteria**:
- [ ] Tasks with the same `metadata.team_group` can be assigned to a shared team
- [ ] The team persists across tasks within the same wave (or adjacent waves if dependencies allow)
- [ ] Shared team context carries forward between tasks without re-reading the full codebase
- [ ] Team cleanup only happens after all grouped tasks complete

**Edge Cases**:
- Group spans multiple waves: Team persists across wave boundaries
- One task in group fails: Team continues with remaining tasks, failed task enters retry
- Group members have different strategies: Use the most complex strategy for the group

---

### 5.6 Feature: Session File Extensions for Teams

**Priority**: P0 (Critical)

#### User Stories

**US-006**: As a developer, I want team activity tracked in session files so that the Task Manager can monitor teams in real-time.

**Acceptance Criteria**:
- [ ] `progress.md` extended with team summary section (team name, member count, status per active task)
- [ ] New `team_activity.md` file created per active team in `__live_session__/`
- [ ] `team_activity.md` includes: team name, strategy, agent roles/status, current phase per agent, message log
- [ ] `team_activity.md` is updated in real-time as agents progress
- [ ] `team_activity.md` is archived with the session on completion
- [ ] Format is parseable by regex (consistent with existing `progress.md` patterns)

**Edge Cases**:
- Multiple teams active: One `team_activity.md` per team (e.g., `team_activity_task-5.md`)
- File write contention: Orchestrator is the only writer (agents report via task completion, not direct file writes)

---

### 5.7 Feature: Task Manager Team Monitoring UI

**Priority**: P0 (Critical)

#### User Stories

**US-007**: As a developer, I want to see Agent Teams activity in the Task Manager with progressive detail so that I can monitor at the level I need.

**Acceptance Criteria**:
- [ ] Basic team status visible in the main Kanban view for in-progress tasks (team name, agent count, overall status)
- [ ] Expandable detail view shows each agent in the team with role, current phase, and activity
- [ ] Real-time updates via the existing Chokidar → SSE → TanStack Query pipeline
- [ ] New `team_activity.md` files are watched by Chokidar and trigger SSE events
- [ ] New TypeScript types for team data (`TeamActivity`, `TeamMember`, etc.)
- [ ] New API endpoint or extended existing endpoint for team activity data

**Edge Cases**:
- No teams active: UI shows standard task progress (no team sections)
- Team completes between polls: UI catches up on next SSE event
- Multiple teams active: Each displayed independently in their respective task cards

---

### 5.8 Feature: Strategy Reference Document

**Priority**: P1 (High)

#### User Stories

**US-008**: As a developer extending Claude Alchemy, I want a clear reference document that defines each team strategy so that new strategies can be added consistently.

**Acceptance Criteria**:
- [ ] New `references/team-strategies.md` in the execute-tasks skill
- [ ] Each strategy section defines: agent roles, spawn configuration, coordination flow, lifecycle steps, session file format, degradation target
- [ ] Orchestrator reads the appropriate strategy section based on resolved configuration
- [ ] Format is consistent with existing reference docs (`orchestration.md`, `execution-workflow.md`)

## 6. Non-Functional Requirements

### 6.1 Performance
- Team overhead should not significantly slow execution compared to solo agents for simple tasks
- Agent spawn time should be reasonable (seconds, not minutes)
- File watching latency for team activity files should match existing progress.md latency (~300ms polling)

### 6.2 Security
- Maintain existing path traversal guards in `taskService.ts` for new file types
- Team activity files follow same access patterns as existing session files
- No new external network access required

### 6.3 Scalability
- Support up to `max_parallel` concurrent teams (one per concurrent task)
- Each team may have up to 3 agents (for Full strategy) — so up to `max_parallel * 3` total agents
- File system load from team activity files should be manageable with existing Chokidar configuration

### 6.4 Accessibility
- Task Manager UI additions should maintain existing accessibility patterns (keyboard navigation, screen reader support via Radix primitives)

## 7. Technical Considerations

### 7.1 Architecture Overview

The feature extends the existing filesystem-as-message-bus architecture. The execute-tasks orchestrator gains a strategy resolution step that determines whether to use solo agents or spawn a team. Team activity is written to session files, which the Task Manager picks up via the existing Chokidar → SSE pipeline.

```
execute-tasks orchestrator
  → resolve strategy (settings → session → task metadata)
  → if solo: spawn task-executor (existing behavior)
  → if team: TeamCreate → spawn agents → coordinate → collect results → TeamDelete
  → write team_activity.md (real-time updates)
  → write progress.md (summary updates)

Task Manager
  → Chokidar watches __live_session__/*.md (including new team_activity*.md)
  → SSE streams events to browser
  → TanStack Query invalidation → UI re-renders team state
```

### 7.2 Tech Stack
- **SDD Plugin**: Markdown skills + reference docs (no build step)
- **Task Manager Frontend**: Next.js 16, React 19, TanStack Query v5, Tailwind v4, shadcn/ui
- **Task Manager Backend**: Next.js Route Handlers, Chokidar 5, SSE
- **Agent Infrastructure**: Claude Code Task tool, TeamCreate/TeamDelete/SendMessage APIs

### 7.3 Integration Points

| System | Integration Type | Purpose |
|--------|-----------------|---------|
| execute-tasks skill | Skill extension | Add team strategy resolution and team orchestration |
| task-executor agent | Agent extension | May need role-specific variants (explorer, reviewer) |
| Task Manager taskService.ts | Server-side parsing | Parse new team_activity.md files |
| Task Manager fileWatcher.ts | File watching | Watch new team activity files |
| Task Manager SSE route | Event streaming | Stream team activity events |
| Task Manager UI components | Client rendering | New team monitoring components |

### 7.4 Technical Constraints
- Plugins are markdown-only with no build step — all "logic" is instruction-based
- Filesystem-as-message-bus pattern must be preserved (no DB, no IPC)
- Teams use Claude Code's built-in TeamCreate/SendMessage/TeamDelete APIs
- Chokidar polling interval (300ms) sets the minimum UI update frequency

### 7.5 Codebase Context

#### Existing Architecture

The execute-tasks workflow is defined across these key files:
- `plugins/sdd/skills/execute-tasks/SKILL.md` — Main skill with 10-step orchestration
- `plugins/sdd/skills/execute-tasks/references/orchestration.md` — Detailed orchestration loop
- `plugins/sdd/skills/execute-tasks/references/execution-workflow.md` — 4-phase task workflow
- `plugins/sdd/agents/task-executor.md` — Agent definition for solo task execution

The Task Manager monitors execution via:
- `apps/task-manager/src/lib/taskService.ts` — `getExecutionContext()`, `parseProgressMd()`
- `apps/task-manager/src/lib/fileWatcher.ts` — Chokidar singleton watching `~/.claude/tasks/`
- `apps/task-manager/src/hooks/useSSE.ts` — SSE connection + TanStack Query invalidation
- `apps/task-manager/src/hooks/useExecutionContext.ts` — Execution context hook
- `apps/task-manager/src/components/ExecutionDialog.tsx` — Execution monitoring dialog
- `apps/task-manager/src/components/ExecutionProgressBar.tsx` — Progress bar component
- `apps/task-manager/src/types/execution.ts` — ExecutionProgress, ExecutionContext types

The Agent Teams infrastructure exists in the tools plugin:
- `plugins/tools/skills/teams-deep-analysis/SKILL.md` — Reference implementation for team coordination
- `plugins/tools/agents/team-code-explorer.md` — Team worker agent
- `plugins/tools/agents/team-deep-synthesizer.md` — Team synthesizer agent

#### Integration Points

| File/Module | Purpose | How This Feature Connects |
|------------|---------|---------------------------|
| `plugins/sdd/skills/execute-tasks/SKILL.md` | Task orchestration | Add strategy resolution step, team lifecycle management |
| `plugins/sdd/skills/execute-tasks/references/orchestration.md` | Orchestration loop detail | Extend Step 8 (Execute Loop) with team awareness |
| `plugins/sdd/agents/task-executor.md` | Solo task agent | Remains as the Solo strategy agent |
| `apps/task-manager/src/lib/taskService.ts` | Execution context parsing | Add `parseTeamActivityMd()`, extend `getExecutionContext()` |
| `apps/task-manager/src/types/execution.ts` | Type definitions | Add TeamActivity, TeamMember types |
| `apps/task-manager/src/lib/fileWatcher.ts` | File watching | Already watches `__live_session__/*.md` — team files picked up automatically |
| `apps/task-manager/src/components/ExecutionDialog.tsx` | Execution UI | Extend with team monitoring section |

#### Patterns to Follow

- **Filesystem-as-message-bus**: All inter-system communication via markdown files in well-known paths — used across the entire project
- **Regex parsing of markdown**: `parseProgressMd()` in `taskService.ts` extracts structured data from markdown format — new parsers should follow the same pattern
- **Hub-and-spoke team coordination**: Team lead orchestrates, workers execute independently, synthesizer merges — established in `teams-deep-analysis`
- **Chokidar → SSE → TanStack Query**: File change → SSE event → cache invalidation → UI update — the real-time pipeline
- **Reference document pattern**: Strategy definitions in `references/` files that guide agent behavior — used throughout both plugins

#### Related Features

- **teams-deep-analysis**: Direct reference implementation for Agent Teams coordination; team lifecycle, agent spawning, SendMessage patterns can be adapted
- **execute-tasks wave execution**: Existing parallel execution model; team execution extends this with teams per task slot

## 8. Scope Definition

### 8.1 In Scope
- Four team strategies: Solo, Review, Research, Full
- Three-level configuration cascade (settings → session → task)
- Cross-task teams via `metadata.team_group`
- Session file extensions (progress.md summary + team_activity.md detail)
- Task Manager progressive-detail team monitoring UI
- Graceful degradation fallback chain
- Strategy reference document

### 8.2 Out of Scope
- **Custom agent types**: Users cannot define their own agent roles beyond the built-in strategies (deferred to future)
- **Persistent teams**: Teams do not survive across execution sessions (each session creates fresh teams)

### 8.3 Future Considerations
- Custom agent role definitions (user-defined team compositions)
- Persistent teams with session-spanning memory
- Team performance analytics dashboard
- AI-suggested strategy selection based on task complexity analysis
- Inter-team communication for cross-cutting tasks

## 9. Implementation Plan

### 9.1 Phase 1: Foundation + Full Team End-to-End
**Completion Criteria**: Full team strategy works end-to-end — execute-tasks spawns teams, coordinates agents, writes session files, and the Task Manager displays team activity in real-time.

| Deliverable | Description | Dependencies |
|-------------|-------------|--------------|
| Team strategy reference doc | `references/team-strategies.md` defining all 4 strategies | None |
| Strategy resolution logic | Orchestrator resolves strategy from 3-level cascade | Team strategy reference |
| Team agent definitions | New agent markdown files for explorer, implementer, reviewer roles | Strategy reference |
| Team orchestration in execute-tasks | TeamCreate/spawn/coordinate/cleanup lifecycle per task | Agent definitions |
| Session file extensions | `progress.md` team summary + `team_activity.md` per team | Team orchestration |
| Graceful degradation | Fallback chain: Full → Review → Solo | Team orchestration |
| Task Manager type extensions | TeamActivity, TeamMember TypeScript types | None |
| Task Manager parsing | `parseTeamActivityMd()` in taskService.ts | Type extensions |
| Task Manager UI | Progressive-detail team monitoring in ExecutionDialog | Parsing + Types |
| Configuration support | Settings file + `--team-strategy` CLI arg + per-task metadata | Strategy resolution |

**Checkpoint Gate**: Full team strategy executes a real task session with team activity visible in Task Manager

---

### 9.2 Phase 2: Strategy Expansion + Polish
**Completion Criteria**: All 4 strategies work, cross-task teams work, configuration is polished, documentation is complete.

| Deliverable | Description | Dependencies |
|-------------|-------------|--------------|
| Review strategy implementation | Implementer + reviewer agent coordination | Phase 1 team infrastructure |
| Research strategy implementation | Explorer + implementer agent coordination | Phase 1 team infrastructure |
| Cross-task teams | `metadata.team_group` support with persistent team across tasks | Phase 1 team infrastructure |
| Strategy-specific UI indicators | Visual differentiation of strategies in Task Manager | Phase 1 UI |
| Configuration validation | Helpful error messages for invalid configs | Phase 1 config |
| Documentation updates | CLAUDE.md, plugin READMEs, skill descriptions | All Phase 2 features |
| CHANGELOG entries | Both plugins and Task Manager | All Phase 2 features |

**Checkpoint Gate**: All strategies tested, cross-task teams working, documentation complete

---

### 9.3 Phase 3: Enhancement
**Completion Criteria**: Edge cases handled, performance validated, user experience refined.

| Deliverable | Description | Dependencies |
|-------------|-------------|--------------|
| Performance optimization | Profile team overhead, optimize file writing frequency | Phase 2 |
| Enhanced team activity view | Message timeline, phase indicators in expanded detail view | Phase 2 UI |
| Error reporting improvements | Better diagnostics for team failures in session summary | Phase 2 |
| create-tasks integration | `create-tasks` skill can suggest team strategies based on task complexity | Phase 2 strategies |

## 10. Dependencies

### 10.1 Technical Dependencies

| Dependency | Owner | Status | Risk if Delayed |
|------------|-------|--------|-----------------|
| Claude Code TeamCreate/TeamDelete/SendMessage APIs | Anthropic | Available | Blocking — core feature depends on these |
| Claude Code Task tool with team_name param | Anthropic | Available | Blocking — agent spawning into teams |
| Chokidar file watching | Task Manager | Implemented | None — already works |
| SSE event pipeline | Task Manager | Implemented | None — already works |

### 10.2 Cross-Team Dependencies

| Team | Dependency | Status |
|------|------------|--------|
| SDD Plugin | Team strategy definitions and orchestration updates | To be implemented |
| Tools Plugin | Reference implementation patterns (teams-deep-analysis) | Available |
| Task Manager | UI extensions and new parsing logic | To be implemented |

## 11. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|---------------------|
| Team coordination complexity makes orchestration fragile | High | Medium | Strategy abstraction isolates team logic; graceful degradation prevents total failure |
| Multiple concurrent teams overwhelm filesystem/polling | Medium | Low | Cap at `max_parallel` teams; Chokidar already handles many file changes |
| Agent failures cascade within teams | High | Medium | Graceful degradation chain (Full → Review → Solo); each role failure has specific handling |
| Token usage increases significantly with multi-agent teams | Medium | High | Document expected cost multiplier per strategy; make Solo the default |
| Session file format changes break Task Manager parsing | Medium | Low | Additive changes to progress.md; new team_activity.md files don't affect existing parsing |
| Team activity UI adds too much complexity to the dashboard | Medium | Low | Progressive detail: basic in main view, expanded on click; matches existing UX patterns |

## 12. Open Questions

| # | Question | Owner | Due Date | Resolution |
|---|----------|-------|----------|------------|
| 1 | What specific model tiers should be used for each agent role? (e.g., Opus for reviewer, Sonnet for implementer) | Developer | Phase 1 | — |
| 2 | Should the `create-tasks` skill auto-suggest team strategies based on task complexity/metadata? | Developer | Phase 2 | — |
| 3 | What are acceptable token usage multipliers per strategy? (e.g., Full team = ~3x solo) | Developer | Phase 1 | — |

## 13. Appendix

### 13.1 Glossary

| Term | Definition |
|------|------------|
| Team Strategy | A configuration that defines which agent roles collaborate on a task (Solo, Review, Research, Full) |
| Solo | Existing behavior: one task-executor agent per task |
| Review | Two agents: implementer writes code, reviewer independently verifies |
| Research | Two agents: explorer investigates codebase/requirements, implementer uses findings |
| Full | Three agents: explorer + implementer + reviewer pipeline |
| Cross-Task Team | A team that persists across multiple tasks sharing `metadata.team_group` |
| Progressive Detail | UI pattern: summary view by default, expandable to full detail on interaction |
| Graceful Degradation | Automatic fallback to simpler strategy when team agents fail |
| Filesystem-as-message-bus | Project architecture: systems communicate via well-known file paths, no shared runtime |

### 13.2 References
- `plugins/sdd/skills/execute-tasks/SKILL.md` — Current execute-tasks workflow
- `plugins/sdd/skills/execute-tasks/references/orchestration.md` — Current orchestration loop
- `plugins/tools/skills/teams-deep-analysis/SKILL.md` — Reference Agent Teams implementation
- `apps/task-manager/src/lib/taskService.ts` — Current execution monitoring parsing
- `apps/task-manager/src/types/execution.ts` — Current execution types
- `apps/task-manager/src/components/ExecutionDialog.tsx` — Current execution UI

---

*Document generated by SDD Tools*
