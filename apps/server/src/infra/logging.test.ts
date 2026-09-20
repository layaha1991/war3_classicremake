import { describe, expect, it } from "vitest";
import { createLogger, runWithTraceId } from "./logging.js";

describe("structured logger", () => {
  it("includes trace_id on every log line", () => {
    const lines: Record<string, unknown>[] = [];
    const logger = createLogger({
      destination: {
        write(msg: string) {
          lines.push(JSON.parse(msg));
        },
      },
    });

    runWithTraceId("trace-abc", () => {
      logger.info({ event: "ping" });
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.trace_id).toBe("trace-abc");
    expect(lines[0]?.event).toBe("ping");
  });
});
