import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendToMax } from "../bridge.js";
import { sortByZIndex } from "../utils/z-sort.js";

export function register(server: McpServer) {
  server.tool(
    "import_figma_ui",
    "Batch import Z-sorted UI elements from Figma layer data. Layers are sorted by numeric prefix and sent as a single payload to Max.",
    {
      layers: z
        .array(
          z.object({
            name: z
              .string()
              .describe("Layer name with Z-index prefix (e.g. '00_bg_panel', '50_rate_dial')"),
            class: z
              .string()
              .describe("Max UI object class (e.g. 'live.panel', 'live.dial', 'live.slider')"),
            x: z.number().describe("X position in pixels"),
            y: z.number().describe("Y position in pixels"),
            width: z.number().describe("Width in pixels (applied via patching_rect after creation)"),
            height: z
              .number()
              .describe("Height in pixels (applied via patching_rect after creation)"),
            args: z
              .array(z.any())
              .optional()
              .default([])
              .describe("Initialization arguments"),
          })
        )
        .describe(
          "Array of Figma layers — will be sorted by Z-index prefix before sending to Max"
        ),
    },
    async (params) => {
      // Sort layers by Z-index prefix (ascending — lowest first = bottom of stack)
      const sorted = sortByZIndex(params.layers);

      // Send entire sorted array as ONE OSC message (never sequential UDP)
      const response = await sendToMax("/lofi/ui", { layers: sorted });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(response) }],
      };
    }
  );
}
