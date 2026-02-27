import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function register(server: McpServer) {
  server.prompt(
    "status",
    "Check the current LOFI MONSTER connection and device state",
    async () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Check the current state of the LOFI MONSTER Max MCP bridge:

1. Is the MCP server connected? (You should see lofi-monster tools available — try listing them)
2. Is Max/MSP running with LOFI_Daemon.maxpat? (Try calling init_device with a test name — a timeout means Max isn't running, a response means it is)
3. What device is currently initialized? (Check if init_device has been called in this session)
4. What objects exist in the Max daemon registry? (The registry maps string IDs to Maxobj references)

Report the connection status and any issues found. If Max is not running, remind the user to open max/LOFI_Daemon.maxpat in Max/MSP.`,
          },
        },
      ],
    })
  );
}
