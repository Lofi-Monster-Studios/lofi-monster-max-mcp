import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendToMax } from "../bridge.js";

export function register(server: McpServer) {
  server.tool(
    "init_device",
    "Initialize a new Max for Live device by creating a named subpatcher. Must be called before any other tool.",
    {
      deviceName: z
        .string()
        .describe("Name of the device (becomes the subpatcher title, e.g. 'Flutter')"),
      width: z
        .number()
        .optional()
        .default(600)
        .describe("Patcher window width in pixels"),
      height: z
        .number()
        .optional()
        .default(400)
        .describe("Patcher window height in pixels"),
    },
    async (params) => {
      const response = await sendToMax("/lofi/init", params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(response) }],
      };
    }
  );
}
