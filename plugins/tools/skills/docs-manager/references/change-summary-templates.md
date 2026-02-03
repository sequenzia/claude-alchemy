# Change Summary Templates

Use these templates when generating change summaries in Phase 4. The user selects one or more output formats during Phase 3.

---

## Format 1: Markdown Changelog

Follows [Keep a Changelog](https://keepachangelog.com/) conventions. Reference the `changelog-format` skill for additional guidance.

```markdown
## [Unreleased]

### Added
- Add [feature] with [key capability]
- Add [new component] for [purpose]

### Changed
- Update [component] to [new behavior]
- Refactor [module] for [improvement]

### Fixed
- Fix [bug] that caused [symptom]

### Removed
- Remove [deprecated feature] in favor of [replacement]
```

### Guidelines
- Use imperative mood ("Add feature" not "Added feature")
- One entry per distinct change
- Group related changes under the same category
- Focus on user-facing impact, not implementation details
- Order categories: Added, Changed, Deprecated, Removed, Fixed, Security

---

## Format 2: Git Commit Message

Follows [Conventional Commits](https://www.conventionalcommits.org/) style.

```
type(scope): summary of changes

Detailed description of what changed and why. Cover the motivation
for the change and contrast with previous behavior.

Changes:
- List specific modifications
- Include file paths for significant changes
- Note any breaking changes

BREAKING CHANGE: Description of breaking change (if applicable)
```

### Type Reference

| Type | Use For |
|------|---------|
| `feat` | New features |
| `fix` | Bug fixes |
| `docs` | Documentation changes |
| `refactor` | Code restructuring without behavior change |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `chore` | Build, CI, or tooling changes |

### Guidelines
- Subject line: max 72 characters, imperative mood, no period
- Body: wrap at 72 characters, explain "why" not just "what"
- Include `BREAKING CHANGE:` footer for breaking changes
- Reference issue numbers where applicable: `Closes #123`

---

## Format 3: MkDocs Documentation Page

A full documentation page suitable for a changelog or release notes section.

```markdown
# Changes: VERSION_OR_RANGE

Summary of changes for this release or period.

## Highlights

!!! tip "Key Changes"
    Brief summary of the most important changes in this release.

### New Features

#### Feature Name

Description of the new feature and its purpose.

```language title="Example Usage"
// Code example showing the new feature
```  ←(close fence)

### Improvements

- **Component**: Description of improvement
- **Performance**: Description of optimization

### Bug Fixes

- Fix [issue description] that affected [scenario] (#issue-number)

### Breaking Changes

!!! warning "Breaking Changes"
    The following changes require action when upgrading.

#### Change Description

**Before:**
```language
// Old API or behavior
```  ←(close fence)

**After:**
```language
// New API or behavior
```  ←(close fence)

**Migration:** Steps to update existing code.

## Affected Files

| File | Change Type | Description |
|------|-------------|-------------|
| `path/to/file` | Modified | Brief description |

## Contributors

- @username — Description of contribution
```

### Guidelines
- Use admonitions to highlight breaking changes and key features
- Include before/after code examples for API changes
- Provide migration guidance for breaking changes
- Link to relevant documentation pages for new features
- List affected files with change types (Added, Modified, Removed)

---

## Choosing Formats

When the user requests a change summary, present the three format options:

| Format | Best For |
|--------|----------|
| **Markdown Changelog** | Appending to an existing CHANGELOG.md |
| **Git Commit Message** | Describing changes in a commit or PR |
| **MkDocs Page** | Publishing release notes in the documentation site |

The user may select multiple formats. Generate each independently — they serve different audiences and purposes.
