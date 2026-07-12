// Result of enriching a company from public sources.
export type CompanyEnrichment = {
  name: string;
  domain: string | null;
  website: string | null;
  logoUrl: string | null;
  industry: string | null;
  headquarters: string | null;
  description: string | null;
  departments: string[];
  csrCategories: string[];
  goals: string[];
  sources: string[]; // pages actually read, for transparency
  discovered: boolean; // false → nothing found, fall back to manual entry
};

/**
 * Pluggable intelligence layer. The web provider (public sources) is the
 * default; an LLM-backed provider can implement the same interface later
 * with no changes to callers.
 */
export interface AIProvider {
  readonly id: string;
  enrichCompany(input: { name: string; domain?: string }): Promise<CompanyEnrichment>;
}
