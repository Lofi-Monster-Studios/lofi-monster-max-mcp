import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendToMax } from "../bridge.js";

export function register(server: McpServer) {
  server.tool(
    "max_remove_object",
    "Remove an object from the target patcher and delete it from the daemon registry",
    {
      id: z.string().describe("Registry ID of the object to remove"),
    },
    async (params) => {
      const response = await sendToMax("/lofi/remove", params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(response) }],
      };
    }
  );
}
