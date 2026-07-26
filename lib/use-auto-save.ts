"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { saveDraft, loadDraft, clearDraft } from "@/lib/draft-storage";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
  form: T;
  type: "post" | "page";
  id?: string;
  enabled?: boolean;
  onApiSave?: (form: T) => Promise<void>;
}

interface UseAutoSaveReturn {
  status: SaveStatus;
  lastSaved: number | null;
  hasDraft: boolean;
  restoreDraft: () => void;
  dismissDraft: () => void;
  forceSave: () => void;
  errorMessage: string;
}

const LOCAL_STORAGE_DEBOUNCE = 2000;
const API_DEBOUNCE = 30000;

export function useAutoSave<T extends Record<string, unknown>>({
  form,
  type,
  id,
  enabled = true,
  onApiSave,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const formRef = useRef(form);
  const lastFormRef = useRef<string>("");
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled) return;
    const draft = loadDraft(type, id);
    if (draft) {
      setHasDraft(true);
    }
    isInitialMount.current = false;
  }, [type, id, enabled]);

  // Watch for form changes
  useEffect(() => {
    if (!enabled || isInitialMount.current) return;

    const formJson = JSON.stringify(form);
    if (formJson === lastFormRef.current) return;
    lastFormRef.current = formJson;

    setStatus("idle");

    // Debounced localStorage save (2s)
    if (localTimerRef.current) clearTimeout(localTimerRef.current);
    localTimerRef.current = setTimeout(() => {
      saveDraft(type, id, form);
    }, LOCAL_STORAGE_DEBOUNCE);

    // Debounced API save (30s)
    if (onApiSave) {
      if (apiTimerRef.current) clearTimeout(apiTimerRef.current);
      apiTimerRef.current = setTimeout(async () => {
        setStatus("saving");
        try {
          await onApiSave(formRef.current);
          setStatus("saved");
          setLastSaved(Date.now());
          setErrorMessage("");
          clearDraft(type, id);
        } catch (err) {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Auto-save failed");
        }
      }, API_DEBOUNCE);
    }

    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
      if (apiTimerRef.current) clearTimeout(apiTimerRef.current);
    };
  }, [form, type, id, enabled, onApiSave]);

  const restoreDraft = useCallback(() => {
    const draft = loadDraft(type, id);
    if (draft) {
      // The parent component will handle merging the draft form data
      setHasDraft(false);
    }
  }, [type, id]);

  const dismissDraft = useCallback(() => {
    clearDraft(type, id);
    setHasDraft(false);
  }, [type, id]);

  const forceSave = useCallback(async () => {
    if (!onApiSave) return;
    setStatus("saving");
    try {
      await onApiSave(formRef.current);
      setStatus("saved");
      setLastSaved(Date.now());
      setErrorMessage("");
      clearDraft(type, id);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Save failed");
    }
  }, [onApiSave, type, id]);

  return {
    status,
    lastSaved,
    hasDraft,
    restoreDraft,
    dismissDraft,
    forceSave,
    errorMessage,
  };
}
