import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const athlete = {
  height: 180,
  weight: 80,
  goal: "Build muscle",
  restrictions: "No dairy",
};

const prompt = `
Write a concise one-day meal plan for this athlete:

- Height: ${athlete.height} cm
- Weight: ${athlete.weight} kg
- Goal: ${athlete.goal}
- Dietary restrictions: ${athlete.restrictions}

Include:
- Daily calorie total
- Macronutrient breakdown
- Meals with foods, portions, and timing
`;

const response = await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 1000,
  messages: [{ role: "user", content: prompt }],
});

for (const block of response.content) {
  if (block.type === "text") {
    console.log(block.text);
  }
}
