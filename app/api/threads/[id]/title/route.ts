import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { updateThread } from "@/lib/persistence";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { messages } = await req.json();

  const snippet = messages
    .slice(0, 4)
    .map((m: { role: string; content: unknown }) => {
      if (typeof m.content === "string") return `${m.role}: ${m.content}`;
      if (Array.isArray(m.content)) {
        const text = m.content
          .filter((p: { type: string }) => p.type === "text")
          .map((p: { text: string }) => p.text)
          .join(" ");
        return `${m.role}: ${text}`;
      }
      return "";
    })
    .join("\n");

  const { text: title } = await generateText({
    model: openai("gpt-4o-mini"),
    system:
      "Generate a short (3-6 word) title for this conversation. Return only the title, nothing else.",
    prompt: snippet,
  });

  const trimmed = title.trim();
  if (!process.env.CI) {
    await updateThread(id, { title: trimmed });
  }

  return Response.json({ title: trimmed });
}
