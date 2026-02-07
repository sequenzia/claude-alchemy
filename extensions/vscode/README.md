# Claude Code Plugin Schemas

VS Code extension providing schema validation, autocomplete, and hover documentation for Claude Code plugin files.

## Features

### JSON Config Validation (zero-config)
- **plugin.json** — Plugin manifest validation
- **hooks.json** — Hook configuration validation
- **.mcp.json** — MCP server config validation
- **.lsp.json** — LSP server config validation
- **marketplace.json** — Plugin registry validation

### YAML Frontmatter Validation (SKILL.md & agents)
- Real-time diagnostics for invalid fields, types, and enum values
- Autocomplete for frontmatter properties and enum values
- Hover documentation showing field types, descriptions, and defaults

## Installation

Build and install locally:

```bash
cd extensions/vscode
npm install
npm run build
npm run package
code --install-extension claude-code-schemas-0.1.0.vsix
```

## Development

```bash
cd extensions/vscode
npm install
npm run watch
# Then press F5 in VS Code to launch Extension Development Host
```

## Schemas

JSON Schema files live at `schemas/` in the monorepo root and are bundled with the extension. They can also be used independently for CI validation or other tools.
