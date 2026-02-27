#!/usr/bin/env node

// LOFI MONSTER — Max MCP Server entry point

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logInfo, logError } from "./utils/logger.js";

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logInfo("LOFI MONSTER MCP server running on STDIO");
}

main().catch((err) => {
  logError(`Fatal: ${err.message}`);
  process.exit(1);
});
