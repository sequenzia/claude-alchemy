---
name: codebase-analysis
description: Execute a structured codebase exploration workflow to gather insights. Use when asked to "analyze codebase", "explore codebase", "understand this codebase", or "map the codebase".
argument-hint: <analysis-context or feature-description>
model: inherit
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, AskUserQuestion
---

# Codebase Analysis Workflow

Execute a structured 3-phase codebase analysis workflow to gather insights.

**CRITICAL: Complete ALL 3 phases.** The workflow is not complete until Phase 3: Reporting is finished. After completing each phase, immediately proceed to the next phase without waiting for user prompts.

## Phase Overview

1. **Exploration** — Launch parallel agents to investigate the codebase
2. **Synthesis** — Merge and analyze findings via synthesizer agent
3. **Reporting** — Present structured analysis to the user

---

## Phase 1: Codebase Exploration

**Goal:** Thoroughly explore the codebase to gather raw findings.

1. **Determine analysis context:**
   - If `$ARGUMENTS` is provided, use it as the analysis context (feature area, question, or general exploration goal)
   - If no arguments, set context to "general codebase understanding"
   - Set `PATH = current working directory`
   - Inform the user: "Analyzing codebase at: `PATH`" with the analysis context

2. **Load skills for this phase:**
   - Read `${CLAUDE_PLUGIN_ROOT}/skills/project-conventions/SKILL.md` and apply its guidance
   - Read `${CLAUDE_PLUGIN_ROOT}/skills/language-patterns/SKILL.md` and apply its guidance

3. **Determine focus areas:**
   - For feature-focused analysis, use 3 agents:
     ```
     Agent 1: Explore entry points and user-facing code related to the context
     Agent 2: Explore data models, schemas, and storage related to the context
     Agent 3: Explore utilities, helpers, and shared infrastructure
     ```
   - For general codebase understanding, 2 agents may suffice:
     ```
     Agent 1: Explore application structure, entry points, and core logic
     Agent 2: Explore configuration, infrastructure, and shared utilities
     ```

4. **Launch code-explorer agents:**

   Launch agents in parallel using the Task tool with `subagent_type: "dev-tools:code-explorer"`:
   ```
   Path to analyze: [PATH]
   Analysis context: [context from step 1]
   Focus area: [specific focus for this agent]

   Find and analyze:
   - Relevant files and their purposes
   - Key functions/classes and their roles
   - Existing patterns and conventions
   - Integration points and dependencies

   Return a structured report of your findings.
   ```

5. **Handle agent failures:**
   - If an agent fails, note which focus area was missed
   - Continue with successful results — partial findings are still valuable
   - If all agents fail, inform the user and offer to retry or explore manually

---

## Phase 2: Synthesis and Analysis

**Goal:** Merge exploration findings into a unified analysis.

1. **Launch codebase-synthesizer agent:**

   Use the Task tool with `subagent_type: "dev-tools:codebase-synthesizer"` and `model: "opus"`:
   ```
   Analysis context: [context from Phase 1]
   Codebase path: [PATH]

   Exploration findings from [N] agents:

   --- Agent 1: [Focus Area] ---
   [Full report from agent 1]

   --- Agent 2: [Focus Area] ---
   [Full report from agent 2]

   --- Agent 3: [Focus Area] (if applicable) ---
   [Full report from agent 3]

   Synthesize these findings into a unified analysis. Merge duplicates,
   read critical files in depth, map relationships between components,
   identify patterns, and assess challenges.
   ```

2. **Review synthesis:**
   - Verify the synthesizer covered all focus areas
   - If critical gaps exist, use Glob/Grep to fill them directly

---

## Phase 3: Reporting

**Goal:** Present a structured analysis to the user.

1. **Load report template:**
   - Read `${CLAUDE_PLUGIN_ROOT}/skills/codebase-analysis/references/report-template.md`
   - Use it to structure the presentation

2. **Present the analysis:**
   Structure the report with these sections:
   - **Executive Summary** — Lead with the most important finding
   - **Architecture Overview** — How the codebase is structured
   - **Critical Files** — The 5-10 most important files with details
   - **Patterns & Conventions** — Recurring patterns and coding conventions
   - **Relationship Map** — How components connect to each other
   - **Challenges & Risks** — Technical risks and complexity hotspots
   - **Recommendations** — Actionable next steps

3. **Offer next steps:**
   Suggest what the user might do next:
   - Dive deeper into a specific area
   - Use the analysis to inform feature development
   - Address identified risks or challenges

---

## Error Handling

If any phase fails:
1. Explain what went wrong
2. Ask the user how to proceed:
   - Retry the phase
   - Skip to next phase (with partial results)
   - Abort the workflow

---

## Agent Coordination

When launching parallel agents:
- Give each agent a distinct focus area to minimize overlap
- Wait for all agents to complete before proceeding to synthesis
- Handle agent failures gracefully — continue with partial results

When calling Task tool for agents:
- Use `model: "opus"` for codebase-synthesizer agent
- Use default model (sonnet) for code-explorer agents

---

## Additional Resources

- For report structure, see [references/report-template.md](references/report-template.md)
