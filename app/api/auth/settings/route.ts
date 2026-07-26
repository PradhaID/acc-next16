import { getSetting } from "@/lib/settings";

export async function GET() {
  const enableSignup = await getSetting("enable_signup");
  const enableWhatsappOtp = await getSetting("enable_whatsapp_otp");
  const wahaUrl = await getSetting("waha_url");
  const wahaToken = await getSetting("waha_token");
  const wahaInstance = await getSetting("waha_instance");
  const wahaConfigured = !!(wahaUrl && wahaUrl.trim() && wahaToken && wahaToken.trim() && wahaInstance && wahaInstance.trim());
  const aiUrl = await getSetting("ai_url");
  const aiApiKey = await getSetting("ai_api_key");
  const aiModel = await getSetting("ai_model");
  const searxngUrl = await getSetting("searxng_url");
  const aiConfigured = !!(aiUrl && aiUrl.trim() && aiModel && aiModel.trim() && searxngUrl && searxngUrl.trim());

  return Response.json({
    enableSignup: enableSignup !== false,
    enableWhatsappOtp: !!enableWhatsappOtp,
    wahaConfigured,
    aiConfigured,
  });
}
