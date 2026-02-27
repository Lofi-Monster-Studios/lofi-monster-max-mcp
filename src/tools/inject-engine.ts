import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendToMax } from "../bridge.js";

export function register(server: McpServer) {
  server.tool(
    "inject_engine_code",
    "Load a JavaScript file from disk into a v8/js object in the target patcher. Sends the file path over OSC (never raw code — UDP would truncate it).",
    {
      targetId: z
        .string()
        .describe("Registry ID of the v8 or js object to load the script into"),
      filePath: z
        .string()
        .describe("Absolute path to the .js file on disk"),
    },
    async (params) => {
      const response = await sendToMax("/lofi/inject", params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(response) }],
      };
    }
  );
}
