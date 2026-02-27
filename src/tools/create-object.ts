import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendToMax } from "../bridge.js";

export function register(server: McpServer) {
  server.tool(
    "max_create_object",
    "Create a Max object at specific coordinates in the target device patcher",
    {
      id: z
        .string()
        .describe("Unique string ID for this object (stored in daemon registry for wiring/removal)"),
      class: z
        .string()
        .describe("Max object class name (e.g. 'live.dial', 'cycle~', 'message')"),
      x: z.number().describe("Horizontal position in pixels from left edge of patcher"),
      y: z.number().describe("Vertical position in pixels from top edge of patcher"),
      args: z
        .array(z.any())
        .optional()
        .default([])
        .describe("Initialization arguments for the object"),
    },
    async (params) => {
      const response = await sendToMax("/lofi/create", params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(response) }],
      };
    }
  );
}
