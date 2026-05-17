# warnely (TypeScript)

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Node 18+](https://img.shields.io/badge/node-18+-43853d.svg)](https://nodejs.org)

TypeScript client for the [Warnely Public API](https://warnely.com/developers): composite travel-safety scores for 180 countries combining UK FCDO, US State Department, Global Peace Index, World Bank Worldwide Governance Indicators, and a live news incident wire.

**Zero runtime dependencies.** Works in Node 18+, browsers, Deno, and Bun via the global `fetch` API. Strict TypeScript types included.

## Install

```bash
# From git (no npm registry required)
npm install "github:sn-lui/warnely-openapi#v1.0.0&path:/clients/typescript"

# Or with pnpm/yarn equivalents
```

## Use

```typescript
import { WarnelyClient } from "warnely";

const client = new WarnelyClient();

// One country, full snapshot
const thailand = await client.getCountry("TH");
console.log(thailand.risk_score, thailand.risk_tier);
// 38 "Exercise Increased Caution"

// All countries in a region
const asia = await client.listCountries({ region: "Asia" });
asia.sort((a, b) => (a.risk_score ?? 0) - (b.risk_score ?? 0));
for (const c of asia) {
  console.log(`${c.risk_score} ${c.iso2} ${c.name}`);
}

// Live incident wire
const incidents = await client.recentIncidents({ country: "TH", limit: 10 });
for (const inc of incidents) {
  console.log(inc.occurred_at, inc.title);
}

// Methodology document
const m = await client.methodology();
console.log(m.composite.formula);
```

## Reference

```typescript
new WarnelyClient({
  baseUrl?: string,        // default: "https://warnely.com/api/v1"
  userAgent?: string,      // default: "warnely-typescript/1.0.0"
  timeoutMs?: number,      // default: 10_000
  fetch?: typeof fetch,    // default: globalThis.fetch (Node 18+)
});
```

| Method | Returns |
|---|---|
| `listCountries({region?})` | `Promise<CountryCompact[]>` |
| `getCountry(iso)` | `Promise<CountryFull>` |
| `methodology()` | `Promise<MethodologyDoc>` |
| `recentIncidents({limit?, country?})` | `Promise<Incident[]>` |

Type definitions for `CountryCompact`, `CountryFull`, `Incident`, `MethodologyDoc`, `Region`, and `RiskTier` are exported from the package.

## Errors

```typescript
import { WarnelyClient, WarnelyError } from "warnely";

try {
  await new WarnelyClient().getCountry("ZZ");
} catch (e) {
  if (e instanceof WarnelyError) {
    console.log(e.status, e.code, e.message);
    // 404 "not_found" "No country with ISO code "ZZ"..."
  }
}
```

## Attribution

The Warnely dataset is licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). If you publish work derived from it, attribute Warnely with a link to https://warnely.com.

## Spec

This client is maintained alongside the OpenAPI 3.1 specification at the root of this repo. The canonical live spec is at https://warnely.com/openapi.json.
