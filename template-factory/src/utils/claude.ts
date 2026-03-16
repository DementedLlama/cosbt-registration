import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

export async function ask(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}

export async function askJson<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const raw = await ask(
    systemPrompt +
      "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown fences, no commentary.",
    userPrompt,
  );

  // Strip markdown fences if the model adds them anyway
  const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "");
  return JSON.parse(cleaned) as T;
}
