Build a Max for Live device called "$ARGUMENTS" using the LOFI MONSTER MCP tools.

Follow this exact build order — each step depends on the previous:

## Step 1: Initialize Device
Call `init_device` with deviceName: "$ARGUMENTS"
This creates a [p $ARGUMENTS] subpatcher via the subpatcher method (NOT new Patcher — that is forbidden in Max JS). The device window will open so you can watch the build happen live.

## Step 2: Import UI Layout
Call `import_figma_ui` with the layers array. Layers MUST use Z-index prefixes:
- 00-09: Background panels (created first = bottom of visual stack)
- 10-29: Structural elements (dividers, sections)
- 30-49: Controls (dials, sliders, buttons)
- 50-69: Labels and text
- 70-89: Indicators (LEDs, meters)
- 90-99: Foreground overlays (logos, glass effects)
The MCP server sorts by prefix and sends the entire array as ONE OSC message. Max iterates locally with 20ms Task spacing.

## Step 3: Create DSP/Utility Objects
Call `max_create_object` for each non-UI object (oscillators, filters, math, routing). Each object needs a unique string ID for the registry.

## Step 4: Wire Everything
Call `max_wire_objects` for each patch cord. Outlet/inlet indices are 0-based (0 = leftmost).

## Step 5: Inject Engine Code
Call `inject_engine_code` with the absolute file path to the .js engine file. Never send raw code over UDP — only file paths. The daemon uses message("compile", filePath) to load the script.

## Critical Constraints
- newdefault ignores width/height — the daemon applies patching_rect after creation
- Presentation mode is enabled automatically for UI elements
- Task references must be global variables (local ones get garbage-collected by V8)
- V8 is pure ECMAScript — no DOM, no Node APIs, no require/fs/fetch
- JSON is wrapped as a single OSC string argument to bypass Max's comma trap
