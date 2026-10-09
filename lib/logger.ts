type LogLevel = "error" | "warn" | "log" | "debug";

const RANK: Record<LogLevel, number> = {
  error: 1,
  warn: 2,
  log: 3,
  debug: 4,
};

const isBrowser = typeof window !== "undefined";
const isDev = process.env.NODE_ENV === "development";

const minLevel: LogLevel = (() => {
  const explicit = process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel | undefined;
  if (explicit && RANK[explicit]) return explicit;
  return isDev ? "debug" : "warn";
})();

let currentRequestId: string | null = null;

export function setRequestId(value: string | null | undefined): void {
  currentRequestId = value ? String(value) : null;
}

export function getRequestId(): string | null {
  return currentRequestId;
}

function shouldLog(level: LogLevel): boolean {
  return RANK[level] <= RANK[minLevel];
}

function buildMeta(): Record<string, string> | undefined {
  if (!isBrowser) return undefined;
  const meta: Record<string, string> = {};
  if (currentRequestId) meta.requestId = currentRequestId;
  meta.url = window.location?.pathname ?? "";
  return Object.keys(meta).length > 0 ? meta : undefined;
}

export const logger = {
  error: (msg: string, err?: unknown) => {
    if (!shouldLog("error")) return;
    const meta = buildMeta();
    if (meta) {
      console.error(msg, { error: serializeError(err), ...meta });
    } else {
      console.error(msg, err);
    }
  },
  warn: (msg: string, data?: unknown) => {
    if (!shouldLog("warn")) return;
    const meta = buildMeta();
    if (meta) {
      console.warn(msg, { data, ...meta });
    } else {
      console.warn(msg, data);
    }
  },
  log: (msg: string, data?: unknown) => {
    if (!shouldLog("log")) return;
    console.log(msg, data);
  },
  debug: (msg: string, data?: unknown) => {
    if (!shouldLog("debug")) return;
    console.debug(msg, data);
  },
};

function serializeError(err: unknown): unknown {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: isDev ? err.stack : undefined,
    };
  }
  return err;
}
