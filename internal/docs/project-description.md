# Claude Alchemy — Project Description

## One-liner

A plugin suite and developer toolkit that extends Claude Code into a structured development platform — from specs to tasks to autonomous execution.

## Medium

Claude Alchemy is an open-source toolkit for AI and software engineers who use Claude Code. It adds structured development workflows on top of Claude Code through two plugins, a real-time task manager, and a VS Code extension, all designed to work together as an integrated pipeline.

The **SDD Plugin** provides several skills and agents that specialize in Spec Driven Development. The **Tools Plugin** provides skills and agents for feature development, codebase analysis, code review, and documentation. The **Task Manager** gives you a live dashboard to monitor autonomous execution as it happens — tasks update in real time via filesystem events. The **VS Code Extension** brings schema validation and autocomplete to plugin development, so building on Claude Code feels like a first-class development experience.

Everything in Claude Alchemy is built with Claude Code for Claude Code. The plugins themselves are plain markdown — readable, editable, and version-controlled like any other code. There are no opaque binaries or hidden configuration layers. This "markdown-as-code" design means you can inspect, customize, and extend every workflow. It's proof of concept and production tool in one: Claude Code built the toolkit that makes Claude Code better.

## Expanded

Claude Alchemy is an open-source toolkit for AI and software engineers who use Claude Code. It adds structured development workflows on top of Claude Code through two plugins, a real-time task manager, and a VS Code extension — all designed to work together as an integrated pipeline.

### SDD Plugin (v0.2.6)

Spec-Driven Development — turn ideas into structured specifications and executable tasks.

- Interactive spec creation through an adaptive interview process with proactive recommendations
- Automated spec analysis for inconsistencies, ambiguities, and missing requirements
- Task generation that decomposes specs into dependency-ordered Claude Code Tasks
- Autonomous task execution with wave-based concurrency and adaptive verification

### Tools Plugin (v0.2.3)

Developer agents and skills for the full feature development lifecycle.

- Feature development workflow with exploration, architecture, implementation, and review phases
- Codebase analysis and deep exploration using multi-agent collaboration
- Code review, architecture patterns, and language-specific best practices
- Documentation generation, changelog management, and Git workflow automation

### Task Manager

A Next.js dashboard for real-time visibility into autonomous task execution.

- Live task status updates via filesystem watching and Server-Sent Events
- Execution context viewer showing current phase, progress, and session artifacts
- Server Components with TanStack Query for efficient data flow
- Direct integration with Claude Code's native task system

### VS Code Extension (v0.2.0)

Schema validation and authoring support for Claude Code plugin development.

- JSON schema validation for `plugin.json` manifests
- YAML frontmatter validation and autocomplete for skills, agents, and hooks
- Hover documentation for plugin configuration fields
- Activates automatically in any workspace containing a Claude Code plugin

### Built with Claude Code

Everything in Claude Alchemy is built with Claude Code and built for Claude Code. The plugins are plain markdown — readable, editable, and version-controlled like any other code. There are no opaque binaries or hidden configuration layers. This "markdown-as-code" design means you can inspect, customize, and extend every workflow. Claude Code built the toolkit that makes Claude Code better.
