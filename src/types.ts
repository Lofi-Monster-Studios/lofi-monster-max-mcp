// Shared TypeScript types for the LOFI MONSTER MCP Server

/** Response from the Max daemon */
export interface MaxResponse {
  status: "ok" | "error";
  message?: string;
  device?: string;
  id?: string;
  created?: number;
  targetId?: string;
  file?: string;
  parameter?: string;
}

/** A single Figma UI layer for import */
export interface FigmaLayer {
  name: string;
  class: string;
  x: number;
  y: number;
  width: number;
  height: number;
  args?: any[];
}

/** OSC port configuration */
export const PORTS = {
  /** MCP Server → Max (send) */
  TO_MAX: 7400,
  /** Max → MCP Server (receive) */
  FROM_MAX: 7401,
} as const;

export const OSC_HOST = "127.0.0.1";
