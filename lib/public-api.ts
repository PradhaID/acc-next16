import { getSetting } from "@/lib/settings";

const NO_INDEX_HEADERS: HeadersInit = { "X-Robots-Tag": "noindex, nofollow" };

export async function isPublicApiEnabled(): Promise<boolean> {
  const val = await getSetting("enable_public_api");
  return val === true || val === "true" || val === "1";
}

export function publicApiDisabled() {
  return Response.json(
    { success: false, error: "Public API is not enabled. Enable it in System Settings." },
    { status: 404, headers: NO_INDEX_HEADERS }
  );
}

export function noIndexJson(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return Response.json(data, { ...init, headers });
}
