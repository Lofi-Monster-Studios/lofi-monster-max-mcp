// UDP/OSC bridge — sends commands to Max, receives responses

import { Client, Server as OscServer, Message } from "node-osc";
import { PORTS, OSC_HOST, type MaxResponse } from "./types.js";
import { logSend, logReceive, logInfo, logError } from "./utils/logger.js";

let oscClient: Client | null = null;
let oscServer: OscServer | null = null;

/** Pending response resolvers keyed by nothing — we use a simple queue since OSC has no correlation IDs */
let pendingResolve: ((response: MaxResponse) => void) | null = null;

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Initialize the OSC bridge — create client (send to Max) and server (receive from Max).
 */
export function initBridge(): void {
  oscClient = new Client(OSC_HOST, PORTS.TO_MAX);
  logInfo(`OSC client ready → ${OSC_HOST}:${PORTS.TO_MAX}`);

  oscServer = new OscServer(PORTS.FROM_MAX, OSC_HOST, () => {
    logInfo(`OSC server listening ← ${OSC_HOST}:${PORTS.FROM_MAX}`);
  });

  oscServer.on("message", (msg: any[]) => {
    // msg = [address, ...args]
    // Max sends JSON string as the argument after the address
    const raw = msg.length > 1 ? msg[1] : msg[0];
    try {
      const response: MaxResponse =
        typeof raw === "string" ? JSON.parse(raw) : raw;
      logReceive(response);
      if (pendingResolve) {
        const resolve = pendingResolve;
        pendingResolve = null;
        resolve(response);
      }
    } catch (e) {
      logError(`Failed to parse Max response: ${raw}`);
    }
  });

  oscServer.on("error", (err: Error) => {
    logError(`OSC server error: ${err.message}`);
  });
}

/**
 * Send an OSC message to Max and await a response.
 * The entire payload is JSON.stringify'd into a single OSC string argument
 * to bypass Max's comma trap.
 */
export function sendToMax(
  address: string,
  payload: object,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<MaxResponse> {
  return new Promise((resolve, reject) => {
    if (!oscClient) {
      reject(new Error("OSC bridge not initialized — call initBridge() first"));
      return;
    }

    logSend(address, payload);

    // Set up timeout
    const timer = setTimeout(() => {
      pendingResolve = null;
      reject(new Error(`Max response timeout after ${timeoutMs}ms for ${address}`));
    }, timeoutMs);

    // Set up response handler
    pendingResolve = (response: MaxResponse) => {
      clearTimeout(timer);
      resolve(response);
    };

    // Send: address + single JSON string argument (bypasses Max comma trap)
    const message = new Message(address);
    message.append(JSON.stringify(payload));
    oscClient.send(message, (err?: Error) => {
      if (err) {
        clearTimeout(timer);
        pendingResolve = null;
        reject(new Error(`OSC send failed: ${err.message}`));
      }
    });
  });
}

/**
 * Close the OSC bridge cleanly.
 */
export function closeBridge(): void {
  if (oscClient) {
    oscClient.close();
    oscClient = null;
  }
  if (oscServer) {
    oscServer.close();
    oscServer = null;
  }
  logInfo("OSC bridge closed");
}
