# LOFI MONSTER Max MCP Server — Architecture

## Overview

The LOFI MONSTER MCP Server is a local bridge that allows AI agents (Claude Code, Cursor, etc.) to directly manipulate Max/MSP patches in real-time. It eliminates manual copy-pasting of JavaScript files into v8.codebox objects by providing structured MCP tools that translate into UDP/OSC commands consumed by a Max/MSP daemon.

## System Architecture

```
┌─────────────────────────────┐
│   AI Client                 │
│   (Claude Code / Cursor)    │
└──────────┬──────────────────┘
           │ STDIO (JSON-RPC 2.0)
           │ tools/list, tools/call
           ▼
┌─────────────────────────────┐
│   MCP Server                │
│   (Node.js / TypeScript)    │
│                             │
│   ┌───────────────────────┐ │
│   │ Tool Definitions      │ │
│   │ (Zod-validated)       │ │
│   └───────┬───────────────┘ │
│           │                 │
│   ┌───────▼───────────────┐ │
│   │ OSC Bridge            │ │
│   │ • UDP Client → :7400  │ │
│   │ • UDP Server ← :7401  │ │
│   └───────┬───────────────┘ │
└───────────┼─────────────────┘
            │ UDP/OSC
            │ Single JSON string argument per message
            ▼
┌─────────────────────────────┐
│   Max/MSP                   │
│   LOFI_Daemon.maxpat        │
│                             │
│   ┌───────────────────────┐ │
│   │ udpreceive 7400       │ │
│   └───────┬───────────────┘ │
│           │ (direct — no route object)
│   ┌───────▼───────────────┐ │
│   │ v8 object             │ │
│   │ daemon.js             │ │
│   │ • anything() dispatch │ │
│   │ • Object registry     │ │
│   │ • Subpatcher target   │ │
│   └───────┬───────────────┘ │
│           │                 │
│   ┌───────▼───────────────┐ │
│   │ udpsend               │ │
│   │ 127.0.0.1 7401        │ │
│   └───────────────────────┘ │
│                             │
│   ┌───────────────────────┐ │
│   │ [p DeviceName]        │ │
│   │ (Target Subpatcher)   │ │
│   │ Objects created HERE  │ │
│   └───────────────────────┘ │
└─────────────────────────────┘
```

## Transport Layer

### AI ↔ MCP Server: STDIO

- Standard MCP transport for local desktop tools
- JSON-RPC 2.0 over stdin/stdout
- No HTTP, no WebSockets — zero network overhead

### MCP Server ↔ Max: UDP/OSC

| Direction | Port | Purpose |
|-----------|------|---------|
| MCP → Max | `localhost:7400` | Commands (create, wire, UI import, etc.) |
| Max → MCP | `localhost:7401` | Responses (success/error acknowledgments) |

**Critical: The Comma Trap**

Max's internal message scheduler intercepts commas (`,`) and treats them as message separators. Raw JSON like `{"x": 10, "y": 20}` will be **split and destroyed** before reaching the v8 object.

**Solution:** The Node MCP server uses `node-osc` to send JSON as a **single OSC string argument**:

```typescript
// Node.js — bridge.ts
import { Message } from "node-osc";

const msg = new Message(address, JSON.stringify(payload));
client.send(msg);
```

This forces the OSC protocol to wrap the entire JSON in a designated string block, bypassing Max's comma splitter. The v8 daemon receives the intact JSON in `arrayfromargs(arguments)[0]`.

## OSC Address Space

All addresses use the `/lofi/` prefix.

| Address | Direction | Purpose | Payload |
|---------|-----------|---------|---------|
| `/lofi/init` | MCP → Max | Initialize a new device (create subpatcher) | `{ deviceName, width?, height? }` |
| `/lofi/create` | MCP → Max | Create a single Max object | `{ id, class, x, y, args? }` |
| `/lofi/wire` | MCP → Max | Connect two objects via patchcord | `{ sourceId, outlet, destId, inlet }` |
| `/lofi/remove` | MCP → Max | Remove an object from the patcher | `{ id }` |
| `/lofi/ui` | MCP → Max | Batch create Z-sorted UI elements | `{ layers: [...] }` |
| `/lofi/inject` | MCP → Max | Load a .js file into a v8/js object | `{ targetId, filePath }` |
| `/lofi/map` | MCP → Max | Map a Live API parameter | `{ parameter, objectId, property }` |

### Response Format (Max → MCP)

All responses are JSON strings sent via `udpsend` on port `7401`:

```json
// Success
{ "status": "ok", "id": "dial_cutoff" }

// Error
{ "status": "error", "message": "No device initialized" }

// Batch UI completion
{ "status": "ok", "created": 12 }
```

## JSON Payload Schemas

### `/lofi/init`
```json
{
  "deviceName": "Flutter",
  "width": 600,
  "height": 400
}
```
Creates a `[p Flutter]` subpatch node inside the daemon patcher, extracts the subpatcher reference as `targetPatcher`, and brings the window to front via `targetPatcher.wind.bringtofront()`.

### `/lofi/create`
```json
{
  "id": "dial_cutoff",
  "class": "live.dial",
  "x": 100,
  "y": 200,
  "args": [0, 127]
}
```
Creates the object in `targetPatcher` (never `this.patcher`). The `id` is stored in the daemon's object registry for later wiring/removal.

### `/lofi/wire`
```json
{
  "sourceId": "lfo_engine",
  "outlet": 0,
  "destId": "dial_cutoff",
  "inlet": 0
}
```
Looks up both objects in the registry and calls `targetPatcher.connect()`.

### `/lofi/remove`
```json
{
  "id": "dial_cutoff"
}
```
Removes the object from the target patcher and deletes it from the registry.

### `/lofi/ui`
```json
{
  "layers": [
    { "name": "00_bg_panel", "class": "live.panel", "x": 0, "y": 0, "width": 600, "height": 400, "args": [], "attrs": { "bgcolor": [0.2, 0.2, 0.2, 1.0] } },
    { "name": "10_rate_dial", "class": "live.dial", "x": 50, "y": 100, "width": 60, "height": 80, "args": [] },
    { "name": "20_depth_dial", "class": "live.dial", "x": 150, "y": 100, "width": 60, "height": 80, "args": [] }
  ]
}
```

**Critical rules:**
- The `layers` array MUST be pre-sorted by Z-index prefix (ascending) on the MCP server side before sending
- The entire array is sent as **one single OSC message** — never as sequential messages (UDP drops packets)
- The daemon iterates locally using a global `Task` with 20ms spacing to respect Max's UI thread
- After `newdefault`, the daemon applies `patching_rect` (since `newdefault` ignores width/height), enables Presentation Mode, and applies any optional `attrs` (bgcolor, textcolor, fontsize, etc.)

### `/lofi/inject`
```json
{
  "targetId": "engine",
  "filePath": "/path/to/your/project/Flutter_Engine.js"
}
```

**Critical:** Never send raw .js file contents over UDP — packet size limits will truncate the code silently. The MCP server ensures the file exists on disk and sends only the absolute path. The daemon calls `engineObj.message("compile", filePath)` to load natively.

### `/lofi/map`
```json
{
  "parameter": "live.dial[cutoff]",
  "objectId": "dial_cutoff",
  "property": "value"
}
```

## Design Constraints

1. **Dependencies:** `@modelcontextprotocol/sdk`, `zod`, `node-osc` only. No Express, no WebSockets, no heavy frameworks.
2. **Modularity:** Tool definitions are separate files. Bridge logic is separate from routing.
3. **Logging:** All OSC payloads logged to terminal with directional prefixes (`[OSC→]`, `[OSC←]`) and timestamps.
4. **Error propagation:** Max daemon returns success/error JSON. MCP server relays these to the AI client.
5. **Max constraints:** See `MAX_API_CHEATSHEET.md` for the full list of API quirks that must be respected.
