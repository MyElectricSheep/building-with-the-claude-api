/**
 * A tiny read-only lookup tool used to demonstrate parallel tool calls
 * (lesson 28). Deliberately independent per city, so the model batches them.
 */
import type Anthropic from "@anthropic-ai/sdk";

const CITIES: Record<string, { timezone: string; population: number }> = {
  lisbon: { timezone: "Europe/Lisbon", population: 548_703 },
  reykjavik: { timezone: "Atlantic/Reykjavik", population: 139_875 },
  noumea: { timezone: "Pacific/Noumea", population: 94_285 },
  montevideo: { timezone: "America/Montevideo", population: 1_319_108 },
};

export const CITY_TOOL: Anthropic.Tool = {
  name: "lookup_city",
  description:
    "Look up one city's timezone and population. Call it once per city; " +
    "calls for different cities are independent.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name, e.g. Lisbon" },
    },
    required: ["city"],
    additionalProperties: false,
  },
};

export function lookupCity(city: string): {
  city: string;
  timezone: string;
  population: number;
} {
  const record = CITIES[city.trim().toLowerCase()];
  if (!record) throw new Error(`Unknown city: ${city}`);
  return { city, ...record };
}

export const KNOWN_CITIES = Object.keys(CITIES);
