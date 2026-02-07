import * as vscode from "vscode";
import {
  isInsideFrontmatter,
  getFileKind,
  getSchemaForKind,
  extractFrontmatter,
} from "./utils";
import type { SchemaProperty } from "../types";

export class FrontmatterCompletionProvider
  implements vscode.CompletionItemProvider
{
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    if (!isInsideFrontmatter(document, position)) {
      return undefined;
    }

    const kind = getFileKind(document.uri);
    if (!kind) return undefined;

    const schema = getSchemaForKind(kind);
    if (!schema?.properties) return undefined;

    const line = document.lineAt(position.line).text;
    const textBeforeCursor = line.substring(0, position.character);

    // If cursor is after a colon on a key line, suggest enum values
    const keyValueMatch = /^([a-zA-Z_-]+)\s*:\s*(.*)$/.exec(textBeforeCursor);
    if (keyValueMatch) {
      const key = keyValueMatch[1];
      const prop = schema.properties[key];
      if (prop?.enum) {
        return prop.enum.map((val) => {
          const item = new vscode.CompletionItem(
            val,
            vscode.CompletionItemKind.EnumMember
          );
          item.detail = `Allowed value for ${key}`;
          if (prop.description) {
            item.documentation = new vscode.MarkdownString(prop.description);
          }
          return item;
        });
      }
      return undefined;
    }

    // Suggest top-level property keys
    const fm = extractFrontmatter(document);
    const existingKeys = getExistingKeys(document, fm);

    const items: vscode.CompletionItem[] = [];

    for (const [key, prop] of Object.entries(schema.properties)) {
      // Skip keys already present
      if (existingKeys.has(key)) continue;

      const item = new vscode.CompletionItem(
        key,
        vscode.CompletionItemKind.Property
      );

      // Build detail string
      const typeStr = getTypeString(prop);
      const required = schema.required?.includes(key);
      item.detail = `${typeStr}${required ? " (required)" : ""}`;

      // Build documentation
      const docParts: string[] = [];
      if (prop.description) docParts.push(prop.description);
      if (prop.enum) docParts.push(`\nAllowed values: \`${prop.enum.join("`, `")}\``);
      if (prop.default !== undefined) docParts.push(`\nDefault: \`${JSON.stringify(prop.default)}\``);
      if (prop.pattern) docParts.push(`\nPattern: \`${prop.pattern}\``);

      if (docParts.length > 0) {
        item.documentation = new vscode.MarkdownString(docParts.join("\n"));
      }

      // Insert text with colon and space
      if (prop.enum) {
        item.insertText = new vscode.SnippetString(
          `${key}: \${1|${prop.enum.join(",")}|}`
        );
      } else if (prop.type === "boolean") {
        item.insertText = new vscode.SnippetString(
          `${key}: \${1|true,false|}`
        );
      } else if (prop.type === "array" || hasArrayType(prop)) {
        item.insertText = new vscode.SnippetString(
          `${key}:\n  - \${1}`
        );
      } else {
        item.insertText = new vscode.SnippetString(`${key}: \${1}`);
      }

      // Sort required fields first
      item.sortText = `${required ? "0" : "1"}_${key}`;

      items.push(item);
    }

    return items;
  }
}

function getExistingKeys(
  document: vscode.TextDocument,
  fm: { startLine: number; endLine: number } | null
): Set<string> {
  const keys = new Set<string>();
  if (!fm) return keys;

  for (let i = fm.startLine; i <= fm.endLine; i++) {
    const match = /^([a-zA-Z_-]+)\s*:/.exec(document.lineAt(i).text);
    if (match) {
      keys.add(match[1]);
    }
  }
  return keys;
}

function getTypeString(prop: SchemaProperty): string {
  if (prop.enum) return `enum`;
  if (prop.type) {
    if (Array.isArray(prop.type)) return prop.type.join(" | ");
    return prop.type;
  }
  if (prop.oneOf) {
    return prop.oneOf
      .map((o) => o.type || "object")
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(" | ");
  }
  return "any";
}

function hasArrayType(prop: SchemaProperty): boolean {
  if (prop.type === "array") return true;
  if (prop.oneOf) return prop.oneOf.some((o) => o.type === "array");
  return false;
}
