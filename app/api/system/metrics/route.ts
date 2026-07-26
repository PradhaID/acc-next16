import { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAMPLE_MS = 100;

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [
    d > 0 ? `${d}d` : "",
    h > 0 ? `${h}h` : "",
    m > 0 ? `${m}m` : "",
    `${s}s`,
  ].filter(Boolean);
  return parts.join(" ");
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const start = process.cpuUsage();
  const startMem = process.memoryUsage();

  await new Promise((resolve) => setTimeout(resolve, SAMPLE_MS));

  const end = process.cpuUsage(start);
  const endMem = process.memoryUsage();

  const elapsedMicros = SAMPLE_MS * 1000;
  const cpuPercent = Math.min(
    100,
    ((end.user + end.system) / elapsedMicros) * 100
  ).toFixed(1);

  const toMb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

  return Response.json({
    cpu: `${cpuPercent}%`,
    cpuRaw: Number(cpuPercent),
    memory: `${toMb(endMem.heapUsed)} / ${toMb(endMem.heapTotal)} MB`,
    memoryUsedMb: Number(toMb(endMem.heapUsed)),
    memoryTotalMb: Number(toMb(endMem.heapTotal)),
    rssMb: Number(toMb(endMem.rss)),
    uptime: formatUptime(process.uptime()),
    uptimeSeconds: Math.floor(process.uptime()),
    startMemoryMb: Number(toMb(startMem.heapUsed)),
  });
}
