import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function register(server: McpServer) {
  server.prompt(
    "figma-guide",
    "Reference for the Z-index protocol used by batch_create_ui",
    async () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `When creating UI layouts in Max via the batch_create_ui tool, follow this Z-index protocol.

## Why Z-Order Matters
In Max/MSP, visual stacking order is determined by creation order. First created = bottom of stack. Last created = on top. There is no CSS z-index — the only control is creation sequence.

## Prefix Convention
Every layer name must start with a two-digit prefix: {NN}_{descriptive_name}

| Range  | Purpose                | Examples                          |
|--------|------------------------|-----------------------------------|
| 00-09  | Background panels      | 00_bg_panel, 05_bg_gradient       |
| 10-29  | Structural elements    | 10_section_lfo, 15_divider_line   |
| 30-49  | Controls               | 30_rate_dial, 35_depth_slider     |
| 50-69  | Labels and text        | 50_rate_label, 55_depth_label     |
| 70-89  | Indicators             | 70_clip_led, 75_level_meter       |
| 90-99  | Foreground overlays    | 90_brand_logo, 99_glass_overlay   |

## Sorting Rules
- Layers are sorted ascending by prefix (lowest = created first = bottom)
- Unprefixed layers default to 50 (mid-stack)
- Duplicate prefixes preserve original Figma order (stable sort)
- Use increments of 5 or 10 between layers for future insertion room

## Transmission Protocol
- The MCP server sorts the array BEFORE sending
- The entire sorted array is sent as ONE OSC message to /lofi/ui (never sequential UDP)
- The Max daemon iterates locally with a global uiTask (20ms spacing via Task.schedule)
- After newdefault, the daemon applies patching_rect + presentation mode automatically

## Example
Input layers (any order):
  50_rate_label (comment), 30_rate_dial (live.dial), 00_bg_panel (live.panel), 90_logo (comment)

After Z-sort (creation order in Max):
  00_bg_panel → 30_rate_dial → 50_rate_label → 90_logo

Visual stack (top to bottom):
  90_logo          ← on top (created last)
  50_rate_label
  30_rate_dial
  00_bg_panel      ← on bottom (created first)`,
          },
        },
      ],
    })
  );
}
