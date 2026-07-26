import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { verifyToken, COOKIE_NAME } from "./auth";
import { broadcastToRole, RECEIVE_SYSTEM_ALERTS_ROLE } from "./notification";
import type { LogLevel, LogCategory } from "./models/system/log";

const NOTIFY_LEVELS: LogLevel[] = ["ERROR", "WARN"];

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function notifyFromLog(options: LogOptions): Promise<void> {
  if (!options.level || !NOTIFY_LEVELS.includes(options.level)) return;

  const type = options.level === "ERROR" ? "ERROR" : "WARN";
  const title = `${formatActionLabel(options.action)} ${options.level === "ERROR" ? "failed" : "warning"}`;
  const message = options.detail || `${options.category || "SYSTEM"} event`;

  await broadcastToRole(RECEIVE_SYSTEM_ALERTS_ROLE, {
    type,
    title,
    message,
    link: "/dashboard/system",
  });
}

interface LogOptions {
  userId: ObjectId | string;
  username: string;
  action: string;
  category?: LogCategory;
  method?: string;
  target?: string;
  detail?: string;
  oldValue?: string;
  newValue?: string;
  ip?: string;
  level?: LogLevel;
}

function extractIp(request?: Request): string | undefined {
  if (!request) return undefined;
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

export async function logAction(options: LogOptions): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("systemLogs").insertOne({
      userId: typeof options.userId === "string" ? new ObjectId(options.userId) : options.userId,
      username: options.username,
      action: options.action,
      category: options.category || "SYSTEM",
      method: options.method,
      target: options.target,
      detail: options.detail,
      oldValue: options.oldValue,
      newValue: options.newValue,
      ip: options.ip,
      level: options.level || "INFO",
      created: { at: new Date() },
    });

    await notifyFromLog(options);
  } catch (error) {
    console.error("Failed to write system log:", error);
  }
}

export async function logError(
  request: Request,
  action: string,
  target: string,
  error: unknown,
  category: LogCategory = "SYSTEM"
): Promise<void> {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
    const token = tokenMatch?.[1];
    const session = token ? await verifyToken(token) : null;

    await logAction({
      userId: session?.userId || "000000000000000000000000",
      username: session?.username || "unknown",
      action,
      category,
      target,
      detail: `Unexpected error: ${error instanceof Error ? error.message : "unknown"}`,
      ip: extractIp(request),
      level: "ERROR",
    });
  } catch {}
}

export async function getSessionFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const tokenMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  const token = tokenMatch?.[1];
  return token ? await verifyToken(token) : null;
}
