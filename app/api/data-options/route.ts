import { listAvailableTimespans } from "@/lib/persistence";

export async function GET() {
  const available = await listAvailableTimespans();
  return Response.json(available);
}
