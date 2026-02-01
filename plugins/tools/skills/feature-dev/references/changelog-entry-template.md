# CHANGELOG.md Entry Template

Use this template when adding feature changelog entries in Phase 7.

---

## Entry Format

Entries should be concise, user-focused lines under the appropriate category:

```markdown
### Added
- Add [feature name] with [key capability]

### Changed
- Update [component] to [new behavior]

### Fixed
- Fix [issue description]
```

---

## Usage Instructions

1. **Locate CHANGELOG.md:**
   - Find the project's `CHANGELOG.md` in the repository root
   - If it doesn't exist, create it using the structure below

2. **Find the `[Unreleased]` section:**
   - Entries go under `## [Unreleased]`
   - If the section doesn't exist, add it after the header

3. **Choose the appropriate category:**
   - **Added** - New features or capabilities
   - **Changed** - Changes to existing functionality
   - **Deprecated** - Features that will be removed
   - **Removed** - Features that were removed
   - **Fixed** - Bug fixes
   - **Security** - Security improvements

4. **Write concise entries:**
   - Use imperative mood ("Add feature" not "Added feature")
   - Focus on user-facing changes
   - One line per distinct change
   - Reference related ADRs if applicable

---

## CHANGELOG.md Structure

If creating a new CHANGELOG.md:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Your new feature entry here
```

---

## Example Entries

### Simple Feature
```markdown
### Added
- Add user profile editing with avatar upload support
```

### Feature with Multiple Changes
```markdown
### Added
- Add profile edit form with real-time validation
- Add avatar upload with image cropping

### Changed
- Update navigation to display user avatar
```

### Referencing ADRs
```markdown
### Added
- Add JWT-based user authentication (see ADR-0003)
```

---

## Categories Reference

Use these categories from Keep a Changelog (in this order):

| Category | Use For |
|----------|---------|
| **Added** | New features |
| **Changed** | Changes to existing functionality |
| **Deprecated** | Features that will be removed in future |
| **Removed** | Features that were removed |
| **Fixed** | Bug fixes |
| **Security** | Security improvements |

For feature development, **Added** and **Changed** are most common.

---

## Tips

- Keep entries concise - detailed implementation notes belong in commits or ADRs
- Focus on what users can now do, not implementation details
- If a feature spans multiple categories, add entries to each relevant one
- Load the `changelog-format` skill for additional Keep a Changelog guidelines
