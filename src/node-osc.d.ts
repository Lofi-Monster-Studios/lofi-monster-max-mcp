declare module "node-osc" {
  import { EventEmitter } from "events";

  export class Client {
    constructor(host: string, port: number);
    send(message: Message, callback?: (err?: Error) => void): void;
    send(...args: any[]): void;
    close(callback?: () => void): void;
  }

  export class Server extends EventEmitter {
    constructor(port: number, host?: string, callback?: () => void);
    close(callback?: () => void): void;
  }

  export class Message {
    constructor(address: string);
    append(value: string | number | boolean): void;
  }
}
