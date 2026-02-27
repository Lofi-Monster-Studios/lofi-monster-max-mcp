import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendToMax } from "../bridge.js";

export function register(server: McpServer) {
  server.tool(
    "map_live_api",
    "Map a Live API parameter to a Max object in the target patcher",
    {
      parameter: z
        .string()
        .describe("Live API parameter path (e.g. 'live.dial[cutoff]')"),
      objectId: z
        .string()
        .describe("Registry ID of the Max object to map"),
      property: z
        .string()
        .describe("Property name to map (e.g. 'value')"),
    },
    async (params) => {
      const response = await sendToMax("/lofi/map", params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(response) }],
      };
    }
  );
}
