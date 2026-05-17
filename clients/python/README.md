# warnely (Python)

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)

Python client for the [Warnely Public API](https://warnely.com/developers): composite travel-safety scores for 180 countries combining UK FCDO, US State Department, Global Peace Index, World Bank Worldwide Governance Indicators, and a live news incident wire.

**Zero dependencies.** Uses only the Python standard library.

## Install

```bash
# From git (no PyPI required)
pip install "git+https://github.com/sn-lui/warnely-openapi.git#subdirectory=clients/python"

# Or with a specific version tag
pip install "git+https://github.com/sn-lui/warnely-openapi.git@v1.0.0#subdirectory=clients/python"
```

## Use

```python
from warnely import WarnelyClient

client = WarnelyClient()

# One country, full snapshot
thailand = client.get_country("TH")
print(thailand["risk_score"])         # 38
print(thailand["risk_tier"])          # "Exercise Increased Caution"
print(thailand["drug_law"]["tier"])   # "severe"

# All countries in a region, sorted by score
for c in sorted(client.list_countries(region="Asia"),
                key=lambda x: x["risk_score"]):
    print(f"{c['risk_score']:>3} {c['iso2']} {c['name']}")

# Live incident wire (last 50 by default)
for inc in client.recent_incidents(country="TH"):
    print(inc["occurred_at"], inc["title"])

# Methodology document
m = client.methodology()
print(m["composite"]["formula"])
```

## Reference

```python
WarnelyClient(
    base_url="https://warnely.com/api/v1",
    user_agent="warnely-python/1.0.0",
    timeout=10.0,
)
```

| Method | Returns | Notes |
|---|---|---|
| `list_countries(region=None)` | `list[dict]` | Optional region filter |
| `get_country(iso)` | `dict` | ISO 3166-1 alpha-2, case-insensitive |
| `methodology()` | `dict` | Composite formula + sources + tiers |
| `recent_incidents(limit=50, country=None)` | `list[dict]` | 1≤limit≤200 |

## Errors

All non-2xx responses and transport failures raise `WarnelyError`:

```python
from warnely import WarnelyClient, WarnelyError

try:
    c = WarnelyClient().get_country("ZZ")
except WarnelyError as e:
    print(e.status, e.code, e.message)
    # 404 not_found "No country with ISO code "ZZ"..."
```

## Attribution

The Warnely dataset is licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). If you publish work derived from it, attribute Warnely with a link to https://warnely.com.

## Spec

This client is generated and maintained alongside the OpenAPI 3.1 specification at the root of this repo. The canonical live spec is at https://warnely.com/openapi.json.
