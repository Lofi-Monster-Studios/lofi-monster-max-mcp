# LOFI MONSTER — Figma Z-Index Protocol

## Why Z-Order Matters in Max/MSP

In Max/MSP, **visual stacking order (Z-order) is determined by creation order.** The first object created sits at the bottom of the visual stack; the last object created sits on top.

This means:
- A background panel **must** be created before any dials or labels
- A foreground overlay **must** be created after everything else
- There is no `z-index` CSS property — the only way to control layering is creation sequence

If you create a `live.dial` before a `live.panel`, the panel will cover the dial. The user will see a blank rectangle instead of their control.

## The Prefix Naming Convention

Every Figma layer destined for Max/MSP import must follow this naming pattern:

```
{NN}_{descriptive_name}
```

Where:
- `{NN}` is a **two-digit numerical prefix** from `00` to `99`
- `_` is a required underscore separator
- `{descriptive_name}` is a human-readable label (no further constraints)

### Prefix Ranges

| Range | Purpose | Examples |
|-------|---------|---------|
| `00`-`09` | **Background layers** — panels, fills, borders | `00_bg_panel`, `05_bg_gradient` |
| `10`-`29` | **Structural elements** — dividers, sections | `10_section_lfo`, `15_divider_line` |
| `30`-`49` | **Controls** — dials, sliders, buttons | `30_rate_dial`, `35_depth_slider`, `40_sync_toggle` |
| `50`-`69` | **Labels and text** — parameter names, values | `50_rate_label`, `55_depth_label` |
| `70`-`89` | **Indicators** — LEDs, meters, status displays | `70_clip_led`, `75_level_meter` |
| `90`-`99` | **Foreground overlays** — logos, glass effects | `90_brand_logo`, `99_glass_overlay` |

### Spacing Convention

Use increments of **5 or 10** between layer prefixes. This leaves room to insert new layers later without renumbering everything:

```
00_bg_panel
10_rate_dial
20_depth_dial
30_rate_label
40_depth_label
50_logo
```

## Sorting Algorithm

The MCP server sorts layers **before** sending them to Max. This sorting happens in `src/utils/z-sort.ts`.

### Algorithm

```
Input:  Array of Figma layer objects (unsorted)
Output: Array of Figma layer objects (sorted ascending by prefix)

1. For each layer:
   a. Extract prefix using regex: /^(\d+)_/
   b. If match found: prefix = parseInt(match[1])
   c. If no match: prefix = 50 (default — middle of stack)

2. Sort array by prefix in ASCENDING order (lowest first)

3. For layers with identical prefixes: preserve original Figma order (stable sort)

4. Return sorted array
```

### Implementation

```typescript
// src/utils/z-sort.ts

interface FigmaLayer {
  name: string;
  class: string;
  x: number;
  y: number;
  width: number;
  height: number;
  args?: any[];
}

const PREFIX_REGEX = /^(\d+)_/;
const DEFAULT_PREFIX = 50;

export function sortByZIndex(layers: FigmaLayer[]): FigmaLayer[] {
  return [...layers].sort((a, b) => {
    const prefixA = extractPrefix(a.name);
    const prefixB = extractPrefix(b.name);
    return prefixA - prefixB;
  });
}

function extractPrefix(name: string): number {
  const match = name.match(PREFIX_REGEX);
  return match ? parseInt(match[1], 10) : DEFAULT_PREFIX;
}
```

## Transmission Protocol

**The MCP server sorts the array locally, then sends the entire sorted array as a single JSON payload to `/lofi/ui`.**

The MCP server does NOT:
- Send sequential OSC messages (UDP drops packets under rapid fire)
- Handle timing delays between object creation
- Create objects one at a time over the wire

The Max daemon handles:
- Iteration through the sorted array using a global `uiTask` (Task object)
- 20ms spacing between object creations via `uiTask.schedule(20)`
- Setting `patching_rect` (since `newdefault` ignores dimensions)
- Enabling Presentation Mode on each element

### Data Flow

```
1. AI calls import_figma_ui({ layers: [...unsorted...] })
2. MCP Server: z-sort.ts sorts layers by prefix (ascending)
3. MCP Server: bridge.ts sends ONE OSC message to /lofi/ui
   └─ Payload: { "layers": [...sorted array...] }
4. Max Daemon: anything() receives the message
5. Max Daemon: handleUI() starts global uiTask
6. uiTask iterates at 20ms intervals:
   a. targetPatcher.newdefault(x, y, class, ...args)
   b. obj.message("patching_rect", x, y, w, h)
   c. obj.message("presentation", 1)
   d. obj.message("presentation_rect", x, y, w, h)
   e. registry[layer.name] = obj
7. After all layers: respond({ status: "ok", created: N })
```

## Worked Example

### Figma Input (unsorted)

A designer has these layers in Figma (in whatever order they happened to create them):

```json
[
  { "name": "50_rate_label", "class": "comment", "x": 55, "y": 185, "width": 50, "height": 20, "args": ["Rate"] },
  { "name": "30_rate_dial", "class": "live.dial", "x": 50, "y": 100, "width": 60, "height": 80, "args": [] },
  { "name": "00_bg_panel", "class": "live.panel", "x": 0, "y": 0, "width": 600, "height": 400, "args": [] },
  { "name": "90_logo", "class": "comment", "x": 500, "y": 370, "width": 80, "height": 20, "args": ["LOFI"] },
  { "name": "30_depth_dial", "class": "live.dial", "x": 150, "y": 100, "width": 60, "height": 80, "args": [] }
]
```

### After Z-Sort (ascending)

```json
[
  { "name": "00_bg_panel", ... },     // prefix 0  → created FIRST (bottom)
  { "name": "30_rate_dial", ... },     // prefix 30 → same prefix as depth_dial
  { "name": "30_depth_dial", ... },    // prefix 30 → stable sort preserves Figma order
  { "name": "50_rate_label", ... },    // prefix 50
  { "name": "90_logo", ... }           // prefix 90 → created LAST (top)
]
```

### Result in Max

```
Visual stack (top to bottom):
─────────────────────
  90_logo              ← on top (created last)
  50_rate_label
  30_depth_dial
  30_rate_dial
  00_bg_panel          ← on bottom (created first)
─────────────────────
```

The background panel is behind everything. The logo floats on top. Controls and labels are in the middle.

## Edge Cases

### Layer Without Prefix

```json
{ "name": "mystery_knob", "class": "live.dial", ... }
```

No prefix match → defaults to `50`. Treated as a mid-stack element.

### Prefix `00` (Zero)

```json
{ "name": "00_bg", ... }
```

Valid. `parseInt("00", 10)` returns `0`. This is the absolute bottom of the stack.

### Duplicate Prefixes

```json
{ "name": "30_dial_a", ... },
{ "name": "30_dial_b", ... }
```

Both have prefix `30`. JavaScript's `Array.sort()` is stable — original order is preserved. The layer that appeared first in the Figma input stays first.

### Single-Digit Prefix

```json
{ "name": "5_something", ... }
```

The regex `/^(\d+)_/` matches `5_`. `parseInt("5")` returns `5`. This works but is non-standard — always use two digits for consistency.

## Figma Plugin Integration

The Figma Z-Index Plugin (Phase 6) automates this naming convention:

1. Designer selects a frame in Figma
2. Plugin reads the frame's children in their current Z-order (Figma's native stacking)
3. Plugin renames each layer with a Z-index prefix based on its position:
   - Bottom layer → `00_`
   - Next → `10_`
   - Next → `20_`
   - etc. (step size configurable, default 10)
4. Plugin exports a JSON manifest matching the `import_figma_ui` tool schema
5. The AI (or user) feeds this JSON directly to the MCP tool

This means designers **never need to manually add prefixes** — the plugin handles it automatically based on Figma's native layer ordering.

## Rules Summary

1. Every Figma layer MUST have a `{NN}_` prefix for deterministic Z-order
2. Layers are sorted ascending (lowest prefix = created first = bottom of stack)
3. Unprefixed layers default to `50` (mid-stack)
4. The **entire sorted array** is sent as one OSC message (never sequential UDP)
5. Max's daemon iterates locally with `uiTask.schedule(20)` for UI thread safety
6. After `newdefault`, dimensions are set via `patching_rect` (newdefault ignores size)
7. Presentation Mode is enabled on every UI element
