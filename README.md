# LOFI MONSTER — Max MCP Server

A local MCP (Model Context Protocol) bridge that lets AI agents control **Max/MSP** patches in real-time via UDP/OSC.

Build Max for Live devices, create UI layouts, wire DSP chains, and inject engine code — all from your AI coding assistant.

## Architecture

```
AI Client (Claude Code / Cursor)
  |  STDIO (JSON-RPC)
MCP Server (Node.js / TypeScript)
  |  UDP/OSC (localhost:7400 / 7401)
Max/MSP Daemon (v8 object in LOFI_Daemon.maxpat)
```

## Tools

| Tool | Purpose |
|------|---------|
| `init_device` | Initialize a new device subpatcher |
| `max_create_object` | Create a Max object at specific coordinates |
| `max_wire_objects` | Connect two objects with a patch cord |
| `max_remove_object` | Remove an object from the patcher |
| `batch_create_ui` | Batch create Z-sorted UI layouts |
| `inject_engine_code` | Load a .js file into a v8/js object |
| `map_live_api` | Map a Live API parameter |

## Quick Start

```bash
# Clone and build
git clone https://github.com/Lofi-Monster-Studios/lofi-monster-max-mcp.git
cd lofi-monster-max-mcp
npm install
npm run build

# Register MCP server globally (works in all Claude Code sessions)
claude mcp add lofi-monster -- node "<full-path-to-repo>/dist/index.js"

# Install slash commands globally (optional but recommended)
# Copy the command files so /build-device, /constraints, etc. work everywhere
cp .claude/commands/*.md ~/.claude/commands/

# Open Max/MSP with the daemon patch, then ask your AI to build a device!
```

## Setup

1. **Build:** `npm install && npm run build`
2. **Register the MCP server globally:** `claude mcp add lofi-monster -- node "<path>/dist/index.js"`
3. **Install slash commands globally:** `cp .claude/commands/*.md ~/.claude/commands/`
4. **Connect other AI clients** (optional) — see [Connection Guide](mcp_docs/CONNECTION_GUIDE.md)
5. **Open Max/MSP** with `max/LOFI_Daemon.maxpat`
6. **Start building** — ask your AI to call `init_device` with a device name

## Documentation

- [Architecture](mcp_docs/ARCHITECTURE.md) — Full data flow, OSC address space, port assignments
- [Tools Schema](mcp_docs/MCP_TOOLS_SCHEMA.md) — Zod schemas and JSON-RPC definitions for all 7 tools
- [Max API Cheatsheet](mcp_docs/MAX_API_CHEATSHEET.md) — Verified Max JS API methods
- [Z-Index Protocol](mcp_docs/Z_INDEX_PROTOCOL.md) — Z-index prefix convention and sorting
- [Connection Guide](mcp_docs/CONNECTION_GUIDE.md) — Setup for Claude Code, Claude Desktop, and Cursor

## Claude Code Slash Commands

These commands are available if you copied them to `~/.claude/commands/` (see Quick Start):

| Command | Purpose |
|---------|---------|
| `/build-device <name>` | Guided step-by-step device build |
| `/constraints` | Inject all 12 Max/MSP constraints |
| `/figma-guide` | Z-index protocol reference |
| `/object-ref` | Max object class cheatsheet |
| `/status` | Check MCP + Max connection status |

> **Note:** Without the global install step, these commands only work when Claude Code is launched from the repo directory. Run `cp .claude/commands/*.md ~/.claude/commands/` to make them available everywhere.

## Key Design Decisions

- **Single JSON string per OSC message** — bypasses Max's comma trap that destroys raw JSON
- **Z-index sorting** — UI layers sorted by numeric prefix before batch creation (creation order = visual stacking in Max)
- **File paths only** — engine code is loaded via `compile` message, never sent as raw text over UDP
- **Subpatcher method** — devices created via `this.patcher.newdefault(...)` + `.subpatcher()`, never `new Patcher()`

## License

MIT
