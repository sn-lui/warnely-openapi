/**
 * Warnely TypeScript client — composite travel-safety scores for 180 countries.
 *
 * Thin wrapper around the public Warnely REST API (https://warnely.com/api/v1).
 * Uses the global `fetch` API (Node 18+, browsers, Deno, Bun). Zero
 * runtime dependencies, minimal install footprint.
 *
 * Quick start:
 *
 *   import { WarnelyClient } from "warnely";
 *
 *   const client = new WarnelyClient();
 *   const thailand = await client.getCountry("TH");
 *   console.log(thailand.risk_score, thailand.risk_tier);
 *
 * Spec:  https://warnely.com/openapi.json
 * Docs:  https://warnely.com/api-docs
 */

export const DEFAULT_BASE_URL = "https://warnely.com/api/v1";
export const DEFAULT_USER_AGENT =
  "warnely-typescript/1.0.0 (+https://github.com/sn-lui/warnely-openapi)";

export type Region =
  | "Europe"
  | "Asia"
  | "Middle East"
  | "Africa"
  | "Latin America"
  | "North America"
  | "Oceania";

export type RiskTier =
  | "Very Safe"
  | "Exercise Normal Caution"
  | "Exercise Increased Caution"
  | "High Risk"
  | "Do Not Travel";

export interface CountryCompact {
  iso2: string;
  iso3: string | null;
  name: string;
  region: Region | null;
  risk_score: number | null;
  risk_tier: RiskTier | null;
  flag: string | null;
}

export interface CountryFull extends CountryCompact {
  summary: string | null;
  breakdown: Record<string, unknown> | null;
  advisories: Record<string, unknown> | null;
  drug_law: Record<string, unknown> | null;
  lgbtq: Record<string, unknown> | null;
  womens_safety: Record<string, unknown> | null;
  peace_index: Record<string, unknown> | null;
  quick_facts: Record<string, unknown> | null;
}

export interface Incident {
  id?: string;
  title?: string;
  summary?: string;
  url?: string;
  country_iso?: string;
  city?: string;
  lat?: number;
  lng?: number;
  occurred_at?: string;
  source?: string;
  category?: string;
  severity?: number;
}

export interface MethodologyDoc {
  composite: { formula: string; renormalised_when_missing: boolean; scale: string };
  components: Record<string, { weight: number; description: string }>;
  tiers: { range: string; label: string; level: number }[];
  sources: string[];
  review_cadence: Record<string, string>;
  licence: string;
  attribution: string;
  docs: string;
}

/**
 * Raised on any non-2xx response or transport error.
 *
 * - `status` is the HTTP status code; null for transport-layer failures.
 * - `code` is the machine-readable error tag from the response body
 *   (e.g. `"invalid_iso"`, `"not_found"`); null when the server didn't
 *   return a structured error.
 * - `response` is the raw decoded response body when available.
 */
export class WarnelyError extends Error {
  status: number | null;
  code: string | null;
  response: string | null;

  constructor(
    message: string,
    opts: { status?: number | null; code?: string | null; response?: string | null } = {},
  ) {
    super(message);
    this.name = "WarnelyError";
    this.status = opts.status ?? null;
    this.code = opts.code ?? null;
    this.response = opts.response ?? null;
  }
}

export interface WarnelyClientOptions {
  baseUrl?: string;
  userAgent?: string;
  /** Per-request timeout in milliseconds. Default 10s. */
  timeoutMs?: number;
  /** Custom fetch implementation. Default: global `fetch`. */
  fetch?: typeof fetch;
}

/**
 * Read-only client for the Warnely Public API.
 *
 * The API is CORS-open, requires no authentication, and rate-limits at
 * 100 req/min/IP. This client does no caching, retries, or
 * rate-limit-aware backoff so you can compose your own.
 */
export class WarnelyClient {
  readonly baseUrl: string;
  readonly userAgent: string;
  readonly timeoutMs: number;
  private readonly _fetch: typeof fetch;

  constructor(opts: WarnelyClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "") + "/";
    this.userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
    this._fetch = opts.fetch ?? globalThis.fetch;
    if (typeof this._fetch !== "function") {
      throw new Error(
        "No fetch implementation found. Pass `fetch` via options on Node <18.",
      );
    }
  }

  async listCountries(opts: { region?: Region } = {}): Promise<CountryCompact[]> {
    const data = await this._get<{ countries: CountryCompact[] }>(
      "countries",
      opts.region ? { region: opts.region } : undefined,
    );
    return data.countries ?? [];
  }

  async getCountry(iso: string): Promise<CountryFull> {
    const clean = iso.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(clean)) {
      throw new WarnelyError(`ISO must be 2 alphabetic characters; got ${JSON.stringify(iso)}`, {
        code: "invalid_iso",
      });
    }
    const data = await this._get<{ country: CountryFull }>(`countries/${clean}`);
    return data.country;
  }

  async methodology(): Promise<MethodologyDoc> {
    return this._get<MethodologyDoc>("methodology");
  }

  async recentIncidents(
    opts: { limit?: number; country?: string } = {},
  ): Promise<Incident[]> {
    const limit = opts.limit ?? 50;
    if (limit < 1 || limit > 200) {
      throw new WarnelyError(`limit must be between 1 and 200; got ${limit}`, {
        code: "invalid_limit",
      });
    }
    const params: Record<string, string> = { limit: String(limit) };
    if (opts.country) params.country = opts.country.trim().toUpperCase();
    const data = await this._get<{ incidents?: Incident[] } | Incident[]>(
      "incidents/recent",
      params,
    );
    if (Array.isArray(data)) return data;
    return data.incidents ?? [];
  }

  // ── Internals ────────────────────────────────────────────────────

  private async _get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v != null) url.searchParams.set(k, v);
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let resp: Response;
    try {
      resp = await this._fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": this.userAgent,
        },
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      throw new WarnelyError(`Transport error: ${(e as Error).message}`, {
        code: "transport_error",
      });
    } finally {
      clearTimeout(timer);
    }

    const body = await resp.text();
    if (!resp.ok) {
      let code: string | null = null;
      let message: string = resp.statusText || `HTTP ${resp.status}`;
      try {
        const payload = JSON.parse(body);
        if (payload && typeof payload === "object") {
          if ("error" in payload && typeof payload.error === "string") code = payload.error;
          if ("message" in payload && typeof payload.message === "string") {
            message = payload.message;
          }
        }
      } catch {
        // body wasn't JSON; keep status message
      }
      throw new WarnelyError(message, { status: resp.status, code, response: body });
    }
    return JSON.parse(body) as T;
  }
}

/** Module-level shortcut for one-off calls. */
export async function listCountries(opts?: { region?: Region }): Promise<CountryCompact[]> {
  return new WarnelyClient().listCountries(opts);
}

/** Module-level shortcut for one-off calls. */
export async function getCountry(iso: string): Promise<CountryFull> {
  return new WarnelyClient().getCountry(iso);
}
