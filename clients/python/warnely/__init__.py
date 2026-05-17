"""Warnely Python client — composite travel-safety scores for 180 countries.

Thin wrapper around the public Warnely REST API (https://warnely.com/api/v1).
No auth, no signup, no API key. CC BY 4.0 with attribution.

Quick start:

    from warnely import WarnelyClient

    client = WarnelyClient()
    thailand = client.get_country("TH")
    print(thailand["risk_score"], thailand["risk_tier"])

    for c in client.list_countries(region="Asia"):
        print(c["name"], c["risk_score"])

    for inc in client.recent_incidents(country="TH"):
        print(inc["title"], inc["occurred_at"])

Spec: https://warnely.com/openapi.json
Docs: https://warnely.com/api-docs
"""

from .client import WarnelyClient, WarnelyError

__version__ = "1.0.0"
__all__ = ["WarnelyClient", "WarnelyError"]
