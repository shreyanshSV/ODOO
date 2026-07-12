import type { AIProvider } from "./types";
import { WebEnrichmentProvider } from "./web-provider";

export type { AIProvider, CompanyEnrichment } from "./types";

/**
 * The active AI provider. Web-first today; swap in an LLM-backed provider here
 * (e.g. gated on an env key) without changing any caller.
 */
export function getAIProvider(): AIProvider {
  return WebEnrichmentProvider;
}
