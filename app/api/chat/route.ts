import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { type JSONSchema7, streamText, convertToModelMessages, type UIMessage } from "ai";
import { loadSystemPrompt, loadPatientData } from "@/lib/persistence";

export async function POST(req: Request) {
  const {
    messages,
    tools,
    config,
  }: {
    messages: UIMessage[];
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
    config?: { modelName?: string };
  } = await req.json();

  console.log("[chat] model=%s messages=%d", config?.modelName ?? "gpt-4o-mini", messages.length);

  const [systemPrompt, patientData] = await Promise.all([loadSystemPrompt(), loadPatientData()]);

  const system = [systemPrompt, "--- Patient Data (CSV) ---", patientData].join("\n\n");

  const result = streamText({
    model: openai(config?.modelName ?? "gpt-4o-mini"),
    messages: await convertToModelMessages(messages),
    system,
    tools: {
      ...frontendTools(tools ?? {}),
    },
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => (error instanceof Error ? error.message : String(error)),
  });
}
