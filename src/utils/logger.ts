// OSC payload logging for debugging

function timestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

export function logSend(address: string, payload: object): void {
  console.error(`[${timestamp()}] [OSC→] ${address} ${JSON.stringify(payload)}`);
}

export function logReceive(data: object): void {
  console.error(`[${timestamp()}] [OSC←] ${JSON.stringify(data)}`);
}

export function logInfo(msg: string): void {
  console.error(`[${timestamp()}] [INFO] ${msg}`);
}

export function logError(msg: string): void {
  console.error(`[${timestamp()}] [ERROR] ${msg}`);
}
