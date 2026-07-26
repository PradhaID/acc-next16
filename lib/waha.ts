import { getSetting } from "./settings";

export async function sendWhatsAppOtp(phone: string, otp: string): Promise<{ success: boolean; error?: string }> {
  const wahaUrl = await getSetting("waha_url");
  const wahaToken = await getSetting("waha_token");
  const wahaInstance = await getSetting("waha_instance");

  if (!wahaUrl || !wahaToken || !wahaInstance) {
    return { success: false, error: "WhatsApp is not configured. Please contact administrator." };
  }

  const cleanUrl = wahaUrl.replace(/\/+$/, "");
  const digits = phone.replace(/[^\d]/g, "");
  const message = `Your verification code is: *${otp}*\n\nThis code expires in 10 minutes. Do not share it with anyone.`;

  try {
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
      let detail = `WhatsApp API error (${res.status})`;
      try {
        const body = await res.json();
        const msg = body?.exception?.message?.split("\n")[0] || body?.message;
        if (msg) detail += `: ${msg}`;
      } catch {
        // not JSON, ignore
      }
      console.error("WAHA sendText error:", detail);
      return { success: false, error: detail };
    }

    return { success: true };
  } catch (error) {
    console.error("WAHA sendText error:", error);
    return { success: false, error: "Failed to send WhatsApp message." };
  }
}
