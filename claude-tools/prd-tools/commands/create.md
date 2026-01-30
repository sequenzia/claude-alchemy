---
description: Create a new Product Requirements Document through an interactive interview process
allowed_tools:
  - AskUserQuestion
  - Task
  - Read
  - Glob
---

# PRD Generator - Create Command

You are initiating the PRD creation workflow. This process will gather requirements through an interactive interview and generate a comprehensive Product Requirements Document.

## Workflow

### Step 1: Check for Settings

First, check if there is a settings file at `.claude/prd-tools.local.md` to get any custom configuration like output path or author name.

### Step 2: Gather Initial Information

Use `AskUserQuestion` to gather the essential starting information with these four questions:

**Question 1 - PRD Name:**
- Header: "PRD Name"
- Question: "What would you like to name this PRD?"
- Options: Allow text input for a descriptive name

**Question 2 - Type:**
- Header: "Type"
- Question: "What type of product/feature is this?"
- Options:
  - "New product" - A completely new product being built from scratch
  - "New feature" - A new feature for an existing product

**Question 3 - Depth:**
- Header: "Depth"
- Question: "How detailed should the PRD be?"
- Options:
  - "High-level overview (Recommended)" - Executive summary with key features and goals
  - "Detailed specifications" - Standard PRD with acceptance criteria and phases
  - "Full technical documentation" - Comprehensive specs with API definitions and data models

**Question 4 - Description:**
- Header: "Description"
- Question: "Briefly describe the product/feature and its key requirements"
- Options: Allow text input describing the problem, main features, and constraints

### Step 3: Launch Interview Agent

After receiving the initial responses, immediately launch the Interview Agent using the `Task` tool. Provide this context:

- PRD Name: The name provided by the user
- Product Type: "New product" or "New feature" based on selection
- Depth Level: The selected depth option
- Initial Description: The description provided
- Output Path: From settings or default `specs/PRD-{name}.md`
- Author: From settings or "Not specified"

The Interview Agent will:
1. Conduct an adaptive interview based on the depth level
2. Cover all four categories: Problem & Goals, Functional Requirements, Technical Specs, Implementation
3. Present a summary for user confirmation before generating the PRD
4. Generate the PRD using the appropriate template
5. Write the PRD to the configured output path

### Step 4: Handoff Complete

Once you have launched the Interview Agent, your role is complete. The agent will handle:
- Conducting the interview rounds
- Gathering detailed requirements
- Presenting the summary for confirmation
- Generating and saving the final PRD

## Plan Mode Behavior

**CRITICAL**: This command generates a PRD document, NOT an implementation plan. When invoked during Claude Code's plan mode:

- **DO NOT** create an implementation plan for how to build the PRD's described features
- **DO NOT** defer PRD generation to an "execution phase"
- **DO** proceed with the full interview and PRD generation workflow immediately
- **DO** write the PRD file to the output path as normal

The PRD is a planning artifact itself - generating it IS the planning activity. The command's purpose is to create a specification document, not to plan code implementation.

## Notes

- Always check for settings file first to respect user configuration
- Pass all gathered information to the Interview Agent
- The Interview Agent handles all subsequent interaction
