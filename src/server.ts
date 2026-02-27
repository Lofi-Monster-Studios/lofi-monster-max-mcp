// MCP Server setup — registers all tools and connects via STDIO

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { initBridge } from "./bridge.js";

// Tool registrations
import { register as registerInitDevice } from "./tools/init-device.js";
import { register as registerCreateObject } from "./tools/create-object.js";
import { register as registerWireObjects } from "./tools/wire-objects.js";
import { register as registerRemoveObject } from "./tools/remove-object.js";
import { register as registerImportFigmaUi } from "./tools/import-figma-ui.js";
import { register as registerInjectEngine } from "./tools/inject-engine.js";
import { register as registerMapLiveApi } from "./tools/map-live-api.js";

// Prompt registrations (slash commands)
import { register as registerBuildDevice } from "./prompts/build-device.js";
import { register as registerConstraints } from "./prompts/constraints.js";
import { register as registerFigmaGuide } from "./prompts/figma-guide.js";
import { register as registerObjectRef } from "./prompts/object-ref.js";
import { register as registerStatus } from "./prompts/status.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "lofi-monster-max",
    version: "0.1.0",
  });

  // Initialize OSC bridge (UDP send/receive)
  initBridge();

  // Register all tools
  registerInitDevice(server);
  registerCreateObject(server);
  registerWireObjects(server);
  registerRemoveObject(server);
  registerImportFigmaUi(server);
  registerInjectEngine(server);
  registerMapLiveApi(server);

  // Register prompts (slash commands)
  registerBuildDevice(server);
  registerConstraints(server);
  registerFigmaGuide(server);
  registerObjectRef(server);
  registerStatus(server);

  return server;
}
