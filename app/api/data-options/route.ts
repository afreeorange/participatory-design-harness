import { listAvailableTimespans } from "@/lib/persistence";

export async function GET() {
  if (process.env.CI) {
    const { AVAILABLE_TIMESPANS } = await import("@/lib/baked.generated");
    return Response.json(AVAILABLE_TIMESPANS);
  }
  const available = await listAvailableTimespans();
  return Response.json(available);
}
