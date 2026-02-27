import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendToMax } from "../bridge.js";

export function register(server: McpServer) {
  server.tool(
    "max_wire_objects",
    "Connect two objects in the target patcher with a patch cord",
    {
      sourceId: z.string().describe("Registry ID of the source object"),
      outlet: z
        .number()
        .int()
        .min(0)
        .describe("Outlet index on the source object (0-based)"),
      destId: z.string().describe("Registry ID of the destination object"),
      inlet: z
        .number()
        .int()
        .min(0)
        .describe("Inlet index on the destination object (0-based)"),
    },
    async (params) => {
      const response = await sendToMax("/lofi/wire", params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(response) }],
      };
    }
  );
}
