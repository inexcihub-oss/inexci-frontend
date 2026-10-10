import type { components } from "./api.generated";

export type ApiSchemas = components["schemas"];

export type ApiSchema<K extends keyof ApiSchemas> = ApiSchemas[K];
