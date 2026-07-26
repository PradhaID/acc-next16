"use client";

import { useState, useEffect } from "react";
import { useT } from "@/components/LanguageProvider";
import PageHeader from "@/components/ui/PageHeader";
import FormField from "@/components/ui/FormField";
import Toggle from "@/components/ui/Toggle";
import { XMarkIcon, PlusIcon, TagIcon, KeyIcon, Cog6ToothIcon, ShieldCheckIcon, InformationCircleIcon, SparklesIcon, TrashIcon } from "@heroicons/react/24/outline";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { getLocaleLabel } from "@/lib/i18n";

interface SettingDef {
  key: string;
  group: string;
  label: string;
  type: "text" | "textarea" | "boolean" | "number" | "array";
  value: any;
}

export default function SettingsClient() {
  const t = useT();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [defaults, setDefaults] = useState<SettingDef[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [aiFetchingModels, setAiFetchingModels] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/system/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || {};
        const d = data.defaults || [];
        // Ensure keywords/tags are arrays
        if (!Array.isArray(s.app_keywords)) s.app_keywords = typeof s.app_keywords === "string" ? s.app_keywords.split(",").map((k: string) => k.trim()).filter(Boolean) : [];
        if (!Array.isArray(s.app_tags)) s.app_tags = typeof s.app_tags === "string" ? s.app_tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
        setSettings(s);
        setDefaults(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-fetch models when settings load with an existing ai_url
  useEffect(() => {
    if (!loading && settings.ai_url) {
      handleFetchAiModels();
    }
  }, [loading]);

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/system/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  // Keyword helpers
  const addKeyword = () => {
    const val = keywordInput.trim();
    if (val && !settings.app_keywords?.includes(val)) {
      handleChange("app_keywords", [...(settings.app_keywords || []), val]);
      setKeywordInput("");
    }
  };
  const removeKeyword = (kw: string) => {
    handleChange("app_keywords", (settings.app_keywords || []).filter((k: string) => k !== kw));
  };
  const handleKeywordInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.includes(",")) {
      const items = value.split(",").map((t) => t.trim()).filter((t) => t);
      const existing = settings.app_keywords || [];
      const newItems = items.filter((t: string) => !existing.includes(t));
      if (newItems.length) handleChange("app_keywords", [...existing, ...newItems]);
      setKeywordInput("");
    } else {
      setKeywordInput(value);
    }
  };

  // Tag helpers
  const addTag = () => {
    const val = tagInput.trim();
    if (val && !settings.app_tags?.includes(val)) {
      handleChange("app_tags", [...(settings.app_tags || []), val]);
      setTagInput("");
    }
  };
  const removeTag = (tag: string) => {
    handleChange("app_tags", (settings.app_tags || []).filter((t: string) => t !== tag));
  };
  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.includes(",")) {
      const items = value.split(",").map((t) => t.trim()).filter((t) => t);
      const existing = settings.app_tags || [];
      const newItems = items.filter((t: string) => !existing.includes(t));
      if (newItems.length) handleChange("app_tags", [...existing, ...newItems]);
      setTagInput("");
    } else {
      setTagInput(value);
    }
  };

  const wahaConfigured = !!(settings.waha_url && settings.waha_token && settings.waha_instance);
  const aiConfigured = !!(settings.ai_url && settings.ai_model);

  const handleFetchAiModels = async () => {
    if (!settings.ai_url) return;
    setAiFetchingModels(true);
    setAiTestResult(null);
    try {
      const res = await fetch("/api/system/settings/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_url: settings.ai_url,
          ai_api_key: settings.ai_api_key,
          ai_model: "",
        }),
      });
      const data = await res.json();
      if (res.ok && data.models) {
        setAiModels(data.models);
        setAiTestResult({ ok: true, msg: `${data.models.length} models available` });
      } else {
        setAiTestResult({ ok: false, msg: data.error || "Failed to fetch models" });
      }
    } catch {
      setAiTestResult({ ok: false, msg: "Network error" });
    } finally {
      setAiFetchingModels(false);
    }
  };

  const handleTestAi = async () => {
    if (!settings.ai_url || !settings.ai_model) return;
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await fetch("/api/system/settings/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_url: settings.ai_url,
          ai_api_key: settings.ai_api_key,
          ai_model: settings.ai_model,
        }),
      });
      const data = await res.json();
      if (res.ok && data.models) {
        setAiModels(data.models);
        setAiTestResult({ ok: true, msg: "Connected! Model verified." });
      } else {
        setAiTestResult({ ok: false, msg: data.error || "Connection failed" });
      }
    } catch {
      setAiTestResult({ ok: false, msg: "Network error" });
    } finally {
      setAiTesting(false);
    }
  };

  const handleTestWaha = async () => {
    if (!testPhone.trim()) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/system/settings/test-waha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone.trim(),
          waha_url: settings.waha_url,
          waha_token: settings.waha_token,
          waha_instance: settings.waha_instance,
        }),
      });
      const data = await res.json();
      setTestResult(res.ok ? { ok: true, msg: "Test message sent successfully!" } : { ok: false, msg: data.error || "Failed" });
    } catch {
      setTestResult({ ok: false, msg: "Network error" });
    } finally {
      setTestSending(false);
    }
  };

  // Group settings by group, separate array types into own cards
  const appSettings = defaults.filter((d) => d.group === "app" && d.type !== "array" && d.key !== "default_locale");
  const featureSettings = defaults.filter((d) => d.group === "features");
  const wahaSettings = defaults.filter((d) => d.group === "waha");
  const aiSettings = defaults.filter((d) => d.group === "ai");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-action-primary">
              {saving ? t("common.loading") : saved ? t("settings.saved") : t("settings.save")}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column — form */}
        <div className="lg:col-span-3 space-y-6">
          {/* Application Info */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-stone-700/50 dark:bg-stone-900/80 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-stone-700/50 dark:bg-stone-800/40">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                <Cog6ToothIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("settings.appInfo")}</h2>
                <p className="text-[10px] text-gray-400 font-medium">{t("settings.appInfoDesc")}</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {appSettings.map((item) => (
                <FormField key={item.key} label={item.label}>
                  {item.type === "textarea" ? (
                    <textarea
                      value={settings[item.key] ?? item.value ?? ""}
                      onChange={(e) => handleChange(item.key, e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 resize-none transition-colors"
                    />
                  ) : (
                    <input
                      type={item.type === "number" ? "number" : "text"}
                      value={settings[item.key] ?? item.value ?? ""}
                      onChange={(e) => handleChange(item.key, item.type === "number" ? Number(e.target.value) : e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                    />
                  )}
                </FormField>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-stone-700/50 dark:bg-stone-900/80 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-stone-700/50 dark:bg-stone-800/40">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                <ShieldCheckIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("settings.features")}</h2>
                <p className="text-[10px] text-gray-400 font-medium">{t("settings.featuresDesc")}</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-stone-700/30">
              {featureSettings.map((item) => {
                const isWahaToggle = item.key === "enable_whatsapp_otp";
                const disabled = isWahaToggle && !wahaConfigured;
                return (
                  <div key={item.key} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{item.label}</p>
                        <p className="text-xs text-gray-400 dark:text-stone-500 mt-0.5 font-mono">{item.key}</p>
                        {isWahaToggle && !wahaConfigured && (
                          <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1 font-medium">
                            Fill in all WAHA fields below first to enable this.
                          </p>
                        )}
                      </div>
                      <Toggle
                        checked={!!settings[item.key]}
                        onChange={(e) => {
                          if (disabled) return;
                          handleChange(item.key, (e.target as HTMLInputElement).checked);
                        }}
                          label={settings[item.key] ? t("settings.enabled") : t("settings.disabled")}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WhatsApp (WAHA) */}
          {wahaSettings.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-stone-700/50 dark:bg-stone-900/80 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-stone-700/50 dark:bg-stone-800/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("settings.whatsapp")}</h2>
                  <p className="text-[10px] text-gray-400 font-medium">{t("settings.whatsappDesc")}</p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                {wahaSettings.map((item) => (
                  <FormField key={item.key} label={item.label}>
                    <input
                      type="text"
                      value={settings[item.key] ?? item.value ?? ""}
                      onChange={(e) => handleChange(item.key, e.target.value)}
                      placeholder={item.key.includes("token") ? "Enter API token" : item.key.includes("url") ? "https://waha.example.com" : "Instance name"}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                    />
                  </FormField>
                ))}

                {/* Test WAHA */}
                <div className="border-t border-gray-100 dark:border-stone-700/50 pt-5">
                  <p className="text-xs font-bold text-gray-900 dark:text-white mb-1">{t("settings.sendTest")}</p>
                  <p className="text-[10px] text-gray-400 dark:text-stone-500 mb-3">
                    {wahaConfigured
                      ? "Send a test WhatsApp message to verify the connection."
                      : "Complete all WAHA fields above to enable testing."}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={testPhone}
                      onChange={(e) => { setTestPhone(e.target.value); setTestResult(null); }}
                      placeholder="e.g. 6281234567890"
                      disabled={!wahaConfigured || testSending}
                      className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={handleTestWaha}
                      disabled={!wahaConfigured || testSending || !testPhone.trim()}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 hover:from-amber-600 hover:to-orange-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testSending ? (
                        <span className="flex items-center gap-1.5">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          {t("settings.sending")}
                        </span>
                      ) : "Send"}
                    </button>
                  </div>
                  {testResult && (
                    <p className={`mt-2 text-[11px] font-medium ${testResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                      {testResult.msg}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Model */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-stone-700/50 dark:bg-stone-900/80 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-stone-700/50 dark:bg-stone-800/40">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("settings.ai")}</h2>
                <p className="text-[10px] text-gray-400 font-medium">{t("settings.aiDesc")}</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <FormField label={t("settings.aiApiUrl")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={settings.ai_url || ""}
                    onChange={(e) => handleChange("ai_url", e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  />
                  <input
                    type="password"
                    value={settings.ai_api_key || ""}
                    onChange={(e) => handleChange("ai_api_key", e.target.value)}
                    placeholder={t("settings.aiApiKey") + " (sk-...)"}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-stone-500 mt-1.5 leading-relaxed">
                  OpenAI: <code className="bg-gray-100 dark:bg-stone-800 px-1 rounded">https://api.openai.com/v1</code> &middot; Claude: <code className="bg-gray-100 dark:bg-stone-800 px-1 rounded">https://api.anthropic.com</code> &middot; Ollama: <code className="bg-gray-100 dark:bg-stone-800 px-1 rounded">http://localhost:11434</code>
                </p>
              </FormField>
              <FormField label={t("settings.aiModel")}>
                <div className="flex gap-2">
                  <select
                    value={settings.ai_model || ""}
                    onChange={(e) => handleChange("ai_model", e.target.value)}
                    disabled={aiModels.length === 0}
                    className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{t("settings.aiModelPlaceholder")}</option>
                    {aiModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleFetchAiModels}
                    disabled={!settings.ai_url || aiFetchingModels}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-stone-700 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {aiFetchingModels ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                        {t("settings.fetchingModels")}
                      </span>
                    ) : t("settings.fetchModels")}
                  </button>
                </div>
              </FormField>
              <FormField label="SearXNG">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={settings.searxng_url || ""}
                    onChange={(e) => handleChange("searxng_url", e.target.value)}
                    placeholder="URL — http://localhost:8888"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  />
                  <input
                    type="password"
                    value={settings.searxng_api_key || ""}
                    onChange={(e) => handleChange("searxng_api_key", e.target.value)}
                    placeholder={t("settings.aiApiKey") + " (optional)"}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-stone-500 mt-1.5">
                  Required for Generate AI. API key sent as <code className="bg-gray-100 dark:bg-stone-800 px-1 rounded">?token=xxx</code>.
                </p>
              </FormField>
              <FormField label="Gemini API Key">
                <input
                  type="password"
                  value={settings.gemini_api_key || ""}
                  onChange={(e) => handleChange("gemini_api_key", e.target.value)}
                  placeholder="AIza... (for AI image generation)"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                />
                <p className="text-[10px] text-gray-400 dark:text-stone-500 mt-1.5">
                  Used for AI-powered features like image generation. Get a free key at <code className="bg-gray-100 dark:bg-stone-800 px-1 rounded">aistudio.google.com</code>.
                </p>
              </FormField>

              {/* Connect & Test */}
              <div className="border-t border-gray-100 dark:border-stone-700/50 pt-5">
                <p className="text-xs font-bold text-gray-900 dark:text-white mb-1">{t("settings.connectTest")}</p>
                <p className="text-[10px] text-gray-400 dark:text-stone-500 mb-3">
                  {settings.ai_url && settings.ai_model
                    ? "Test the connection and verify your AI model is working."
                    : "Fill in URL and select a model above to enable testing."}
                </p>
                <button
                  type="button"
                  onClick={handleTestAi}
                  disabled={!settings.ai_url || !settings.ai_model || aiTesting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 hover:from-amber-600 hover:to-orange-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {aiTesting ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {t("settings.connecting")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <SparklesIcon className="w-3.5 h-3.5" />
                      {t("settings.connectTest")}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleChange("ai_url", "");
                    handleChange("ai_api_key", "");
                    handleChange("ai_model", "");
                    setAiModels([]);
                    setAiTestResult(null);
                  }}
                  className="ml-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95 transition-all"
                >
                  <TrashIcon className="w-3.5 h-3.5 inline-block" />
                </button>
                {aiTestResult && (
                  <p className={`mt-2 text-[11px] font-medium ${aiTestResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {aiTestResult.msg}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-stone-700/50 dark:bg-stone-900/80 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-stone-700/50 dark:bg-stone-800/40">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                <KeyIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("settings.keywords")}</h2>
                <p className="text-[10px] text-gray-400 font-medium">{t("settings.keywordsDesc")}</p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={handleKeywordInput}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                  placeholder={t("settings.addKeyword")}
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-stone-700 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-stone-600 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[20px]">
                {(settings.app_keywords || []).length > 0 ? (
                  (settings.app_keywords || []).map((kw: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-md border border-emerald-100 dark:border-emerald-800"
                    >
                      #{kw}
                      <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-red-500 transition-colors">
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-400 italic">{t("settings.noKeywords")}</p>
                 )}
              </div>
              <p className="text-[10px] text-gray-400">{t("settings.tipComma")}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-stone-700/50 dark:bg-stone-900/80 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-stone-700/50 dark:bg-stone-800/40">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                <TagIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("settings.tags")}</h2>
                <p className="text-[10px] text-gray-400 font-medium">{t("settings.tagsDesc")}</p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={handleTagInput}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add tag (press Enter)..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-stone-700 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-stone-600 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[20px]">
                {(settings.app_tags || []).length > 0 ? (
                  (settings.app_tags || []).map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-md border border-emerald-100 dark:border-emerald-800"
                    >
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-400 italic">{t("settings.noTags")}</p>
                 )}
              </div>
              <p className="text-[10px] text-gray-400">{t("settings.tipComma")}</p>
            </div>
          </div>

          {/* Default Language */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-stone-700/50 dark:bg-stone-900/80 overflow-hidden">
            <div className="p-6">
              <FormField label={t("settings.defaultLanguage")} required>
                <select
                  name="default_locale"
                  value={settings.default_locale || "id_ID"}
                  onChange={(e) => handleChange("default_locale", e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-stone-800/40 border border-gray-300 dark:border-stone-600 rounded-lg text-sm text-gray-900 dark:text-white appearance-none cursor-pointer outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-colors"
                >
                  {SUPPORTED_LOCALES.map(loc => (
                    <option key={loc} value={loc}>{getLocaleLabel(loc as "en_US" | "id_ID")}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>
        </div>

        {/* Right column — info sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900/80 p-4 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-3 flex items-center gap-1.5">
              <InformationCircleIcon className="w-3.5 h-3.5" /> {t("settings.overview")}
            </h3>
            <div className="space-y-3 text-[11px]">
              <div className="py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-stone-800/40">
                <span className="text-gray-400 font-bold block mb-1">{t("settings.appName")}</span>
                <span className="font-bold text-gray-700 dark:text-stone-300">{settings.app_name || "Not set"}</span>
              </div>
              <div className="py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-stone-800/40">
                <span className="text-gray-400 font-bold block mb-1">{t("settings.appUrl")}</span>
                <span className="font-bold text-gray-700 dark:text-stone-300 break-all">{settings.app_url || "Not set"}</span>
              </div>
              <div className="py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-stone-800/40">
                <span className="text-gray-400 font-bold block mb-1">{t("settings.titleLabel")}</span>
                <span className="font-bold text-gray-700 dark:text-stone-300">{settings.app_title || "Not set"}</span>
              </div>
              <div className="py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-stone-800/40">
                <span className="text-gray-400 font-bold block mb-1">{t("settings.keywords")}</span>
                <span className="font-bold text-gray-700 dark:text-stone-300">{(settings.app_keywords || []).length} added</span>
              </div>
              <div className="py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-stone-800/40">
                <span className="text-gray-400 font-bold block mb-1">{t("settings.tags")}</span>
                <span className="font-bold text-gray-700 dark:text-stone-300">{(settings.app_tags || []).length} added</span>
              </div>
              <div className="py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-stone-800/40">
                <span className="text-gray-400 font-bold block mb-1">{t("settings.defaultLanguage")}</span>
                <span className="font-bold text-gray-700 dark:text-stone-300">
                  {getLocaleLabel((settings.default_locale || "id_ID") as "en_US" | "id_ID")}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900/80 p-4 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-3 flex items-center gap-1.5">
              <InformationCircleIcon className="w-3.5 h-3.5" /> {t("settings.howItWorks")}
            </h3>
            <div className="text-[11px] text-gray-500 space-y-2">
              <p><strong className="text-gray-700 dark:text-stone-300">{t("settings.appInfo")}</strong> — basic details used across the app (titles, slogans, descriptions).</p>
              <p><strong className="text-gray-700 dark:text-stone-300">{t("settings.features")}</strong> — toggle major features on or off for all users.</p>
              <p><strong className="text-gray-700 dark:text-stone-300">{t("settings.keywords")} &amp; {t("settings.tags")}</strong> — primary SEO keywords and content tags used in metadata and sitemaps.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900/80 p-4 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm text-xs">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-3 flex items-center gap-1.5">
              <InformationCircleIcon className="w-3.5 h-3.5" /> {t("settings.status")}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-stone-800/40">
                <div className={`w-2 h-2 rounded-full ${settings.enable_signup ? "bg-emerald-500" : "bg-gray-300"}`} />
                <span className="text-gray-600 dark:text-stone-400">{t("settings.signUp")} {settings.enable_signup ? t("settings.enabled") : t("settings.disabled")}</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-stone-800/40">
                <div className={`w-2 h-2 rounded-full ${settings.enable_public_api ? "bg-emerald-500" : "bg-gray-300"}`} />
                <span className="text-gray-600 dark:text-stone-400">{t("settings.publicApi")} {settings.enable_public_api ? t("settings.enabled") : t("settings.disabled")}</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-stone-800/40">
                <div className={`w-2 h-2 rounded-full ${settings.enable_email_verification ? "bg-emerald-500" : "bg-gray-300"}`} />
                <span className="text-gray-600 dark:text-stone-400">{t("settings.emailVerification")} {settings.enable_email_verification ? t("settings.required") : t("settings.off")}</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-stone-800/40">
                <div className={`w-2 h-2 rounded-full ${settings.enable_whatsapp_otp ? "bg-emerald-500" : "bg-gray-300"}`} />
                <span className="text-gray-600 dark:text-stone-400">{t("settings.whatsappOtp")} {settings.enable_whatsapp_otp ? t("settings.enabled") : t("settings.disabled")}</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-stone-800/40">
                <div className={`w-2 h-2 rounded-full ${aiConfigured ? "bg-violet-500" : "bg-gray-300"}`} />
                <span className="text-gray-600 dark:text-stone-400">{t("settings.aiConfigured")} {aiConfigured ? t("settings.enabled") : t("settings.disabled")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}