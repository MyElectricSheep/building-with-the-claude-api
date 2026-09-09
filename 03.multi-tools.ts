import Anthropic from "@anthropic-ai/sdk";
import toolDefinitions from "./tools.json" with { type: "json" };

const tools = toolDefinitions as Anthropic.Tool[];
const client = new Anthropic();
const reminderMode = process.argv.includes("--reminder");

const reminderSummarySchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["stored_demo", "unavailable"] },
    description: { type: ["string", "null"] },
    remindAt: { type: ["string", "null"] },
  },
  required: ["status", "description", "remindAt"],
  additionalProperties: false,
};
type ReminderSummary = {
  status: "stored_demo" | "unavailable";
  description: string | null;
  remindAt: string | null;
};

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

// Calendar arithmetic on timezone-free YYYY-MM-DD HH:mm:ss values.
// UTC methods avoid daylight-saving shifts; this does not convert timezones.
const parseCalendarDatetime = (value: string): Date => {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    throw new Error("Expected YYYY-MM-DD HH:mm:ss");
  }
  const date = new Date(value.replace(" ", "T") + "Z");
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 19).replace("T", " ") !== value
  ) {
    throw new Error("Invalid calendar date/time");
  }
  return date;
};

type DurationInput = {
  datetime: string;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

const addDurationToDatetime = ({
  datetime,
  days = 0,
  hours = 0,
  minutes = 0,
  seconds = 0,
}: DurationInput): string => {
  const date = parseCalendarDatetime(datetime);
  if (![days, hours, minutes, seconds].every(Number.isSafeInteger)) {
    throw new Error("Duration components must be safe integers");
  }
  date.setTime(
    date.getTime() +
      (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000,
  );
  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() < 0 ||
    date.getUTCFullYear() > 9999
  ) {
    throw new Error("Result is outside the supported date range");
  }
  return date.toISOString().slice(0, 19).replace("T", " ");
};

// Demo storage only: cleared when this script exits. No notifications scheduled.
type DemoReminder = { id: number; description: string; remindAt: string };
const reminders: DemoReminder[] = [];
const setReminder = (description: string, remindAt: string) => {
  if (typeof description !== "string" || !description.trim()) {
    throw new Error("Reminder description cannot be empty");
  }
  parseCalendarDatetime(remindAt);
  const reminder = { id: reminders.length + 1, description, remindAt };
  reminders.push(reminder);
  return { status: "stored_demo", ...reminder, notificationsScheduled: false };
};

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

// Message helpers accept text, content blocks, or a complete Claude response.
type MessageInput = Anthropic.MessageParam["content"] | Anthropic.Message;

const messageContent = (
  message: MessageInput,
): Anthropic.MessageParam["content"] =>
  typeof message === "string" || Array.isArray(message)
    ? message
    : message.content;

const addUserMessage = (
  messages: Anthropic.MessageParam[],
  message: MessageInput,
) => {
  messages.push({ role: "user", content: messageContent(message) });
};

const addAssistantMessage = (
  messages: Anthropic.MessageParam[],
  message: MessageInput,
) => {
  messages.push({ role: "assistant", content: messageContent(message) });
};

const textFromMessage = (message: Anthropic.Message): string =>
  message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

// Return the full response so tool-use blocks and stop_reason remain available.
const chat = (
  messages: Anthropic.MessageParam[],
  availableTools: Anthropic.Tool[] = tools,
): Promise<Anthropic.Message> =>
  client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1000,
    system: reminderMode
      ? `
Use tools for date arithmetic and storing demo reminders.
Use getCurrentDatetime only when the request needs today's date/time.
Use addDurationToDatetime to calculate dates; pass its result to setReminder.
Date/time values are timezone-free calendar values, not UTC instants.
A date-only request uses 00:00:00 as a demo convention.
setReminder stores only in memory and never schedules notifications.
Report stored_demo only after a successful setReminder result.
Otherwise report unavailable, with null for missing fields.
`
      : systemPrompt,
    output_config: {
      format: {
        type: "json_schema",
        schema: reminderMode ? reminderSummarySchema : weatherSummarySchema,
      },
    },
    tools: availableTools,
    messages,
  });

// Route one tool request to its implementation. Add new tools here.
const runTool = async (name: string, input: unknown): Promise<unknown> => {
  switch (name) {
    case "getCurrentDatetime": {
      const args = input as { dateFormat?: string };
      return getCurrentDatetime(args.dateFormat);
    }
    case "getWeatherData": {
      const args = input as { location: { lat: number; long: number } };
      return getWeatherData(args.location);
    }
    case "addDurationToDatetime":
      return addDurationToDatetime(input as DurationInput);
    case "setReminder": {
      const args = input as { description: string; remindAt: string };
      return setReminder(args.description, args.remindAt);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};

// Execute every tool request, even if another request in the same response fails.
const runTools = async (
  response: Anthropic.Message,
): Promise<Anthropic.ToolResultBlockParam[]> => {
  const toolRequests = response.content.filter(
    (block) => block.type === "tool_use",
  );
  const toolResults: Anthropic.ToolResultBlockParam[] = [];

  for (const request of toolRequests) {
    try {
      const output = await runTool(request.name, request.input);
      toolResults.push({
        type: "tool_result",
        tool_use_id: request.id,
        content: JSON.stringify(output),
        is_error: false,
      });
    } catch (error) {
      toolResults.push({
        type: "tool_result",
        tool_use_id: request.id,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      });
    }
  }

  return toolResults;
};

// One user question can require several successive rounds of tool calls.
// The caller owns messages, so the same history can be reused for follow-ups.
const runConversation = async (
  messages: Anthropic.MessageParam[],
  availableTools: Anthropic.Tool[] = tools,
): Promise<Anthropic.Message> => {
  while (true) {
    const response = await chat(messages, availableTools);

    if (
      response.stop_reason !== "end_turn" &&
      response.stop_reason !== "tool_use"
    ) {
      throw new Error(`Response did not finish: ${response.stop_reason}`);
    }

    // Save the final answer too, not just intermediate tool requests.
    addAssistantMessage(messages, response);

    if (response.stop_reason === "end_turn") return response;

    const toolResults = await runTools(response);
    if (toolResults.length === 0) {
      throw new Error("Claude requested tool use but returned no tool calls.");
    }
    addUserMessage(messages, toolResults);
  }
};

const formatSummary = (summary: WeatherSummary): string => {
  const temperature = (value: number | null): string =>
    value === null ? "Unavailable" : `${value}°C`;

  return [
    `Location: ${summary.location}`,
    `Date/time: ${summary.localDatetime ?? "Unavailable"} (${summary.timezone ?? "timezone unavailable"})`,
    `Now: ${temperature(summary.currentTemperatureC)}`,
    `Later today: ${temperature(summary.laterTemperatureC)}` +
      (summary.laterLocalTime ? ` at ${summary.laterLocalTime}` : ""),
  ].join("\n");
};

// Run your experiment here. Define the user prompt only once.
const messages: Anthropic.MessageParam[] = [];
addUserMessage(
  messages,
  reminderMode
    ? "Store a demo reminder for my doctor's appointment, 177 days after January 1, 2050. Use midnight as the demo time."
    : "What time is it, and what's the weather like in Noumea, New Caledonia right now?",
);

const response = await runConversation(messages);
if (reminderMode) {
  const summary = JSON.parse(textFromMessage(response)) as ReminderSummary;
  console.log(`Status: ${summary.status}`);
  console.log(`Reminder: ${summary.description ?? "Unavailable"}`);
  console.log(
    `Date/time: ${summary.remindAt ?? "Unavailable"} (timezone-free)`,
  );
  console.log(
    "Demo only: stored in memory for this run; no notification scheduled.",
  );
} else {
  const summary = JSON.parse(textFromMessage(response)) as WeatherSummary;
  console.log(formatSummary(summary));
}

// To continue, addUserMessage(messages, "your follow-up") and call
// runConversation(messages) again. Parse the result using the active mode's schema.

// import Anthropic from "@anthropic-ai/sdk";
// import toolDefinitions from "./tools.json" with { type: "json" };

// const tools = toolDefinitions as Anthropic.Tool[];
// const client = new Anthropic();

// const weatherSummarySchema = {
//   type: "object",
//   properties: {
//     location: { type: "string" },
//     localDatetime: {
//       type: ["string", "null"],
//       description: "Current date/time at the requested location, or null.",
//     },
//     timezone: {
//       type: ["string", "null"],
//       description: "Verified timezone of the requested location, or null.",
//     },
//     currentTemperatureC: {
//       type: ["number", "null"],
//       description: "Current temperature in Celsius, or null if unavailable.",
//     },
//     laterTemperatureC: {
//       type: ["number", "null"],
//       description: "Forecast temperature later today in Celsius, or null.",
//     },
//     laterLocalTime: {
//       type: ["string", "null"],
//       description: "Local forecast time, including date, or null.",
//     },
//   },
//   required: [
//     "location",
//     "localDatetime",
//     "timezone",
//     "currentTemperatureC",
//     "laterTemperatureC",
//     "laterLocalTime",
//   ],
//   additionalProperties: false,
// };

// type WeatherSummary = {
//   location: string;
//   localDatetime: string | null;
//   timezone: string | null;
//   currentTemperatureC: number | null;
//   laterTemperatureC: number | null;
//   laterLocalTime: string | null;
// };

// const getWeatherData = async (location: { lat: number; long: number }) => {
//   if (!location) throw new Error("Location cannot be empty");

//   const res = await fetch(
//     `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.long}&hourly=temperature_2m`,
//   );

//   if (!res.ok) {
//     throw new Error(`Weather request failed: ${res.status} ${res.statusText}`);
//   }

//   return res.json();
// };

// const getCurrentDatetime = (dateFormat = "%Y-%m-%d %H:%M:%S"): string => {
//   if (!dateFormat) {
//     throw new Error("dateFormat cannot be empty");
//   }

//   const now = new Date();
//   const pad = (value: number) => String(value).padStart(2, "0");

//   const tokens: Record<string, string> = {
//     "%Y": String(now.getFullYear()),
//     "%m": pad(now.getMonth() + 1),
//     "%d": pad(now.getDate()),
//     "%H": pad(now.getHours()),
//     "%M": pad(now.getMinutes()),
//     "%S": pad(now.getSeconds()),
//     "%%": "%",
//   };

//   return dateFormat.replace(/%[YmdHMS%]/g, (token) => tokens[token]!);
// };

// const systemPrompt = `
// Use tools to obtain the requested time and weather, then return the JSON summary.
// Use only values supported by tool results. All temperatures must be Celsius.
// The datetime tool returns the machine's local time, not necessarily the requested
// location's time. Do not assume they are the same or infer an unknown timezone.
// Do not present hourly forecasts as current observations.
// Choose an afternoon forecast later today if still ahead, otherwise an evening
// forecast, using the requested location's verified local timezone.
// Use null for unavailable or unverifiable values. Do not put commentary in fields.
// `;

// // Message helpers accept text, content blocks, or a complete Claude response.
// type MessageInput = Anthropic.MessageParam["content"] | Anthropic.Message;

// const messageContent = (
//   message: MessageInput,
// ): Anthropic.MessageParam["content"] =>
//   typeof message === "string" || Array.isArray(message)
//     ? message
//     : message.content;

// const addUserMessage = (
//   messages: Anthropic.MessageParam[],
//   message: MessageInput,
// ) => {
//   messages.push({ role: "user", content: messageContent(message) });
// };

// const addAssistantMessage = (
//   messages: Anthropic.MessageParam[],
//   message: MessageInput,
// ) => {
//   messages.push({ role: "assistant", content: messageContent(message) });
// };

// const textFromMessage = (message: Anthropic.Message): string =>
//   message.content
//     .filter((block) => block.type === "text")
//     .map((block) => block.text)
//     .join("\n");

// // Return the full response so tool-use blocks and stop_reason remain available.
// const chat = (
//   messages: Anthropic.MessageParam[],
//   availableTools: Anthropic.Tool[] = tools,
// ): Promise<Anthropic.Message> =>
//   client.messages.create({
//     model: "claude-haiku-4-5",
//     max_tokens: 1000,
//     system: systemPrompt,
//     output_config: {
//       format: { type: "json_schema", schema: weatherSummarySchema },
//     },
//     tools: availableTools,
//     messages,
//   });

// // Route one tool request to its implementation. Add new tools here.
// const runTool = async (name: string, input: unknown): Promise<unknown> => {
//   switch (name) {
//     case "getCurrentDatetime": {
//       const args = input as { dateFormat?: string };
//       return getCurrentDatetime(args.dateFormat);
//     }
//     case "getWeatherData": {
//       const args = input as { location: { lat: number; long: number } };
//       return getWeatherData(args.location);
//     }
//     default:
//       throw new Error(`Unknown tool: ${name}`);
//   }
// };

// // Execute every tool request, even if another request in the same response fails.
// const runTools = async (
//   response: Anthropic.Message,
// ): Promise<Anthropic.ToolResultBlockParam[]> => {
//   const toolRequests = response.content.filter(
//     (block) => block.type === "tool_use",
//   );
//   const toolResults: Anthropic.ToolResultBlockParam[] = [];

//   for (const request of toolRequests) {
//     try {
//       const output = await runTool(request.name, request.input);
//       toolResults.push({
//         type: "tool_result",
//         tool_use_id: request.id,
//         content: JSON.stringify(output),
//         is_error: false,
//       });
//     } catch (error) {
//       toolResults.push({
//         type: "tool_result",
//         tool_use_id: request.id,
//         content: `Error: ${error instanceof Error ? error.message : String(error)}`,
//         is_error: true,
//       });
//     }
//   }

//   return toolResults;
// };

// // One user question can require several successive rounds of tool calls.
// // The caller owns messages, so the same history can be reused for follow-ups.
// const runConversation = async (
//   messages: Anthropic.MessageParam[],
//   availableTools: Anthropic.Tool[] = tools,
// ): Promise<Anthropic.Message> => {
//   while (true) {
//     const response = await chat(messages, availableTools);

//     if (
//       response.stop_reason !== "end_turn" &&
//       response.stop_reason !== "tool_use"
//     ) {
//       throw new Error(`Response did not finish: ${response.stop_reason}`);
//     }

//     // Save the final answer too, not just intermediate tool requests.
//     addAssistantMessage(messages, response);

//     if (response.stop_reason === "end_turn") return response;

//     const toolResults = await runTools(response);
//     if (toolResults.length === 0) {
//       throw new Error("Claude requested tool use but returned no tool calls.");
//     }
//     addUserMessage(messages, toolResults);
//   }
// };

// const formatSummary = (summary: WeatherSummary): string => {
//   const temperature = (value: number | null): string =>
//     value === null ? "Unavailable" : `${value}°C`;

//   return [
//     `Location: ${summary.location}`,
//     `Date/time: ${summary.localDatetime ?? "Unavailable"} (${summary.timezone ?? "timezone unavailable"})`,
//     `Now: ${temperature(summary.currentTemperatureC)}`,
//     `Later today: ${temperature(summary.laterTemperatureC)}` +
//       (summary.laterLocalTime ? ` at ${summary.laterLocalTime}` : ""),
//   ].join("\n");
// };

// // Run your experiment here. Define the user prompt only once.
// const messages: Anthropic.MessageParam[] = [];
// addUserMessage(
//   messages,
//   "What time is it, and what's the weather like in Lisbon, Portugal right now?",
// );

// const response = await runConversation(messages);
// const summary = JSON.parse(textFromMessage(response)) as WeatherSummary;
// console.log(formatSummary(summary));

// // Optional follow-up: uncomment to make another turn using the same history.
// addUserMessage(messages, "And what about Paris, France?");
// const followUp = await runConversation(messages);
// console.log(
//   formatSummary(JSON.parse(textFromMessage(followUp)) as WeatherSummary),
// );
