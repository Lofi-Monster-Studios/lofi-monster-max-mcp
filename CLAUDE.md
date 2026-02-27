# LOFI MONSTER — Max MCP Server

## Build Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript → dist/
npm run dev          # Watch mode (auto-recompile on save)
npm start            # Run the compiled MCP server
```

## Architecture

```
AI Client (Claude Code / Cursor)
  ↕  STDIO (JSON-RPC)
MCP Server (Node.js / TypeScript)
  ↕  UDP/OSC (send → localhost:7400, receive ← localhost:7401)
Max/MSP Daemon (v8 object inside max/LOFI_Daemon.maxpat)
```

- The MCP server communicates with AI clients via STDIO (JSON-RPC protocol)
- The MCP server sends OSC messages to Max on port 7400 and listens for responses on port 7401
- Each OSC message carries an address string + a single JSON string argument (bypasses Max's comma trap)
- The Max daemon (`max/daemon.js`) runs inside a `v8` object and dispatches commands via `anything()`

## Reference Documentation

Detailed schemas and protocols live in `mcp_docs/`:
- `ARCHITECTURE.md` — full data flow, OSC address space, port assignments
- `MCP_TOOLS_SCHEMA.md` — Zod schemas and JSON-RPC definitions for all 7 tools
- `MAX_API_CHEATSHEET.md` — verified Max JS API methods (do NOT invent methods not listed here)
- `FIGMA_Z_INDEX_PROTOCOL.md` — Z-index prefix convention and sorting algorithm

## Conventions

- All tool files live in `src/tools/` and export a `register(server: McpServer)` function
- OSC addresses always start with `/lofi/`
- Max object IDs are user-defined strings stored in the daemon's `registry` object
- The `import_figma_ui` tool sorts layers by Z-index prefix before sending to Max
- The entire sorted layer array is sent as ONE OSC message (never sequential UDP)
- Always run `npm run build` before testing changes

## Critical Max/MSP Constraints

1. `new Patcher()` is FORBIDDEN — use subpatcher method: `this.patcher.newdefault(10,10,"p",name)` + `.subpatcher()`
2. `targetPatcher.front()` is hallucinated — use `targetPatcher.wind.bringtofront()`
3. `newdefault` ignores width/height — must follow up with `patching_rect`
4. Task references MUST be global variables (local ones get garbage-collected)
5. V8 is pure ECMAScript — no DOM, no Node APIs, no `require`/`fs`/`fetch`
6. Use `message("compile", filePath)` to load scripts into v8 objects (NOT `read`)
7. JSON must be wrapped as a single OSC string argument (Max's comma trap destroys raw JSON)
