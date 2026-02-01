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

Execute a structured 4-phase codebase analysis workflow to gather insights.

**CRITICAL: Complete ALL 4 phases.** The workflow is not complete until Phase 4: Post-Analysis Actions is finished. After completing each phase, immediately proceed to the next phase without waiting for user prompts.

## Phase Overview

1. **Exploration** — Launch parallel agents to investigate the codebase
2. **Synthesis** — Merge and analyze findings via synthesizer agent
3. **Reporting** — Present structured analysis to the user
4. **Post-Analysis Actions** — Save, document, or retain analysis insights

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

3. **IMPORTANT: Proceed immediately to Phase 4.**
   Do NOT stop here. Do NOT wait for user input. The report is presented, but the workflow requires Post-Analysis Actions. Continue directly to Phase 4 now.

---

## Phase 4: Post-Analysis Actions

**Goal:** Let the user save, document, or retain analysis insights from the report.

1. **Present action menu:**

   Use `AskUserQuestion` with `multiSelect: true` to present all available actions:
   - **Save report as Markdown file** — Write the full report to a file
   - **Update README.md with analysis insights** — Add architecture/structure info to README
   - **Update CLAUDE.md with analysis insights** — Add patterns/conventions to CLAUDE.md
   - **Keep a condensed summary in memory** — Retain a quick-reference summary in conversation context

   If the user selects no actions, the workflow is complete. Thank the user and end.

2. **Execute selected actions in the following fixed order:**

   ### Action: Save Report as Markdown File

   - Check if a `docs/` directory exists in the project root
     - If yes, suggest default path: `docs/codebase-analysis.md`
     - If no, suggest default path: `codebase-analysis.md` in the project root
   - Use `AskUserQuestion` to let the user confirm or customize the file path
   - Write the full report content (same as Phase 3 output) to the confirmed path using the Write tool
   - Confirm the file was saved

   ### Action: Update README.md

   - Read the existing README.md at the project root
     - If no README.md exists, skip this action and inform the user
   - Draft updates based on analysis insights — focus on:
     - Architecture overview
     - Project structure
     - Tech stack summary
   - Present the draft to the user for approval using `AskUserQuestion` with options:
     - **Apply** — Apply the drafted updates
     - **Modify** — Let the user describe what to change, then re-draft
     - **Skip** — Skip this action entirely
   - If approved, apply updates using the Edit tool

   ### Action: Update CLAUDE.md

   - Read the existing CLAUDE.md at the project root
     - If no CLAUDE.md exists, use `AskUserQuestion` to ask if one should be created
     - If user declines, skip this action
   - Draft updates based on analysis insights — focus on:
     - Key patterns and conventions discovered
     - Critical files and their roles
     - Important dependencies
     - Architectural decisions and constraints
   - Present the draft to the user for approval using `AskUserQuestion` with options:
     - **Apply** — Apply the drafted updates
     - **Modify** — Let the user describe what to change, then re-draft
     - **Skip** — Skip this action entirely
   - If approved, apply updates using the Edit tool (or Write tool if creating new)

   ### Action: Keep Insights in Memory

   - Present a condensed **Codebase Quick Reference** inline in the conversation:
     - **Architecture** — 1-2 sentence summary of how the codebase is structured
     - **Key Files** — 3-5 most critical files with one-line descriptions
     - **Conventions** — Important patterns and naming conventions
     - **Tech Stack** — Core technologies and frameworks
     - **Watch Out For** — Top risks or complexity hotspots
   - No file is written — this summary stays in conversation context for reference during the session

3. **Complete the workflow:**
   Summarize which actions were executed and confirm the workflow is complete.

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
