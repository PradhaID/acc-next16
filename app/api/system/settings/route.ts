import { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getSettings, setSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/lib/models/system/setting";
import { logAction, logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  try {
    const settings = await getSettings();
    return Response.json({ settings, defaults: DEFAULT_SETTINGS });
  } catch (error) {
    await logError(request, "GET", "systemSettings", error, "SETTINGS");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { settings } = body;
    if (!settings || typeof settings !== "object") {
      return Response.json({ error: "Invalid settings" }, { status: 400 });
    }

    await setSettings(settings);
    await logAction({
      userId: session.userId,
      username: session.username,
      action: "UPDATE",
      category: "SETTINGS",
      target: "systemSettings",
      detail: JSON.stringify(Object.keys(settings)),
    });

    return Response.json({ success: true });
  } catch (error) {
    await logError(request, "PUT", "systemSettings", error, "SETTINGS");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
