"""Warnely API client.

Single-class wrapper around the four Warnely public endpoints. Uses only
the Python standard library so it has zero install footprint beyond the
package itself. The intentional minimalism keeps the SDK auditable and
small enough to vendor into any project; no opaque dependency chain.
"""

from __future__ import annotations

import json
import logging
from typing import Iterable, Mapping, Optional, Sequence
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

__all__ = ["WarnelyClient", "WarnelyError"]

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://warnely.com/api/v1"
DEFAULT_USER_AGENT = "warnely-python/1.0.0 (+https://github.com/sn-lui/warnely-openapi)"
DEFAULT_TIMEOUT = 10.0


class WarnelyError(Exception):
    """Raised on any non-2xx response or transport error.

    Attributes:
        status: HTTP status code, or None for transport errors.
        code: Machine-readable error tag from the response body
            (e.g. "invalid_iso", "not_found"). None when the server did
            not return a structured error.
        message: Human-readable error message from the response body, or
            the underlying exception's message for transport failures.
        response: Raw response body (decoded text) when available.
    """

    def __init__(
        self,
        message: str,
        *,
        status: Optional[int] = None,
        code: Optional[str] = None,
        response: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.response = response


class WarnelyClient:
    """Read-only client for the Warnely Public API.

    The API is CORS-open, requires no authentication, and rate-limits at
    100 req/min/IP. This client does no caching, retries, or
    rate-limit-aware backoff so you can compose your own; for a single
    request per workflow the defaults are sufficient.

    Args:
        base_url: Override the base URL (default: production warnely.com).
            Useful for staging environments or local mocks.
        user_agent: Override the User-Agent header. Defaults to
            ``warnely-python/<version>`` so traffic is attributable.
        timeout: Per-request timeout in seconds (default: 10s).
    """

    def __init__(
        self,
        *,
        base_url: str = DEFAULT_BASE_URL,
        user_agent: str = DEFAULT_USER_AGENT,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        # Always store the base URL with a trailing slash so urljoin
        # composes correctly even for callers who pass a custom origin.
        self.base_url = base_url.rstrip("/") + "/"
        self.user_agent = user_agent
        self.timeout = timeout

    # ── Public methods ────────────────────────────────────────────────

    def list_countries(self, *, region: Optional[str] = None) -> Sequence[Mapping]:
        """Return all 180 countries, optionally filtered by region.

        Args:
            region: One of "Europe", "Asia", "Middle East", "Africa",
                "Latin America", "North America", "Oceania". Case-insensitive.

        Returns:
            A list of compact country records: iso2, iso3, name, region,
            risk_score, risk_tier, flag.

        Raises:
            WarnelyError: On any non-2xx response.
        """
        params = {"region": region} if region else None
        data = self._get("countries", params=params)
        return data.get("countries", [])

    def get_country(self, iso: str) -> Mapping:
        """Return the full snapshot for one country.

        Args:
            iso: ISO 3166-1 alpha-2 country code (case-insensitive,
                normalised to uppercase before request).

        Returns:
            The full country record including breakdown, advisories,
            drug_law, lgbtq, womens_safety, peace_index, quick_facts.

        Raises:
            WarnelyError: If the ISO is malformed (400) or unknown (404).
        """
        iso_clean = iso.strip().upper()
        if len(iso_clean) != 2 or not iso_clean.isalpha():
            raise WarnelyError(
                f"ISO must be 2 alphabetic characters; got {iso!r}",
                code="invalid_iso",
            )
        data = self._get(f"countries/{iso_clean}")
        return data.get("country", {})

    def methodology(self) -> Mapping:
        """Return the methodology document (composite formula, sources, tiers)."""
        return self._get("methodology")

    def recent_incidents(
        self,
        *,
        limit: int = 50,
        country: Optional[str] = None,
    ) -> Sequence[Mapping]:
        """Return recent items from the Warnely safety incident wire.

        Args:
            limit: Maximum items to return (1–200, default 50).
            country: ISO 3166-1 alpha-2 filter (uppercase).

        Returns:
            A list of incident records.
        """
        if not 1 <= limit <= 200:
            raise WarnelyError(
                f"limit must be between 1 and 200; got {limit}",
                code="invalid_limit",
            )
        params: dict[str, object] = {"limit": limit}
        if country:
            params["country"] = country.strip().upper()
        data = self._get("incidents/recent", params=params)
        return data.get("incidents", []) if isinstance(data, dict) else data

    # ── Internals ─────────────────────────────────────────────────────

    def _get(self, path: str, *, params: Optional[Mapping] = None) -> Mapping:
        url = urljoin(self.base_url, path)
        if params:
            cleaned = {k: v for k, v in params.items() if v is not None}
            if cleaned:
                url = f"{url}?{urlencode(cleaned)}"
        req = Request(
            url,
            headers={
                "User-Agent": self.user_agent,
                "Accept": "application/json",
            },
            method="GET",
        )
        try:
            with urlopen(req, timeout=self.timeout) as resp:
                body = resp.read().decode("utf-8")
                return json.loads(body)
        except HTTPError as e:
            body = ""
            code: Optional[str] = None
            message = str(e)
            try:
                body = e.read().decode("utf-8")
                payload = json.loads(body)
                if isinstance(payload, dict):
                    code = payload.get("error")
                    message = payload.get("message", message)
            except (ValueError, OSError):
                pass
            raise WarnelyError(
                message,
                status=e.code,
                code=code,
                response=body,
            ) from e
        except URLError as e:
            raise WarnelyError(f"Transport error: {e}", code="transport_error") from e


def list_countries(*, region: Optional[str] = None) -> Sequence[Mapping]:
    """Module-level shortcut. Equivalent to ``WarnelyClient().list_countries()``."""
    return WarnelyClient().list_countries(region=region)


def get_country(iso: str) -> Mapping:
    """Module-level shortcut. Equivalent to ``WarnelyClient().get_country(iso)``."""
    return WarnelyClient().get_country(iso)
