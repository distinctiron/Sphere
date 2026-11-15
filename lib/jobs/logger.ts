/**
 * Structured job logging
 *
 * Every line is prefixed with the job name and run id and carries a JSON
 * payload, so runs can be followed (and grepped) in the server logs.
 */

type Level = "info" | "warn" | "error";

export interface JobLogger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

function serializeError(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  return value;
}

export function createJobLogger(jobName: string, runId: string): JobLogger {
  const write = (level: Level, message: string, data?: Record<string, unknown>) => {
    const payload = data
      ? " " +
        JSON.stringify(
          Object.fromEntries(Object.entries(data).map(([k, v]) => [k, serializeError(v)]))
        )
      : "";
    const line = `[job:${jobName} run:${runId}] ${message}${payload}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  return {
    info: (message, data) => write("info", message, data),
    warn: (message, data) => write("warn", message, data),
    error: (message, data) => write("error", message, data),
  };
}
