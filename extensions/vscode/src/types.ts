import type * as vscode from "vscode";

export interface FrontmatterRange {
  /** The full text of the YAML frontmatter (without delimiters) */
  content: string;
  /** Line number where frontmatter content starts (0-based, after opening ---) */
  startLine: number;
  /** Line number where frontmatter content ends (0-based, before closing ---) */
  endLine: number;
  /** VS Code Range covering the entire frontmatter block including delimiters */
  range: vscode.Range;
}

export type FileKind = "skill" | "agent" | null;

export interface SchemaProperty {
  type?: string | string[];
  description?: string;
  enum?: string[];
  default?: unknown;
  oneOf?: SchemaProperty[];
  items?: SchemaProperty;
  pattern?: string;
  maxLength?: number;
  minimum?: number;
  properties?: Record<string, SchemaProperty>;
  additionalProperties?: boolean | SchemaProperty;
}

export interface SchemaDefinition {
  title: string;
  description: string;
  type: string;
  properties: Record<string, SchemaProperty>;
  required?: string[];
}
