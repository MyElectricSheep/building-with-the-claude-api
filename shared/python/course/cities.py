"""A tiny read-only lookup tool used to demonstrate parallel tool calls
(lesson 28). Deliberately independent per city, so the model batches them.
"""

from __future__ import annotations

from typing import Any

CITIES: dict[str, dict[str, Any]] = {
    "lisbon": {"timezone": "Europe/Lisbon", "population": 548_703},
    "reykjavik": {"timezone": "Atlantic/Reykjavik", "population": 139_875},
    "noumea": {"timezone": "Pacific/Noumea", "population": 94_285},
    "montevideo": {"timezone": "America/Montevideo", "population": 1_319_108},
}

CITY_TOOL: dict[str, Any] = {
    "name": "lookup_city",
    "description": (
        "Look up one city's timezone and population. Call it once per city; "
        "calls for different cities are independent."
    ),
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {
            "city": {"type": "string", "description": "City name, e.g. Lisbon"}
        },
        "required": ["city"],
        "additionalProperties": False,
    },
}

KNOWN_CITIES = list(CITIES)


def lookup_city(city: str) -> dict[str, Any]:
    record = CITIES.get(city.strip().lower())
    if record is None:
        raise ValueError(f"Unknown city: {city}")
    return {"city": city, **record}
