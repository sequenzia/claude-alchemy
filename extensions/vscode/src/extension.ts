import * as vscode from "vscode";
import { validateDocument } from "./frontmatter/validator";
import { FrontmatterCompletionProvider } from "./frontmatter/completions";
import { FrontmatterHoverProvider } from "./frontmatter/hover";

let diagnosticCollection: vscode.DiagnosticCollection;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

const DEBOUNCE_MS = 300;

const MARKDOWN_SELECTOR: vscode.DocumentSelector = {
  language: "markdown",
  scheme: "file",
};

export function activate(context: vscode.ExtensionContext): void {
  diagnosticCollection =
    vscode.languages.createDiagnosticCollection("claude-code-schemas");
  context.subscriptions.push(diagnosticCollection);

  // Register completion provider
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      MARKDOWN_SELECTOR,
      new FrontmatterCompletionProvider(),
      ":" // Trigger on colon for enum value completions
    )
  );

  // Register hover provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      MARKDOWN_SELECTOR,
      new FrontmatterHoverProvider()
    )
  );

  // Validate all open markdown documents on activation
  for (const document of vscode.workspace.textDocuments) {
    if (document.languageId === "markdown") {
      validateDocument(document, diagnosticCollection);
    }
  }

  // Validate on document open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === "markdown") {
        validateDocument(document, diagnosticCollection);
      }
    })
  );

  // Validate on document change (debounced)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId !== "markdown") return;

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        validateDocument(event.document, diagnosticCollection);
      }, DEBOUNCE_MS);
    })
  );

  // Validate on document save (immediate)
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (document.languageId === "markdown") {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        validateDocument(document, diagnosticCollection);
      }
    })
  );

  // Clean up diagnostics when document is closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      diagnosticCollection.delete(document.uri);
    })
  );
}

export function deactivate(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  diagnosticCollection?.dispose();
}
