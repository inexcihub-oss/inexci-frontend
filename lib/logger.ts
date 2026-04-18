const isDev = process.env.NODE_ENV === "development";

export const logger = {
  error: (msg: string, err?: unknown) => {
    if (isDev) console.error(msg, err);
  },
  warn: (msg: string, data?: unknown) => {
    if (isDev) console.warn(msg, data);
  },
  log: (msg: string, data?: unknown) => {
    if (isDev) console.log(msg, data);
  },
};
