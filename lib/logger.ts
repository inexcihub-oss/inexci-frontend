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
    const error = serializeError(err);
    if (meta) {
      console.error(msg, { error, ...meta });
    } else {
      console.error(msg, error);
    }
  },
  warn: (msg: string, data?: unknown) => {
    if (!shouldLog("warn")) return;
    const meta = buildMeta();
    const safe = serializeError(data);
    if (meta) {
      console.warn(msg, { data: safe, ...meta });
    } else {
      console.warn(msg, safe);
    }
  },
  log: (msg: string, data?: unknown) => {
    if (!shouldLog("log")) return;
    console.log(msg, serializeError(data));
  },
  debug: (msg: string, data?: unknown) => {
    if (!shouldLog("debug")) return;
    console.debug(msg, serializeError(data));
  },
};

const DROPPED_KEYS = new Set([
  "headers",
  "config",
  "request",
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "access_token",
  "refresh_token",
  "accesstoken",
  "refreshtoken",
  "token",
]);

const MAX_DEPTH = 4;

interface HttpErrorLike {
  code?: unknown;
  config?: { method?: unknown; url?: unknown };
  response?: { status?: unknown };
}

function describeHttpError(err: HttpErrorLike): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof err.code === "string") out.code = err.code;
  const status = err.response?.status;
  if (typeof status === "number") out.status = status;
  const method = err.config?.method;
  if (typeof method === "string") out.method = method.toUpperCase();
  const url = err.config?.url;
  if (typeof url === "string") out.url = url.split("?")[0];
  return out;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...describeHttpError(value as HttpErrorLike),
      stack: isDev ? value.stack : undefined,
    };
  }
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (DROPPED_KEYS.has(lower)) continue;
    if (lower === "response" && entry && typeof entry === "object") {
      const status = (entry as { status?: unknown }).status;
      out.response = typeof status === "number" ? { status } : {};
      continue;
    }
    out[key] = sanitizeValue(entry, depth + 1);
  }
  return out;
}

export function serializeError(err: unknown): unknown {
  return sanitizeValue(err, 0);
}
