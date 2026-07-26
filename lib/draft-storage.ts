const DRAFT_PREFIX = "draft:";
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface DraftData {
  form: Record<string, unknown>;
  savedAt: number;
  type: "post" | "page";
  id?: string;
}

export function saveDraft(type: "post" | "page", id: string | undefined, form: Record<string, unknown>) {
  try {
    const key = `${DRAFT_PREFIX}${type}:${id || "new"}`;
    const data: DraftData = { form, savedAt: Date.now(), type, id };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export function loadDraft(type: "post" | "page", id: string | undefined): DraftData | null {
  try {
    const key = `${DRAFT_PREFIX}${type}:${id || "new"}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data: DraftData = JSON.parse(raw);
    if (Date.now() - data.savedAt > DRAFT_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearDraft(type: "post" | "page", id: string | undefined) {
  try {
    const key = `${DRAFT_PREFIX}${type}:${id || "new"}`;
    localStorage.removeItem(key);
  } catch {}
}

export function getDraftSavedAt(type: "post" | "page", id: string | undefined): number | null {
  try {
    const key = `${DRAFT_PREFIX}${type}:${id || "new"}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data: DraftData = JSON.parse(raw);
    return data.savedAt || null;
  } catch {
    return null;
  }
}
