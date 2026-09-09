import Anthropic from "@anthropic-ai/sdk";
import toolDefinitions from "./tools.json" with { type: "json" };

const tools = toolDefinitions as Anthropic.Tool[];
const client = new Anthropic();

const weatherSummarySchema = {
  type: "object",
  properties: {
    location: { type: "string" },
    localDatetime: {
      type: ["string", "null"],
      description: "Current date/time at the requested location, or null.",
    },
    timezone: {
      type: ["string", "null"],
      description: "Verified timezone of the requested location, or null.",
    },
    currentTemperatureC: {
      type: ["number", "null"],
      description: "Current temperature in Celsius, or null if unavailable.",
    },
    laterTemperatureC: {
      type: ["number", "null"],
      description: "Forecast temperature later today in Celsius, or null.",
    },
    laterLocalTime: {
      type: ["string", "null"],
      description: "Local forecast time, including date, or null.",
    },
  },
  required: [
    "location",
    "localDatetime",
    "timezone",
    "currentTemperatureC",
    "laterTemperatureC",
    "laterLocalTime",
  ],
  additionalProperties: false,
};

type WeatherSummary = {
  location: string;
  localDatetime: string | null;
  timezone: string | null;
  currentTemperatureC: number | null;
  laterTemperatureC: number | null;
  laterLocalTime: string | null;
};

const getWeatherData = async (location: { lat: number; long: number }) => {
  if (!location) throw new Error("Location cannot be empty");

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.long}&hourly=temperature_2m`,
  );

  if (!res.ok) {
    throw new Error(`Weather request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
};

const getCurrentDatetime = (dateFormat = "%Y-%m-%d %H:%M:%S"): string => {
  if (!dateFormat) {
    throw new Error("dateFormat cannot be empty");
  }

  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  const tokens: Record<string, string> = {
    "%Y": String(now.getFullYear()),
    "%m": pad(now.getMonth() + 1),
    "%d": pad(now.getDate()),
    "%H": pad(now.getHours()),
    "%M": pad(now.getMinutes()),
    "%S": pad(now.getSeconds()),
    "%%": "%",
  };

  return dateFormat.replace(/%[YmdHMS%]/g, (token) => tokens[token]!);
};

const messages: Anthropic.MessageParam[] = [
  {
    role: "user",
    content:
      "What time is it, and what's the weather like in Noumea, New Caledonia right now?",
  },
];

const systemPrompt = `
Use tools to obtain the requested time and weather, then return the JSON summary.
Use only values supported by tool results. All temperatures must be Celsius.
The datetime tool returns the machine's local time, not necessarily the requested
location's time. Do not assume they are the same or infer an unknown timezone.
Do not present hourly forecasts as current observations.
Choose an afternoon forecast later today if still ahead, otherwise an evening
forecast, using the requested location's verified local timezone.
Use null for unavailable or unverifiable values. Do not put commentary in fields.
`;

while (true) {
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1000,
    system: systemPrompt,
    output_config: {
      format: {
        type: "json_schema",
        schema: weatherSummarySchema,
      },
    },
    tools,
    messages,
  });

  if (response.stop_reason === "end_turn") {
    const jsonText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const summary = JSON.parse(jsonText) as WeatherSummary;

    // Format the parsed JSON here; Claude does not control the display.
    const temperature = (value: number | null): string =>
      value === null ? "Unavailable" : `${value}°C`;

    console.log(`Location: ${summary.location}`);
    console.log(
      `Date/time: ${summary.localDatetime ?? "Unavailable"} ` +
        `(${summary.timezone ?? "timezone unavailable"})`,
    );
    console.log(`Now: ${temperature(summary.currentTemperatureC)}`);
    console.log(
      `Later today: ${temperature(summary.laterTemperatureC)}` +
        (summary.laterLocalTime ? ` at ${summary.laterLocalTime}` : ""),
    );
    break;
  }

  if (response.stop_reason !== "tool_use") {
    throw new Error(`Response did not finish: ${response.stop_reason}`);
  }

  messages.push({
    role: "assistant",
    content: response.content,
  });

  const toolResults: Anthropic.ToolResultBlockParam[] = [];

  for (const block of response.content) {
    if (block.type !== "tool_use") continue;

    try {
      let result: unknown;

      switch (block.name) {
        case "getCurrentDatetime": {
          const input = block.input as { dateFormat?: string };
          result = getCurrentDatetime(input.dateFormat);
          break;
        }

        case "getWeatherData": {
          const input = block.input as {
            location: { lat: number; long: number };
          };

          result = await getWeatherData(input.location);
          break;
        }

        default:
          throw new Error(`Unknown tool: ${block.name}`);
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    } catch (error) {
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: error instanceof Error ? error.message : String(error),
        is_error: true,
      });
    }
  }

  if (toolResults.length === 0) {
    throw new Error("Claude requested tool use but returned no tool calls.");
  }

  messages.push({
    role: "user",
    content: toolResults,
  });
}
