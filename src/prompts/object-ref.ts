import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const UI_TABLE = `| Class         | Description                    |
|---------------|--------------------------------|
| live.panel    | Background panel/rectangle     |
| live.dial     | Rotary knob with value display |
| live.slider   | Vertical or horizontal slider  |
| live.toggle   | On/off toggle button           |
| live.button   | Momentary button               |
| live.menu     | Dropdown menu                  |
| live.numbox   | Number input box               |
| live.text     | Text display                   |
| live.tab      | Tab selector                   |
| comment       | Text label (non-interactive)   |`;

const DSP_TABLE = `| Class    | Description              |
|----------|--------------------------|
| cycle~   | Sine oscillator          |
| phasor~  | Ramp/sawtooth oscillator |
| noise~   | White noise generator    |
| *~       | Signal multiply          |
| +~       | Signal add               |
| lores~   | Resonant lowpass filter  |
| svf~     | State-variable filter    |
| dac~     | Audio output             |
| adc~     | Audio input              |`;

const UTILITY_TABLE = `| Class   | Description                        |
|---------|------------------------------------|
| js      | Legacy JavaScript object           |
| v8      | Modern V8 JavaScript object        |
| message | Message box                        |
| toggle  | Toggle switch                      |
| slider  | Slider                             |
| number  | Number box                         |
| print   | Print to Max console               |
| trigger | Trigger/order messages             |
| route   | Route messages by first element    |
| pack    | Pack multiple values into a list   |
| unpack  | Unpack a list into individual vals |`;

export function register(server: McpServer) {
  server.prompt(
    "object-ref",
    "Quick reference for common Max object classes (UI, DSP, Utility)",
    {
      category: z
        .enum(["ui", "dsp", "utility", "all"])
        .optional()
        .describe("Filter to a specific category, or 'all' for everything"),
    },
    async ({ category }) => {
      const cat = category ?? "all";
      const sections: string[] = [];

      if (cat === "all" || cat === "ui") {
        sections.push(`## UI Objects (for batch_create_ui)\n${UI_TABLE}`);
      }
      if (cat === "all" || cat === "dsp") {
        sections.push(`## DSP Objects\n${DSP_TABLE}`);
      }
      if (cat === "all" || cat === "utility") {
        sections.push(`## Utility Objects\n${UTILITY_TABLE}`);
      }

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Max/MSP Object Reference — use these class names with max_create_object and batch_create_ui tools.\n\n${sections.join("\n\n")}\n\nNotes:\n- Use live.* classes for Max for Live device UIs\n- DSP objects end with ~ (tilde) for audio-rate processing\n- newdefault ignores width/height — always follow up with patching_rect`,
            },
          },
        ],
      };
    }
  );
}
