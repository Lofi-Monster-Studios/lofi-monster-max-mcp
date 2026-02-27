# LOFI MONSTER — MCP Connection Guide

## Prerequisites

Before connecting any AI client to the LOFI MONSTER MCP server:

1. **Node.js 18+** installed and available on PATH
2. **Clone the repo and build:**
   ```bash
   git clone https://github.com/lofi-monster-studios/lofi-monster-max-mcp.git
   cd lofi-monster-max-mcp
   npm install
   npm run build
   ```
3. **Verify `dist/index.js` exists** — this is the compiled entry point
4. **Open Max/MSP** with `max/LOFI_Daemon.maxpat` loaded (required for tools to actually execute commands in Max)

> Replace `<MCP_HOME>` in all examples below with the absolute path to your cloned repo (e.g. `C:/Projects/lofi-monster-max-mcp`).

---

## Claude Code (CLI)

### Option A: `claude mcp add` (Recommended)

Run this command in your terminal:

```bash
claude mcp add lofi-monster -- node "<MCP_HOME>/dist/index.js"
```

This registers the server in Claude Code's user-level configuration. The server becomes available in all future Claude Code sessions regardless of working directory.

To verify it was added:

```bash
claude mcp list
```

To remove later:

```bash
claude mcp remove lofi-monster
```

### Option B: Project-Level `.mcp.json`

Create a file at `<MCP_HOME>/.mcp.json`:

```json
{
  "mcpServers": {
    "lofi-monster": {
      "command": "node",
      "args": ["<MCP_HOME>/dist/index.js"]
    }
  }
}
```

This makes the server available only when Claude Code is launched from the project directory.

### Slash Commands (Global Install)

The repo includes 5 slash commands (`/build-device`, `/constraints`, `/figma-guide`, `/object-ref`, `/status`) as Markdown files in `.claude/commands/`.

By default these only work when Claude Code runs from the repo directory. To make them available **globally** in all sessions:

```bash
# Create the global commands directory if it doesn't exist
mkdir -p ~/.claude/commands

# Copy all command files
cp <MCP_HOME>/.claude/commands/*.md ~/.claude/commands/
```

On Windows (PowerShell):

```powershell
mkdir -Force "$env:USERPROFILE\.claude\commands"
Copy-Item "<MCP_HOME>\.claude\commands\*.md" "$env:USERPROFILE\.claude\commands\"
```

---

## Claude Desktop (Windows)

Edit the Claude Desktop configuration file at:

```
%APPDATA%\Claude\claude_desktop_config.json
```

Typical full path: `C:\Users\<YourUsername>\AppData\Roaming\Claude\claude_desktop_config.json`

Add or merge the `mcpServers` key:

```json
{
  "mcpServers": {
    "lofi-monster": {
      "command": "node",
      "args": ["<MCP_HOME>/dist/index.js"]
    }
  }
}
```

If the file already has other MCP servers, add `"lofi-monster"` alongside them inside the existing `"mcpServers"` object.

**Restart Claude Desktop** after saving the file. The server will appear in the MCP server indicator (hammer icon).

---

## Cursor

### Option A: Project-Level Config (Recommended)

Create a file at `<MCP_HOME>/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "lofi-monster": {
      "command": "node",
      "args": ["<MCP_HOME>/dist/index.js"]
    }
  }
}
```

### Option B: Via Cursor Settings UI

1. Open Cursor Settings (Ctrl+,)
2. Navigate to **MCP** section
3. Click **Add new MCP Server**
4. Set type to **command**
5. Set command to: `node "<MCP_HOME>/dist/index.js"`
6. Name it `lofi-monster`

---

## Verification

After connecting via any method above, verify the server is operational:

### Step 1: Check Server Registration

The AI client should list 7 available tools:

| Tool | Purpose |
|------|---------|
| `init_device` | Initialize a new device subpatcher |
| `max_create_object` | Create a Max object |
| `max_wire_objects` | Connect two objects with a patch cord |
| `max_remove_object` | Remove an object |
| `batch_create_ui` | Batch create Z-sorted UI elements |
| `inject_engine_code` | Load a .js file into a v8/js object |
| `map_live_api` | Map a Live API parameter |

### Step 2: Smoke Test (Max Not Required)

Ask the AI to call `init_device` with `deviceName: "ConnectionTest"`. If the MCP transport is working:
- **Max running:** Returns `{ "status": "ok", "device": "ConnectionTest" }`
- **Max not running:** Returns a timeout error after 5 seconds — this still confirms the MCP server started and the STDIO transport is functional

### Step 3: Full End-to-End (Max Required)

1. Open `max/LOFI_Daemon.maxpat` in Max/MSP
2. Call `init_device({ deviceName: "Flutter" })` — a `[p Flutter]` subpatcher should appear in Max
3. Call `max_create_object({ id: "test_dial", class: "live.dial", x: 100, y: 100 })` — a dial should appear inside the Flutter patcher

---

## Path Notes

- **Always use forward slashes** in JSON config files: `C:/Projects/lofi-monster-max-mcp/dist/index.js`
- JSON does not support unescaped backslashes — they will cause parse errors
- The `claude mcp add` CLI command handles path escaping automatically
- All config snippets in this guide use forward-slash format

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Server not found | Verify `dist/index.js` exists. Run `npm run build` if missing. |
| Tools don't appear | Restart the AI client after adding the server config. |
| Timeout on every call | Max is not running or `LOFI_Daemon.maxpat` is not open. |
| Port conflict on 7400/7401 | Another instance of the MCP server or Max patch is already using these ports. Close duplicates. |
| `node` not found | Ensure Node.js is installed and `node` is available on your system PATH. |
