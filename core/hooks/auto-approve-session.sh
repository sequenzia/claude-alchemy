#!/bin/bash
# Auto-approve file operations targeting execute-tasks session directories.
#
# Approves Write/Edit to:
#   - $HOME/.claude/tasks/*/execution_pointer.md
#   - */.claude/sessions/* (session files within any project)
#
# Approves Bash commands containing mkdir or mv targeting .claude/sessions/
#
# All other operations: exit 0 with no output (no opinion, normal permission flow).

set -euo pipefail

input=$(cat)

tool_name=$(echo "$input" | jq -r '.tool_name // empty')

approve() {
  cat <<'EOF'
{"hookSpecificOutput":{"permissionDecision":"allow","permissionDecisionReason":"Auto-approved: execute-tasks session file operation"}}
EOF
  exit 0
}

case "$tool_name" in
  Write|Edit)
    file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
    [ -z "$file_path" ] && exit 0

    # Match execution_pointer.md in ~/.claude/tasks/*/
    if [[ "$file_path" == "$HOME/.claude/tasks/"*/execution_pointer.md ]]; then
      approve
    fi

    # Match any file inside .claude/sessions/
    if [[ "$file_path" == */.claude/sessions/* ]]; then
      approve
    fi
    ;;

  Bash)
    command=$(echo "$input" | jq -r '.tool_input.command // empty')
    [ -z "$command" ] && exit 0

    # Match mkdir or mv targeting .claude/sessions/
    if [[ "$command" == *".claude/sessions/"* ]]; then
      if [[ "$command" == *mkdir* ]] || [[ "$command" == *mv* ]]; then
        approve
      fi
    fi
    ;;
esac

# No opinion — let normal permission flow handle it
exit 0
