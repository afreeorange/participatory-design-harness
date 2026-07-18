import { getThread, updateThread, deleteThread } from "@/lib/persistence";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) return new Response(null, { status: 404 });
  return Response.json(thread);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patch = (await req.json()) as {
    title?: string;
    status?: "regular" | "archived";
    dataTimespan?: string;
  };
  await updateThread(id, patch);
  return new Response(null, { status: 204 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteThread(id);
  return new Response(null, { status: 204 });
}
