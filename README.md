# LOFI MONSTER — Max MCP Server

A local MCP (Model Context Protocol) bridge that lets AI agents control **Max/MSP** patches in real-time via UDP/OSC.

Build Max for Live devices, import Figma UI layouts, wire DSP chains, and inject engine code — all from your AI coding assistant.

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
git clone https://github.com/solokkhz/lofi-monster-max-mcp.git
cd lofi-monster-max-mcp
npm install
npm run build

# Connect to Claude Code
claude mcp add lofi-monster -- node "/path/to/lofi-monster-max-mcp/dist/index.js"

# Open Max/MSP with the daemon patch
# Then ask your AI to build a device!
```

## Setup

1. **Build:** `npm install && npm run build`
2. **Connect your AI client** — see [Connection Guide](mcp_docs/CONNECTION_GUIDE.md)
3. **Open Max/MSP** with `max/LOFI_Daemon.maxpat`
4. **Start building** — ask your AI to call `init_device` with a device name

## Documentation

- [Architecture](mcp_docs/ARCHITECTURE.md) — Full data flow, OSC address space, port assignments
- [Tools Schema](mcp_docs/MCP_TOOLS_SCHEMA.md) — Zod schemas and JSON-RPC definitions for all 7 tools
- [Max API Cheatsheet](mcp_docs/MAX_API_CHEATSHEET.md) — Verified Max JS API methods
- [Figma Z-Index Protocol](mcp_docs/FIGMA_Z_INDEX_PROTOCOL.md) — Z-index prefix convention and sorting
- [Connection Guide](mcp_docs/CONNECTION_GUIDE.md) — Setup for Claude Code, Claude Desktop, and Cursor

## Claude Code Slash Commands

If using Claude Code, these commands are available:

| Command | Purpose |
|---------|---------|
| `/build-device <name>` | Guided step-by-step device build |
| `/constraints` | Inject all 12 Max/MSP constraints |
| `/figma-guide` | Z-index protocol reference |
| `/object-ref` | Max object class cheatsheet |
| `/status` | Check MCP + Max connection status |

## Key Design Decisions

- **Single JSON string per OSC message** — bypasses Max's comma trap that destroys raw JSON
- **Z-index sorting** — Figma layers sorted by numeric prefix before batch creation (creation order = visual stacking in Max)
- **File paths only** — engine code is loaded via `compile` message, never sent as raw text over UDP
- **Subpatcher method** — devices created via `this.patcher.newdefault(...)` + `.subpatcher()`, never `new Patcher()`

## License

MIT
