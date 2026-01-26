---
description: Analyze a codebase to generate a comprehensive architecture and structure report
argument-hint: "[path]"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
  - Task
  - TaskCreate
  - TaskUpdate
  - TaskList
  - AskUserQuestion
arguments:
  - name: path
    description: Optional path to analyze (defaults to current directory)
    required: false
---

# Codebase Analysis Workflow

You are executing a 3-phase codebase analysis workflow. This workflow explores a codebase, analyzes its architecture, and generates a comprehensive report.

**CRITICAL: You MUST complete ALL 3 phases.** The workflow is not complete until Phase 3: Output & Context Loading is finished. After completing each phase, immediately proceed to the next phase without waiting for user prompts.

## Phase Overview

Execute these phases in order, completing ALL of them:

1. **Codebase Exploration** - Explore structure, patterns, and dependencies
2. **Deep Analysis** - Analyze findings to identify architecture and patterns
3. **Output & Context Loading** - Present options and deliver results in user's preferred format

---

## Phase 1: Codebase Exploration

**Goal:** Thoroughly explore the codebase to gather raw findings.

1. Create task entries for all 3 phases using TaskCreate:
   ```
   - Phase 1: Codebase Exploration
   - Phase 2: Deep Analysis
   - Phase 3: Report Generation
   ```

2. Mark Phase 1 as `in_progress` using TaskUpdate

3. Determine the analysis path:
   - If a path argument was provided, use that path
   - Otherwise, use the current working directory
   - Inform the user of the scope being analyzed

4. **Launch 3 code-explorer agents in parallel** using the Task tool with `subagent_type: "dev-tools:code-explorer"`:

   **Agent 1: Project Structure & Configuration**
   ```
   Explore and analyze the project structure and configuration.
   Path to analyze: [path]

   Focus on:
   - Project root structure (directories and their purposes)
   - Entry points (main files, index files, CLI entry points)
   - Configuration files (package.json, pyproject.toml, tsconfig.json, etc.)
   - Build configuration (webpack, vite, rollup, etc.)
   - Development tools (.eslintrc, .prettierrc, etc.)
   - CI/CD configuration (.github/workflows, Jenkinsfile, etc.)
   - Environment configuration (.env.example, config files)

   Return a structured report of:
   - Directory structure overview
   - Key entry points and their purposes
   - Configuration summary
   - Build and development tooling
   ```

   **Agent 2: Core Modules & Business Logic**
   ```
   Explore and analyze the core modules and business logic.
   Path to analyze: [path]

   Focus on:
   - Core source directories (src/, lib/, app/)
   - Key classes, functions, and modules
   - Business logic and domain models
   - State management (if applicable)
   - Data models and schemas
   - Service layers and APIs
   - Utility and helper modules

   Return a structured report of:
   - Key modules and their responsibilities
   - Important classes/functions with brief descriptions
   - Design patterns observed
   - Code organization patterns
   ```

   **Agent 3: Dependencies & Integrations**
   ```
   Explore and analyze dependencies and external integrations.
   Path to analyze: [path]

   Focus on:
   - Package dependencies (production vs development)
   - Internal module dependencies (how modules import each other)
   - External API integrations
   - Database connections and ORM usage
   - Third-party service integrations
   - Authentication/authorization mechanisms
   - Caching layers
   - Message queues or event systems

   Return a structured report of:
   - Dependency analysis (major frameworks, libraries)
   - External integration points
   - Data storage mechanisms
   - Communication patterns
   ```

5. **Wait for all agents to complete** and collect their findings.

6. **Synthesize exploration findings:**
   - Combine results from all 3 agents
   - Identify overlapping or conflicting information
   - Note any gaps in coverage
   - Create a consolidated findings document

7. Mark Phase 1 as `completed`

---

## Phase 2: Deep Analysis

**Goal:** Analyze exploration findings to identify architecture, patterns, and insights.

1. Mark Phase 2 as `in_progress`

2. **Launch codebase-analyzer agent** using the Task tool with `subagent_type: "dev-tools:codebase-analyzer"`:

   ```
   Analyze the following codebase exploration findings and produce a deep analysis.

   Path analyzed: [path]

   ## Exploration Findings

   [Include the synthesized findings from Phase 1]

   ---

   Produce a comprehensive analysis covering:
   1. Architecture style identification
   2. Key modules and their responsibilities
   3. Dependency relationships between modules
   4. Technology stack summary
   5. Code patterns and conventions
   6. Entry points and data flow
   7. External integrations
   8. Testing approach
   9. Build and deployment patterns
   10. Strengths and areas for improvement
   ```

3. **Wait for analysis to complete** and collect the results.

4. Mark Phase 2 as `completed`

---

## Phase 3: Output & Context Loading

**Goal:** Present output options and deliver analysis results in the user's preferred format.

1. Mark Phase 3 as `in_progress`

2. **Ask user for output preferences** using `AskUserQuestion` with multi-select:

   ```
   Question: "How would you like to use the analysis results?"
   Header: "Output"
   Options:
     - Label: "Save detailed report"
       Description: "Generate a comprehensive markdown report to internal/reports/"
     - Label: "Load into session context"
       Description: "Inject analysis into this session so I can reference it when answering questions"
     - Label: "Update project docs"
       Description: "Update README.md and/or CLAUDE.md with analysis summary"
   MultiSelect: true
   ```

3. **Handle the user's selection:**

   ### If NEITHER option is selected:
   - Display a brief summary (~200-300 words) directly in the chat covering:
     - Architecture style
     - Key modules (3-5 with one-line descriptions)
     - Technology stack highlights
     - Notable patterns or insights
   - Confirm: "Analysis complete. Key findings displayed above. You can re-run with output options if you need a detailed report or persistent context."
   - Skip to step 8

   ### If "Save detailed report" is selected:
   - Ensure output directory exists: `mkdir -p internal/reports`
   - **Launch report-generator agent** using Task tool with `subagent_type: "dev-tools:report-generator"`:
     ```
     Generate a comprehensive codebase analysis report in markdown format.

     Path analyzed: [path]
     Analysis date: [current date]

     ## Analysis Findings

     [Include the complete analysis from Phase 2]

     ---

     Generate a well-structured markdown report and save it to:
     internal/reports/codebase-analysis-report.md

     The report should be polished, readable, and useful for developers
     new to the codebase as well as those looking to understand the
     overall architecture.
     ```
   - Wait for report generation to complete
   - Verify the report was created by reading the file
   - Confirm: "Report saved to `internal/reports/codebase-analysis-report.md`"

   ### If "Load into session context" is selected:
   - **Ask follow-up question** using `AskUserQuestion`:
     ```
     Question: "What level of detail for the session context?"
     Header: "Detail Level"
     Options:
       - Label: "Condensed summary"
         Description: "~500-1000 words with architecture, organization, stack, and key insights"
       - Label: "Full analysis"
         Description: "Complete findings from the deep analysis phase"
     MultiSelect: false
     ```

   - **If "Condensed summary" selected**, format the analysis as:
     ```markdown
     ---
     **Codebase Analysis Context Loaded**

     The following analysis has been loaded into this session. I will use this context when answering questions about this codebase.

     ## Codebase Context: [Project Name]

     ### Architecture
     - Style: [e.g., Modular monolith with event-driven components]
     - Key modules: [list 3-5 main modules with one-line descriptions]
     - Primary patterns: [e.g., Repository pattern, Factory, Observer]

     ### Code Organization
     - Entry points: [main files/functions]
     - Directory structure: [brief overview]
     - Naming conventions: [key conventions]

     ### Technology Stack
     - Languages: [with versions if known]
     - Frameworks: [key frameworks]
     - Key dependencies: [critical deps]

     ### Development Info
     - Testing: [approach, frameworks, coverage notes]
     - Build: [build system, commands]
     - External integrations: [APIs, databases, services]

     ### Key Insights
     - [2-3 bullet points on important patterns/conventions to follow]

     ---
     ```

   - **If "Full analysis" selected**, format the analysis as:
     ```markdown
     ---
     **Codebase Analysis Context Loaded**

     The following analysis has been loaded into this session. I will use this context when answering questions about this codebase.

     [Include complete Phase 2 analysis findings, formatted as readable markdown]

     ---
     ```

   - **Display the formatted context** directly in the response
   - Confirm with brief summary: "Analysis loaded into session context. Sections: Architecture, Code Organization, Technology Stack, Development Info, Key Insights."

   ### If BOTH "Save detailed report" AND "Load into session context" are selected:
   - First: Generate and save the detailed report (as described above)
   - Then: Ask for context detail level and inject context (as described above)
   - Confirm both actions completed

   ### If "Update project docs" is selected:

   1. **Ask which files to update** using `AskUserQuestion`:
      ```
      Question: "Which documentation files should I update?"
      Header: "Target Files"
      Options:
        - Label: "README.md only"
          Description: "Update project README with user-facing overview"
        - Label: "CLAUDE.md only"
          Description: "Update CLAUDE.md with AI-context-optimized summary"
        - Label: "Both files"
          Description: "Update both with tailored content for each"
      MultiSelect: false
      ```

   2. **For README.md** (if "README.md only" or "Both files" selected):
      - Read existing `README.md` at the analyzed path root (note if file doesn't exist)
      - **Launch report-generator agent** using Task tool with `subagent_type: "dev-tools:report-generator"`:
        ```
        Generate README.md content from codebase analysis.
        Mode: readme-update

        Path analyzed: [path]
        Existing README content:
        ---
        [Include full existing README.md content, or "FILE_DOES_NOT_EXIST" if missing]
        ---

        ## Analysis Findings

        [Include the complete analysis from Phase 2]

        ---

        Generate user-facing documentation sections and smart-merge with existing content.
        Save the merged result to: [path]/README.md
        ```
      - Wait for agent to complete
      - Confirm: "Updated README.md with project overview, structure, and tech stack."

   3. **For CLAUDE.md** (if "CLAUDE.md only" or "Both files" selected):
      - Read existing `CLAUDE.md` at the analyzed path root (note if file doesn't exist)
      - **Launch report-generator agent** using Task tool with `subagent_type: "dev-tools:report-generator"`:
        ```
        Generate CLAUDE.md content from codebase analysis.
        Mode: claude-md-update

        Path analyzed: [path]
        Existing CLAUDE.md content:
        ---
        [Include full existing CLAUDE.md content, or "FILE_DOES_NOT_EXIST" if missing]
        ---

        ## Analysis Findings

        [Include the complete analysis from Phase 2]

        ---

        Generate AI-assistant-optimized documentation and smart-merge with existing content.
        Save the merged result to: [path]/CLAUDE.md
        ```
      - Wait for agent to complete
      - Confirm: "Updated CLAUDE.md with project overview, repository structure, and key patterns."

   4. **If "Both files" selected**: Run both updates sequentially (README.md first, then CLAUDE.md)

   Note: "Update project docs" can be combined with other output options. Process all selected options.

4. Mark Phase 3 as `completed`

5. **Final message based on selection:**
   - If report saved: "Report available at `internal/reports/codebase-analysis-report.md`"
   - If context loaded: "I now have detailed knowledge of this codebase and can answer architectural questions, suggest implementations following existing patterns, and help navigate the code."
   - If project docs updated: "Project documentation updated. README.md and/or CLAUDE.md now contain analysis-derived content."
   - Offer next steps:
     - Ask questions about the codebase architecture
     - Run analysis on a different path
     - Request specific deep-dives into modules or patterns

---

## Error Handling

If any phase fails:
1. Mark the phase as blocked in task tracking
2. Explain what went wrong
3. Ask the user how to proceed:
   - Retry the phase
   - Skip to next phase (if possible)
   - Abort the workflow

If an agent returns incomplete results:
- Note the gaps in coverage
- Continue with available information
- Document limitations in the final report

---

## Agent Coordination

When launching parallel agents in Phase 1:
- Give each agent a distinct focus area
- Wait for all agents to complete before synthesizing
- Handle agent failures gracefully (continue with partial results)

When calling Task tool for agents:
- Use `model: "opus"` for codebase-analyzer agent
- Use default model (sonnet) for code-explorer and report-generator agents
- Use `run_in_background: false` to wait for results
