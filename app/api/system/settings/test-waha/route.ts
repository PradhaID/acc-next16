import { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { logAction, logError } from "@/lib/log";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { phone, waha_url, waha_token, waha_instance } = body;
    if (!phone || typeof phone !== "string") {
      return Response.json({ error: "Phone number is required" }, { status: 400 });
    }

    const wahaUrl = waha_url || await getSetting("waha_url");
    const wahaToken = waha_token || await getSetting("waha_token");
    const wahaInstance = waha_instance || await getSetting("waha_instance");

    if (!wahaUrl || !wahaToken || !wahaInstance) {
      return Response.json({ error: "WAHA is not fully configured. Please fill all WhatsApp fields first." }, { status: 400 });
    }

    const cleanUrl = wahaUrl.replace(/\/+$/, "");
    const digits = phone.replace(/[^\d]/g, "");
    const message = "This is a test message from your application. If you received this, WhatsApp integration is working correctly.";

    const res = await fetch(`${cleanUrl}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": wahaToken,
      },
      body: JSON.stringify({
        session: wahaInstance,
        chatId: `${digits}@c.us`,
        text: message,
      }),
    });

    if (!res.ok) {
      let detail = `Status ${res.status}`;
      let userError = `WhatsApp API returned ${res.status}`;
      try {
        const body = await res.json();
        const msg = body?.exception?.message?.split("\n")[0] || body?.message;
        if (msg) {
          detail += `: ${msg}`;
          userError += `: ${msg}`;
        }
      } catch {
        // not JSON
      }
      await logAction({
        userId: session.userId,
        username: session.username,
        action: "TEST_FAIL",
        category: "SETTINGS",
        target: "waha",
        detail: detail.slice(0, 200),
      });
      return Response.json({ error: userError }, { status: 502 });
    }

    await logAction({
      userId: session.userId,
      username: session.username,
      action: "TEST_OK",
      category: "SETTINGS",
      target: "waha",
      detail: `Test message sent to ${phone}`,
    });

    return Response.json({ success: true });
  } catch (error) {
    await logError(request, "POST", "wahaTest", error, "SETTINGS");
    return Response.json({ error: "Failed to send test message" }, { status: 500 });
  }
}
