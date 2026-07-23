import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { type JSONSchema7, streamText, convertToModelMessages, type UIMessage } from "ai";
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

  const dataTimespan = config?.dataTimespan ?? "all_available";

  const badge = kleur.bold().white().bgBlue(" LLM ");
  const count = kleur.green(messages.length.toString()) + kleur.green(" messages");
  const model = kleur.bold().green(config?.modelName ?? DEFAULT_MODEL);
  const context = kleur.yellow("Event context set to ") + kleur.bold().yellow(dataTimespan);

  console.log(`${badge} ${count} ${kleur.green("→")} ${model} ${kleur.dim(" ⌾ ")} ${context}`);

  let systemPrompt: string;
  let patientData: string | undefined;

  if (dataTimespan === "no") {
    systemPrompt = process.env.CI
      ? (await import("@/lib/baked.generated")).SYSTEM_PROMPT
      : await loadSystemPrompt();
  } else if (process.env.CI) {
    const baked = await import("@/lib/baked.generated");
    systemPrompt = baked.SYSTEM_PROMPT;
    patientData = baked.PATIENT_DATA[dataTimespan] ?? "";
  } else {
    [systemPrompt, patientData] = await Promise.all([
      loadSystemPrompt(),
      loadPatientDataByTimespan(dataTimespan),
    ]);
  }

  const system = patientData
    ? [systemPrompt, "--- Patient Data (CSV) ---", patientData].join("\n\n")
    : systemPrompt;

  const result = streamText({
    model: openai(config?.modelName ?? DEFAULT_MODEL),
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
