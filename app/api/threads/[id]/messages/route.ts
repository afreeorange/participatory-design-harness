import { listMessages, appendMessage } from "@/lib/persistence";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const messages = await listMessages(id);
  // return in the shape the history adapter expects: { id, parent_id, format, content }
  return Response.json(
    messages.map((m) => ({
      id: m.id,
      parent_id: m.parentId,
      format: m.format,
      content: m.content,
    })),
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as {
    id: string;
    parent_id: string | null;
    format: string;
    content: unknown;
  };
  await appendMessage(id, {
    id: body.id,
    parentId: body.parent_id,
    format: body.format,
    content: body.content,
  });
  return new Response(null, { status: 204 });
}
