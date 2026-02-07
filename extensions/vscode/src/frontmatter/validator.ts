import * as vscode from "vscode";
import Ajv from "ajv";
import * as yaml from "js-yaml";
import { extractFrontmatter, getFileKind } from "./utils";

import skillSchema from "../../schemas/skill-frontmatter.schema.json";
import agentSchema from "../../schemas/agent-frontmatter.schema.json";

const ajv = new Ajv({ allErrors: true, strict: false });

const validateSkill = ajv.compile(skillSchema);
const validateAgent = ajv.compile(agentSchema);

/**
 * Validate frontmatter in a markdown document and push diagnostics.
 */
export function validateDocument(
  document: vscode.TextDocument,
  diagnostics: vscode.DiagnosticCollection
): void {
  // Only process markdown files
  if (document.languageId !== "markdown") {
    return;
  }

  const kind = getFileKind(document.uri);
  if (!kind) {
    // Not a skill or agent file — clear any stale diagnostics
    diagnostics.delete(document.uri);
    return;
  }

  const fm = extractFrontmatter(document);
  if (!fm) {
    diagnostics.delete(document.uri);
    return;
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(fm.content);
  } catch (e) {
    // YAML parse error
    const yamlError = e as yaml.YAMLException;
    const line = yamlError.mark
      ? fm.startLine + yamlError.mark.line
      : fm.startLine;
    const col = yamlError.mark ? yamlError.mark.column : 0;
    const diag = new vscode.Diagnostic(
      new vscode.Range(line, col, line, col + 1),
      `YAML parse error: ${yamlError.message}`,
      vscode.DiagnosticSeverity.Error
    );
    diag.source = "claude-code-schemas";
    diagnostics.set(document.uri, [diag]);
    return;
  }

  // Empty frontmatter is valid (no fields required for skills)
  if (parsed === null || parsed === undefined) {
    diagnostics.delete(document.uri);
    return;
  }

  // Must be an object
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    const diag = new vscode.Diagnostic(
      new vscode.Range(fm.startLine, 0, fm.endLine, 0),
      "Frontmatter must be a YAML mapping (key: value pairs)",
      vscode.DiagnosticSeverity.Error
    );
    diag.source = "claude-code-schemas";
    diagnostics.set(document.uri, [diag]);
    return;
  }

  const validate = kind === "skill" ? validateSkill : validateAgent;
  const valid = validate(parsed);

  if (valid) {
    diagnostics.delete(document.uri);
    return;
  }

  const diags: vscode.Diagnostic[] = (validate.errors || []).map((error) => {
    const line = findLineForPath(document, fm, error.instancePath, error.params);
    const range = new vscode.Range(line, 0, line, document.lineAt(line).text.length);

    let message: string;
    if (error.keyword === "additionalProperties") {
      const extra = (error.params as Record<string, string>).additionalProperty;
      message = `Unknown property '${extra}'`;
    } else if (error.keyword === "enum") {
      const allowed = (error.params as { allowedValues: string[] }).allowedValues;
      message = `${error.message}. Allowed values: ${allowed.join(", ")}`;
    } else {
      message = error.message || "Validation error";
      if (error.instancePath) {
        const propName = error.instancePath.replace(/^\//, "").replace(/\//g, ".");
        message = `'${propName}' ${message}`;
      }
    }

    const diag = new vscode.Diagnostic(
      range,
      message,
      vscode.DiagnosticSeverity.Warning
    );
    diag.source = "claude-code-schemas";
    return diag;
  });

  diagnostics.set(document.uri, diags);
}

/**
 * Find the approximate line number for a JSON path in YAML frontmatter.
 */
function findLineForPath(
  document: vscode.TextDocument,
  fm: { startLine: number; endLine: number; content: string },
  instancePath: string,
  params?: Record<string, unknown>
): number {
  // For additionalProperties errors, search for the extra property name
  if (params && "additionalProperty" in params) {
    const prop = params.additionalProperty as string;
    for (let i = fm.startLine; i <= fm.endLine; i++) {
      const lineText = document.lineAt(i).text;
      if (new RegExp(`^${escapeRegex(prop)}\\s*:`).test(lineText)) {
        return i;
      }
    }
  }

  // For path-based errors, extract the top-level key
  if (instancePath) {
    const parts = instancePath.split("/").filter(Boolean);
    if (parts.length > 0) {
      const topKey = parts[0];
      for (let i = fm.startLine; i <= fm.endLine; i++) {
        const lineText = document.lineAt(i).text;
        if (new RegExp(`^${escapeRegex(topKey)}\\s*:`).test(lineText)) {
          return i;
        }
      }
    }
  }

  // Fallback to start of frontmatter
  return fm.startLine;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
