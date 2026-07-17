import { listThreads, createThread } from "@/lib/persistence";
import { generateId } from "ai";

export async function GET() {
  const threads = await listThreads();
  return Response.json(threads);
}

export async function POST() {
  const id = generateId();
  const thread = await createThread(id);
  return Response.json({ id: thread.id });
}
