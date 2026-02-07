import * as vscode from "vscode";
import {
  isInsideFrontmatter,
  getFileKind,
  getSchemaForKind,
  getFrontmatterKeyAtPosition,
} from "./utils";
import type { SchemaProperty } from "../types";

export class FrontmatterHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | undefined {
    if (!isInsideFrontmatter(document, position)) {
      return undefined;
    }

    const kind = getFileKind(document.uri);
    if (!kind) return undefined;

    const schema = getSchemaForKind(kind);
    if (!schema?.properties) return undefined;

    const key = getFrontmatterKeyAtPosition(document, position);
    if (!key) return undefined;

    const prop = schema.properties[key];
    if (!prop) return undefined;

    const md = buildHoverContent(key, prop, schema.required);
    const line = document.lineAt(position.line);
    const keyRange = new vscode.Range(
      position.line,
      0,
      position.line,
      line.text.indexOf(":") + 1
    );

    return new vscode.Hover(md, keyRange);
  }
}

function buildHoverContent(
  key: string,
  prop: SchemaProperty,
  required?: string[]
): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.isTrusted = true;

  // Header
  const isRequired = required?.includes(key);
  md.appendMarkdown(`**\`${key}\`**`);
  if (isRequired) {
    md.appendMarkdown(` *(required)*`);
  }
  md.appendMarkdown("\n\n");

  // Description
  if (prop.description) {
    md.appendMarkdown(`${prop.description}\n\n`);
  }

  // Type info
  const typeStr = formatType(prop);
  md.appendMarkdown(`**Type:** \`${typeStr}\`\n\n`);

  // Enum values
  if (prop.enum) {
    md.appendMarkdown(
      `**Allowed values:** ${prop.enum.map((v) => `\`${v}\``).join(", ")}\n\n`
    );
  }

  // Default
  if (prop.default !== undefined) {
    md.appendMarkdown(`**Default:** \`${JSON.stringify(prop.default)}\`\n\n`);
  }

  // Pattern
  if (prop.pattern) {
    md.appendMarkdown(`**Pattern:** \`${prop.pattern}\`\n\n`);
  }

  // Max length
  if (prop.maxLength !== undefined) {
    md.appendMarkdown(`**Max length:** ${prop.maxLength}\n\n`);
  }

  return md;
}

function formatType(prop: SchemaProperty): string {
  if (prop.enum) return "enum";
  if (prop.type) {
    if (Array.isArray(prop.type)) return prop.type.join(" | ");
    if (prop.type === "array" && prop.items) {
      const itemType = formatType(prop.items);
      return `${itemType}[]`;
    }
    return prop.type;
  }
  if (prop.oneOf) {
    return prop.oneOf
      .map((o) => {
        if (o.type === "array" && o.items) {
          return `${formatType(o.items)}[]`;
        }
        return o.type || "object";
      })
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(" | ");
  }
  return "any";
}
