# Warnely Public API — OpenAPI 3.1 Specification

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-6BA539.svg)](https://spec.openapis.org/oas/v3.1.0)

Machine-readable specification for the [Warnely Public API](https://warnely.com/developers): a free, CORS-open, read-only REST API exposing the Warnely composite travel-safety dataset for 180 countries.

The canonical spec is served at **[https://warnely.com/openapi.json](https://warnely.com/openapi.json)** — that is the URL to use for production tooling. This repository mirrors the spec for GitHub-based discovery, version pinning, and OpenAPI directory submissions.

## What the API exposes

| Endpoint | Returns |
|---|---|
| `GET /api/v1/countries` | Compact list of all 180 countries (iso2, iso3, name, region, risk_score, risk_tier, flag). Optional `?region=` filter. |
| `GET /api/v1/countries/{iso}` | Full country snapshot: composite score, six-category risk breakdown, UK FCDO + US State Department advisories, drug-law tier, LGBTQ+ legal status, women's-safety rating, Global Peace Index rank, quick facts. |
| `GET /api/v1/methodology` | Composite formula (50% editorial + 30% authority + 15% structural + 5% live), component weights, source list, tier boundaries, review cadence. |
| `GET /api/v1/incidents/recent` | Last 50–200 incidents from the Warnely safety wire (Reuters, BBC, AP, AFP, USGS, GDACS, ReliefWeb). Optional `?country=` filter. |

## Data sources

- UK FCDO travel advice (gov.uk) — refreshed daily
- US State Department travel advisories (travel.state.gov) — refreshed daily
- Global Peace Index 2025 (Institute for Economics and Peace)
- World Bank Worldwide Governance Indicators
- WHO country health profiles
- Warnely incident wire (Reuters, BBC, AP, AFP, USGS, GDACS, ReliefWeb, Met Office, EA Floods, regional feeds)

## Quick start

```sh
# One-line verify
curl -s "https://warnely.com/api/v1/countries/TH" | head

# Generate a TypeScript client
npx openapi-typescript "https://warnely.com/openapi.json" -o ./src/warnely-api.d.ts

# Import into Postman
# File → Import → Link → paste https://warnely.com/openapi.json
```

## Terms

- **Auth**: None required.
- **Rate limit**: 100 req/min/IP.
- **CORS**: Open (`*`).
- **HTTPS**: Required.
- **Licence**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribute as "Warnely (warnely.com)".

## Stability

- `/api/v1` is a stability commitment. Breaking changes ship only behind `/api/v2`.
- Field additions to existing endpoints are non-breaking and do not bump the version.

## Companion data

- **CSV + JSON dataset bundle** on [Hugging Face: Warnely/country-risk](https://huggingface.co/datasets/Warnely/country-risk)
- **Medical-evacuation cost dataset** at [warnely.com/methodology/medevac](https://warnely.com/methodology/medevac) (CC BY 4.0)
- **Country safety guides** at [warnely.com/guides](https://warnely.com/guides)
- **Methodology** at [warnely.com/guides/methodology](https://warnely.com/guides/methodology)

## Updates

- This spec is regenerated whenever a breaking-or-additive change ships.
- Watch this repo, or subscribe to the [Warnely advisory-changes RSS feed](https://warnely.com/changes.rss) for data-side updates.

## Issues + feedback

- For API behaviour questions or bug reports: open an issue here or email `hello@warnely.com`.
- For dataset corrections (e.g. an out-of-date advisory): use the per-country guide pages on `warnely.com/guides/<country>` which carry a feedback link.

## Licence

The OpenAPI specification in this repository is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), the same licence as the data it documents.
