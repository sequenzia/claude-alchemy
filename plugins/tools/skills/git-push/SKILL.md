---
name: git-push
description: Push commits to remote with automatic rebase on conflict. Use when user says "push changes", "push to remote", "push it up".
model: haiku
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash
---

# Git Push

Push local commits to the remote repository. Automatically handles upstream conflicts by rebasing and retrying.

## Workflow

Execute these steps in order.

---

### Step 1: Check for Commits to Push

Get the current branch and check if there are commits to push:

```bash
git branch --show-current
```

```bash
git rev-parse HEAD
```

```bash
git rev-parse @{u} 2>/dev/null || echo "no-upstream"
```

- If no upstream exists, continue to push (will set upstream).
- If local HEAD equals upstream HEAD, report: "Already up to date. Nothing to push." and stop.
- If local is ahead of upstream, continue to Step 2.

---

### Step 2: Push to Remote

Push the current branch to origin:

```bash
git push origin <current-branch>
```

- On success, continue to Step 4.
- On failure, continue to Step 3.

---

### Step 3: Handle Push Failure

If push fails due to upstream changes:

1. Pull with rebase:
   ```bash
   git pull --rebase origin <current-branch>
   ```

2. If rebase succeeds, retry push:
   ```bash
   git push origin <current-branch>
   ```

3. If rebase has conflicts:
   - Report: "Rebase conflicts detected. Please resolve conflicts manually."
   - List the conflicting files
   - Provide instructions:
     ```
     To resolve:
     1. Fix conflicts in the listed files
     2. Run: git add <resolved-files>
     3. Run: git rebase --continue
     4. Run: git push origin <branch>

     To abort:
     Run: git rebase --abort
     ```
   - Stop workflow.

---

### Step 4: Report Success

On successful push, report:

```
Pushed to origin/<branch>
```

Show the commits that were pushed:

```bash
git log @{u}..HEAD --oneline 2>/dev/null || git log -1 --oneline
```

---

## Error Recovery

**Push rejected (upstream changes):**
- The workflow automatically attempts `git pull --rebase` and retries once
- If conflicts occur, resolve manually following the provided instructions

**Rebase conflicts:**
- Resolve conflicts in listed files
- `git add <resolved-files>` for each
- `git rebase --continue` to finish
- `git push origin <branch>` to push

**Abort rebase:**
- `git rebase --abort` returns to pre-rebase state

## Notes

- This command only pushes existing commits; it does not stage or commit
- Use `/dev-tools:git-commit` first to create commits
- Push failures due to upstream changes trigger an automatic rebase retry
