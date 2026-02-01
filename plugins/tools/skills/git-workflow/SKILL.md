---
name: git-workflow
description: Orchestrates git commit and push operations based on user intent. Use when user says "commit changes", "push it", "commit and push", "ship it", "send it up", "save changes", or wants to perform git operations.
model: haiku
user-invocable: false
disable-model-invocation: false
---

# Git Workflow

This skill routes git operations to the appropriate commands based on user intent.

## When to Use

Trigger this skill when the user wants to:

- **Commit only**: "commit changes", "save changes", "commit this", "commit it", "commit my work"
- **Push only**: "push changes", "push to remote", "push it up", "push this", "push it"
- **Both**: "commit and push", "ship it", "send it up", "save and push"

## Behavior

### Commit Only

When the user's intent is to commit without pushing:

**Trigger phrases**: commit, save changes, commit this, commit it, commit my work

**Action**: Run `/dev-tools:git-commit`

### Push Only

When the user's intent is to push existing commits without creating a new commit:

**Trigger phrases**: push, push changes, push to remote, push it up, push it

**Action**: Run `/dev-tools:git-push`

### Commit and Push

When the user wants to commit their changes AND push them to the remote:

**Trigger phrases**: commit and push, ship it, send it up, save and push

**Action**: Run `/dev-tools:git-commit` first, then `/dev-tools:git-push`

## Decision Logic

1. Parse the user's request for intent keywords
2. If request contains "push" but NOT "commit" → push only
3. If request contains "commit" or "save" but NOT "push" → commit only
4. If request contains both "commit" and "push" → commit then push
5. If request matches "ship it" or "send it up" → commit then push

## Notes

- The commit command stages all changes before committing
- The push command handles upstream conflicts with automatic rebase
- If commit fails (e.g., pre-commit hook), do not proceed to push
