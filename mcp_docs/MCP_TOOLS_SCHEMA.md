# LOFI MONSTER — MCP Tools Schema

## Overview

This document defines the exact JSON-RPC tool schemas exposed by the LOFI MONSTER MCP Server. These are the tools available to AI clients (Claude Code, Cursor) for controlling Max/MSP patches.

Each tool validates its input using Zod schemas, translates the validated input into an OSC message, and sends it to the Max daemon on `localhost:7400`. The daemon's response (success/error) is returned to the AI client.

## Tool Index

| Tool Name | OSC Address | Purpose |
|-----------|------------|---------|
| `init_device` | `/lofi/init` | Initialize a new device subpatcher |
| `max_create_object` | `/lofi/create` | Create a Max object |
| `max_wire_objects` | `/lofi/wire` | Connect two objects |
| `max_remove_object` | `/lofi/remove` | Remove an object |
| `batch_create_ui` | `/lofi/ui` | Batch create Z-sorted UI elements |
| `inject_engine_code` | `/lofi/inject` | Load a .js file into a v8/js object |
| `map_live_api` | `/lofi/map` | Map a Live API parameter |

---

## Tool Definitions

### `init_device`

Initialize a new Max for Live device by creating a named subpatcher inside the daemon. This MUST be called before any other tool — it establishes the target patcher where all objects will be created.

**Zod Schema:**
```typescript
{
  deviceName: z.string().describe("Name of the device (becomes the subpatcher title, e.g. 'Flutter')"),
  width: z.number().optional().default(600).describe("Patcher window width in pixels"),
  height: z.number().optional().default(400).describe("Patcher window height in pixels"),
}
```

**Example Call:**
```json
{
  "name": "init_device",
  "arguments": {
    "deviceName": "Flutter",
    "width": 800,
    "height": 500
  }
}
```

**OSC Payload → `/lofi/init`:**
```json
{ "deviceName": "Flutter", "width": 800, "height": 500 }
```

**Expected Response:**
```json
{ "status": "ok", "device": "Flutter" }
```

**What happens in Max:**
1. Creates `[p Flutter]` subpatch node in daemon patcher via `this.patcher.newdefault(10, 10, "p", "Flutter")`
2. Extracts patcher reference via `subNode.subpatcher()`
3. Brings window to front via `targetPatcher.wind.bringtofront()`

---

### `max_create_object`

Create a single Max object at specific coordinates inside the target device patcher.

**Zod Schema:**
```typescript
{
  id: z.string().describe("Unique string ID for this object (stored in daemon registry for wiring/removal)"),
  class: z.string().describe("Max object class name (e.g. 'live.dial', 'cycle~', 'message')"),
  x: z.number().describe("Horizontal position in pixels from left edge of patcher"),
  y: z.number().describe("Vertical position in pixels from top edge of patcher"),
  args: z.array(z.any()).optional().default([]).describe("Initialization arguments for the object (e.g. [0, 127] for range)"),
}
```

**Example Call:**
```json
{
  "name": "max_create_object",
  "arguments": {
    "id": "dial_cutoff",
    "class": "live.dial",
    "x": 100,
    "y": 200,
    "args": []
  }
}
```

**OSC Payload → `/lofi/create`:**
```json
{ "id": "dial_cutoff", "class": "live.dial", "x": 100, "y": 200, "args": [] }
```

**Expected Response:**
```json
{ "status": "ok", "id": "dial_cutoff" }
```

**What happens in Max:**
1. Calls `targetPatcher.newdefault(100, 200, "live.dial")` — creates in the DEVICE patcher, not the daemon
2. Stores the Maxobj reference in `registry["dial_cutoff"]`

---

### `max_wire_objects`

Connect two objects in the target patcher with a patch cord.

**Zod Schema:**
```typescript
{
  sourceId: z.string().describe("Registry ID of the source object"),
  outlet: z.number().int().min(0).describe("Outlet index on the source object (0-based)"),
  destId: z.string().describe("Registry ID of the destination object"),
  inlet: z.number().int().min(0).describe("Inlet index on the destination object (0-based)"),
}
```

**Example Call:**
```json
{
  "name": "max_wire_objects",
  "arguments": {
    "sourceId": "lfo_engine",
    "outlet": 0,
    "destId": "dial_cutoff",
    "inlet": 0
  }
}
```

**OSC Payload → `/lofi/wire`:**
```json
{ "sourceId": "lfo_engine", "outlet": 0, "destId": "dial_cutoff", "inlet": 0 }
```

**Expected Response:**
```json
{ "status": "ok" }
```

---

### `max_remove_object`

Remove an object from the target patcher and delete it from the daemon registry.

**Zod Schema:**
```typescript
{
  id: z.string().describe("Registry ID of the object to remove"),
}
```

**Example Call:**
```json
{
  "name": "max_remove_object",
  "arguments": {
    "id": "dial_cutoff"
  }
}
```

**OSC Payload → `/lofi/remove`:**
```json
{ "id": "dial_cutoff" }
```

**Expected Response:**
```json
{ "status": "ok", "id": "dial_cutoff" }
```

---

### `batch_create_ui`

Batch create Z-sorted UI elements in the target device patcher. The MCP server sorts the layers by Z-index prefix and sends the entire sorted array as a **single OSC message**. The Max daemon iterates locally using a timed task.

**Zod Schema:**
```typescript
{
  layers: z.array(z.object({
    name: z.string().describe("Layer name with Z-index prefix (e.g. '00_bg_panel', '50_rate_dial')"),
    class: z.string().describe("Max UI object class (e.g. 'live.panel', 'live.dial', 'live.slider')"),
    x: z.number().describe("X position in pixels"),
    y: z.number().describe("Y position in pixels"),
    width: z.number().describe("Width in pixels (applied via patching_rect after creation)"),
    height: z.number().describe("Height in pixels (applied via patching_rect after creation)"),
    args: z.array(z.any()).optional().default([]).describe("Initialization arguments"),
    attrs: z.record(z.any()).optional().describe("Object attributes to set after creation (e.g. { bgcolor: [0.2, 0.2, 0.2, 1.0], textcolor: [1, 1, 1, 1] })"),
  })).describe("Array of UI layers — will be sorted by Z-index prefix before sending to Max"),
}
```

**Example Call:**
```json
{
  "name": "batch_create_ui",
  "arguments": {
    "layers": [
      { "name": "50_rate_dial", "class": "live.dial", "x": 50, "y": 100, "width": 60, "height": 80, "args": [] },
      { "name": "00_bg_panel", "class": "live.panel", "x": 0, "y": 0, "width": 600, "height": 400, "args": [], "attrs": { "bgcolor": [0.2, 0.2, 0.2, 1.0] } },
      { "name": "75_label_rate", "class": "comment", "x": 55, "y": 185, "width": 50, "height": 20, "args": ["Rate"], "attrs": { "textcolor": [1, 1, 1, 1] } }
    ]
  }
}
```

**After Z-sort, OSC Payload → `/lofi/ui`:**
```json
{
  "layers": [
    { "name": "00_bg_panel", "class": "live.panel", "x": 0, "y": 0, "width": 600, "height": 400, "args": [], "attrs": { "bgcolor": [0.2, 0.2, 0.2, 1.0] } },
    { "name": "50_rate_dial", "class": "live.dial", "x": 50, "y": 100, "width": 60, "height": 80, "args": [] },
    { "name": "75_label_rate", "class": "comment", "x": 55, "y": 185, "width": 50, "height": 20, "args": ["Rate"], "attrs": { "textcolor": [1, 1, 1, 1] } }
  ]
}
```

**Expected Response:**
```json
{ "status": "ok", "created": 3 }
```

**What happens in Max:**
1. Global `uiTask` iterates layers at 20ms intervals
2. Each layer: `targetPatcher.newdefault(x, y, class, ...args)`
3. Then: `obj.message("patching_rect", x, y, width, height)` — forces size (newdefault ignores dimensions)
4. Then: `obj.message("presentation", 1)` and `obj.message("presentation_rect", x, y, width, height)` — enables Presentation Mode
5. Then: applies any `attrs` via `obj.message(key, value)` — e.g. bgcolor, textcolor, fontsize
6. Stores in registry using layer name as ID

---

### `inject_engine_code`

Load a JavaScript file from disk into a `v8` or `js` object in the target patcher. The file path is sent over OSC — **never raw code** (UDP packet size limits would truncate it).

**Zod Schema:**
```typescript
{
  targetId: z.string().describe("Registry ID of the v8 or js object to load the script into"),
  filePath: z.string().describe("Absolute path to the .js file on disk"),
}
```

**Example Call:**
```json
{
  "name": "inject_engine_code",
  "arguments": {
    "targetId": "engine",
    "filePath": "/path/to/your/project/Flutter_Engine.js"
  }
}
```

**OSC Payload → `/lofi/inject`:**
```json
{ "targetId": "engine", "filePath": "/path/to/your/project/Flutter_Engine.js" }
```

**Expected Response:**
```json
{ "status": "ok", "targetId": "engine", "file": "/path/to/your/project/Flutter_Engine.js" }
```

**What happens in Max:**
1. Looks up `registry["engine"]` to get the Maxobj reference
2. Calls `engineObj.message("compile", filePath)` — Max loads the script natively from disk

---

### `map_live_api`

Map a Live API parameter to a Max object in the target patcher.

**Zod Schema:**
```typescript
{
  parameter: z.string().describe("Live API parameter path (e.g. 'live.dial[cutoff]')"),
  objectId: z.string().describe("Registry ID of the Max object to map"),
  property: z.string().describe("Property name to map (e.g. 'value')"),
}
```

**Example Call:**
```json
{
  "name": "map_live_api",
  "arguments": {
    "parameter": "live.dial[cutoff]",
    "objectId": "dial_cutoff",
    "property": "value"
  }
}
```

**OSC Payload → `/lofi/map`:**
```json
{ "parameter": "live.dial[cutoff]", "objectId": "dial_cutoff", "property": "value" }
```

**Expected Response:**
```json
{ "status": "ok", "parameter": "live.dial[cutoff]" }
```

---

## MCP Server Registration Pattern

Each tool is defined in its own file under `src/tools/` and exports a `register` function:

```typescript
// src/tools/create-object.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendToMax } from "../bridge.js";

export function register(server: McpServer) {
  server.tool(
    "max_create_object",
    "Create a Max object at specific coordinates in the target device patcher",
    {
      id: z.string(),
      class: z.string(),
      x: z.number(),
      y: z.number(),
      args: z.array(z.any()).optional().default([]),
    },
    async (params) => {
      const response = await sendToMax("/lofi/create", params);
      return {
        content: [{ type: "text", text: JSON.stringify(response) }],
      };
    }
  );
}
```

## Error Handling

All tools follow this pattern:
1. Zod validates input — invalid input returns a validation error before any OSC is sent
2. Bridge sends OSC and waits for response with a 5-second timeout
3. If Max responds with `{ "status": "error", ... }`, the tool returns the error message
4. If no response within timeout, the tool returns a timeout error
5. All OSC payloads are logged to the terminal for debugging
