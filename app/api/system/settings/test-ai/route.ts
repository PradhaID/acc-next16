import { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { logAction, logError } from "@/lib/log";

/* ============================================================
   PROVIDER DETECTION & URL NORMALIZATION
   ============================================================ */
type Provider = "ollama" | "anthropic" | "openai-compatible";

function detectProvider(url: string): Provider {
  const lower = url.toLowerCase();
  if (lower.includes("localhost:11434") || lower.includes("127.0.0.1:11434")) return "ollama";
  if (lower.includes("anthropic.com")) return "anthropic";
  return "openai-compatible";
}

/**
 * Normalize the base URL for each provider:
 *  - Ollama:        http://localhost:11434
 *  - Anthropic:     https://api.anthropic.com/v1
 *  - OpenAI-like:   https://api.openai.com/v1  (ensure /v1 suffix)
 */
function normalizeUrl(raw: string, provider: Provider): string {
  let url = raw.replace(/\/+$/, "");
  if (provider === "anthropic") {
    if (!url.endsWith("/v1")) url = url + "/v1";
  }
  return url;
}

/* ============================================================
   BUILD AUTH HEADERS
   ============================================================ */
function buildHeaders(provider: Provider, apiKey: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };

  if (!apiKey) return h;

  if (provider === "anthropic") {
    // Anthropic uses x-api-key header
    h["x-api-key"] = apiKey;
    h["anthropic-version"] = "2023-06-01";
  } else {
    // OpenAI-compatible (OpenAI, OpenRouter, Groq, Together, LM Studio, etc.)
    h["Authorization"] = `Bearer ${apiKey}`;
  }

  return h;
}

/* ============================================================
   FETCH MODELS — tries multiple endpoints per provider
   ============================================================ */
async function tryFetchModels(
  baseUrl: string,
  provider: Provider,
  apiKey: string,
): Promise<string[] | null> {
  const headers = buildHeaders(provider, apiKey);

  // --- Ollama: try native /api/tags first, then OpenAI-compatible /v1/models ---
  if (provider === "ollama") {
    // 1. Ollama native /api/tags
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || []).map((m: any) => m.name).filter(Boolean);
        if (models.length > 0) return models;
      }
    } catch {}

    // 2. Ollama OpenAI-compat /v1/models
    try {
      const res = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        const models = (data.data || []).map((m: any) => m.id).filter(Boolean);
        if (models.length > 0) return models;
      }
    } catch {}

    return null;
  }

  // --- Anthropic: /v1/models ---
  if (provider === "anthropic") {
    try {
      const res = await fetch(`${baseUrl}/models`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        const models = (data.data || []).map((m: any) => m.id).filter(Boolean);
        if (models.length > 0) return models;
      }
    } catch {}
    return null;
  }

  // --- OpenAI-compatible: try /v1/models, then /models ---
  // 1. /v1/models
  try {
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      const models = (data.data || []).map((m: any) => m.id).filter(Boolean);
      if (models.length > 0) return models;
    }
  } catch {}

  // 2. /models (fallback — e.g. if user already included /v1 in the URL)
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      const models = (data.data || []).map((m: any) => m.id).filter(Boolean);
      if (models.length > 0) return models;
    }
  } catch {}

  return null;
}

/* ============================================================
   HANDLER
   ============================================================ */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { ai_url, ai_api_key, ai_model } = body;

    const url = ai_url || await getSetting("ai_url");
    const apiKey = ai_api_key || (await getSetting("ai_api_key")) || "";
    const model = ai_model || await getSetting("ai_model");

    if (!url) {
      return Response.json({ error: "AI API URL is required." }, { status: 400 });
    }

    const provider = detectProvider(url);
    const baseUrl = normalizeUrl(url, provider);

    const models = await tryFetchModels(baseUrl, provider, apiKey);

    if (models === null) {
      const hint =
        provider === "ollama"
          ? "Make sure Ollama is running (ollama serve)."
          : "Check that the URL and API key are correct.";
      await logAction({
        userId: session.userId,
        username: session.username,
        action: "TEST_FAIL",
        category: "SETTINGS",
        target: "ai",
        detail: `Could not connect to AI at ${baseUrl} (provider: ${provider})`,
      });
      return Response.json(
        { error: `Could not connect. ${hint}` },
        { status: 502 },
      );
    }

    if (model && !models.includes(model)) {
      await logAction({
        userId: session.userId,
        username: session.username,
        action: "TEST_FAIL",
        category: "SETTINGS",
        target: "ai",
        detail: `Model "${model}" not found in ${models.length} available models`,
      });
      return Response.json(
        {
          error: `Model "${model}" not found. Available: ${models.slice(0, 10).join(", ")}${models.length > 10 ? "..." : ""}`,
        },
        { status: 400 },
      );
    }

    await logAction({
      userId: session.userId,
      username: session.username,
      action: "TEST_OK",
      category: "SETTINGS",
      target: "ai",
      detail: `Connected to ${provider} at ${baseUrl}, ${models.length} models available${model ? `, model: ${model}` : ""}`,
    });

    return Response.json({ success: true, models, provider });
  } catch (error) {
    await logError(request, "POST", "aiTest", error, "SETTINGS");
    return Response.json(
      { error: "Failed to connect to AI API." },
      { status: 500 },
    );
  }
}
