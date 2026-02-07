import * as vscode from "vscode";
import * as path from "path";
import type { FileKind, FrontmatterRange, SchemaDefinition } from "../types";

import skillSchema from "../../schemas/skill-frontmatter.schema.json";
import agentSchema from "../../schemas/agent-frontmatter.schema.json";

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * Extract YAML frontmatter from document text.
 * Returns null if no frontmatter is found.
 */
export function extractFrontmatter(
  document: vscode.TextDocument
): FrontmatterRange | null {
  const text = document.getText();
  const match = FRONTMATTER_REGEX.exec(text);
  if (!match) return null;

  const content = match[1];
  // Opening --- is line 0, content starts on line 1
  const startLine = 1;
  const contentLines = content.split(/\r?\n/);
  const endLine = startLine + contentLines.length - 1;

  return {
    content,
    startLine,
    endLine,
    range: new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(endLine + 1, 3) // includes closing ---
    ),
  };
}

/**
 * Check if a position is inside YAML frontmatter.
 */
export function isInsideFrontmatter(
  document: vscode.TextDocument,
  position: vscode.Position
): boolean {
  const fm = extractFrontmatter(document);
  if (!fm) return false;
  return position.line >= fm.startLine && position.line <= fm.endLine;
}

/**
 * Determine the file kind based on the document URI.
 * Returns 'skill' for SKILL.md files, 'agent' for agent .md files, or null.
 */
export function getFileKind(uri: vscode.Uri): FileKind {
  const filePath = uri.fsPath;
  const basename = path.basename(filePath);

  // Skill files are always named SKILL.md and live under a skills/ directory
  if (basename === "SKILL.md") {
    const parts = filePath.split(path.sep);
    if (parts.some((p) => p === "skills")) {
      return "skill";
    }
  }

  // Agent files are .md files under an agents/ directory
  if (basename.endsWith(".md") && basename !== "SKILL.md") {
    const parts = filePath.split(path.sep);
    if (parts.some((p) => p === "agents")) {
      return "agent";
    }
  }

  return null;
}

/**
 * Get the JSON Schema definition for a given file kind.
 */
export function getSchemaForKind(
  kind: FileKind
): SchemaDefinition | null {
  switch (kind) {
    case "skill":
      return skillSchema as unknown as SchemaDefinition;
    case "agent":
      return agentSchema as unknown as SchemaDefinition;
    default:
      return null;
  }
}

/**
 * Get the current frontmatter key at a given position.
 * Returns the key name if the cursor is on a top-level key line, or null.
 */
export function getFrontmatterKeyAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): string | null {
  const line = document.lineAt(position.line).text;
  // Match top-level YAML key (no leading whitespace)
  const keyMatch = /^([a-zA-Z_-]+)\s*:/.exec(line);
  if (keyMatch) {
    return keyMatch[1];
  }
  return null;
}
