import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import pino, { type DestinationStream, type Logger } from "pino";

const traceStore = new AsyncLocalStorage<string>();

export function currentTraceId(): string | undefined {
  return traceStore.getStore();
}

export function runWithTraceId<T>(traceId: string, fn: () => T): T {
  return traceStore.run(traceId, fn);
}

export function createTraceId(): string {
  return randomUUID();
}

export function createLogger(options: { destination?: DestinationStream } = {}): Logger {
  return pino(
    {
      level: process.env.LOG_LEVEL ?? "info",
      mixin() {
        return { trace_id: currentTraceId() ?? "untraced" };
      },
    },
    options.destination,
  );
}
