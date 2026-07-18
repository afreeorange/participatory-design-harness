import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  type JSONSchema7,
  streamText,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { loadSystemPrompt, loadPatientDataByTimespan } from "@/lib/persistence";
import { DEFAULT_MODEL } from "@/app/constants";
import kleur from "kleur";

export async function POST(req: Request) {
  const {
    messages,
    tools,
    config,
  }: {
    messages: UIMessage[];
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
    config?: { modelName?: string; dataTimespan?: string };
  } = await req.json();

  const dataTimespan = config?.dataTimespan ?? "past_3_months";

  const badge = kleur.bold().white().bgBlue(" LLM ");
  const count = kleur.green(messages.length.toString()) + kleur.green(" messages");
  const model = kleur.bold().green(config?.modelName ?? DEFAULT_MODEL);
  const context = kleur.yellow("Event context set to ") + kleur.bold().yellow(dataTimespan);

  console.log(
    `${badge} ${count} ${kleur.green("→")} ${model} ${kleur.dim(" ⌾ ")} ${context}`,
  );

  const [systemPrompt, patientData] = await Promise.all([
    loadSystemPrompt(),
    loadPatientDataByTimespan(dataTimespan),
  ]);

  const system = [systemPrompt, "--- Patient Data (CSV) ---", patientData].join(
    "\n\n",
  );

  const result = streamText({
    model: openai(config?.modelName ?? DEFAULT_MODEL),
    messages: await convertToModelMessages(messages),
    system,
    tools: {
      ...frontendTools(tools ?? {}),
    },
  });

  return result.toUIMessageStreamResponse({
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });
}
