import { searchThreads } from "@/lib/persistence";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return Response.json([]);
  return Response.json(await searchThreads(q));
}
