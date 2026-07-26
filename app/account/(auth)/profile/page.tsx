"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import CropModal from "@/components/ui/CropModal";
import { FormattedDateTime } from "@/hooks/useTimezone";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";
import { useT } from "@/components/LanguageProvider";
import { getLocaleLabel } from "@/lib/i18n";

interface User {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  image?: string | null;
  timezone?: string;
  language?: string;
  biography?: string;
  groupName?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  apiKey?: string;
  created: { at: string; by: string | null };
  updated: { at: string; by: string | null };
  createdByName?: string;
  updatedByName?: string;
}

export default function ProfilePage() {
  const t = useT();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpdatePassword = usePermission(ROLES.UPDATE_PASSWORD);
  const canEditProfile = usePermission(ROLES.EDIT_PROFILE);

  useEffect(() => { document.title = `My Profile - ${process.env.NEXT_PUBLIC_APP_NAME || "Boilerplate"}`; }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!cancelled && res.ok) {
          const data = await res.json();
          setUser(data);
          setApiKey(data.apiKey || null);
        }
      } catch {
        //
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCropImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropConfirm = async (offsetX: number, offsetY: number, zoom: number) => {
    if (!pendingFile) return;
    setCropModalOpen(false);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      formData.append("cropX", String(offsetX));
      formData.append("cropY", String(offsetY));
      formData.append("zoom", String(zoom));
      const res = await fetch("/api/account/profile-image", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setUser((prev) => prev ? { ...prev, image: data.image } : prev);
        setImageVersion((v) => v + 1);
        setSuccessMsg("Profile image updated");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const err = await res.json();
        setSuccessMsg(err.error || "Upload failed");
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch {
      setSuccessMsg("Upload failed");
      setTimeout(() => setSuccessMsg(""), 4000);
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setPendingFile(null);
    setCropImageSrc("");
  };

  const handleRemoveImage = async () => {
    if (!confirm("Remove profile image?")) return;
    setUploading(true);
    try {
      const res = await fetch("/api/account/profile-image", { method: "DELETE" });
      if (res.ok) {
        setUser((prev) => prev ? { ...prev, image: null } : prev);
        setImageVersion((v) => v + 1);
        setSuccessMsg("Profile image removed");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch {
      //
    } finally {
      setUploading(false);
    }
  };

  const generateApiKey = async () => {
    setGenerating(true);
    setCopied(false);
    try {
      const res = await fetch("/api/account/api-key", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
        setSuccessMsg("API key generated successfully");
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch {
      //
    } finally {
      setGenerating(false);
    }
  };

  const copyApiKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      //
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.slice(0, 8) + "••••••••" + key.slice(-4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-500">Unable to load profile. <Link href="/dashboard" className="text-emerald-600 hover:underline">Go to Dashboard</Link></p>
      </div>
    );
  }

  const initial = (user.fullName || user.username || "?").charAt(0).toUpperCase();

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title={t("profile.myProfile")}
        subtitle="View your account information"
        actions={
          <div className="flex items-center gap-2">
            {canUpdatePassword && (
              <Link
                href="/account/password"
                className="btn-secondary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                </svg>
                Change Password
              </Link>
            )}
            {canEditProfile && (
              <Link
                href="/account/profile/edit"
                className="btn-primary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                {t("profile.editTitle")}
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm p-8 text-center">
            {/* Avatar with upload */}
            <div className="relative mx-auto w-44 h-44 group">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                className="hidden"
                onChange={handleImageSelect}
              />
              {user.image ? (
                <img
                  src={`${user.image}?v=${imageVersion}`}
                  alt={user.fullName}
                  className="h-44 w-44 rounded-full object-cover ring-4 ring-white dark:ring-stone-900/80 shadow-lg"
                />
              ) : (
                <div className="h-44 w-44 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-500 text-white flex items-center justify-center text-5xl font-extrabold ring-4 ring-white dark:ring-stone-900/80 shadow-lg">
                  {initial}
                </div>
              )}

              {/* Uploading spinner - always visible during upload */}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center z-10">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span className="text-[10px] font-bold text-white mt-1.5">Uploading...</span>
                </div>
              )}

              {/* Hover overlay - hidden during upload */}
              {!uploading && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer"
                >
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                  <span className="text-[10px] font-bold text-white mt-1">
                    {user.image ? "Change" : "Upload"}
                  </span>
                </button>
              )}
            </div>

            {successMsg && (
              <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/50 text-green-600 dark:text-green-400 rounded-xl text-[10px] font-bold">
                {successMsg}
              </div>
            )}

            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mt-4">{user.fullName}</h2>
            <p className="text-sm text-gray-500 dark:text-stone-400">@{user.username}</p>

            {user.image && (
              <button
                onClick={handleRemoveImage}
                disabled={uploading}
                className="mt-3 text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                Remove image
              </button>
            )}

            <Link
              href={`/author/${user._id}`}
              className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              View Public Profile
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-655 mb-5">Account Information</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</dt>
                <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{user.fullName}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.username")}</dt>
                <dd className="mt-1 font-mono text-sm font-bold text-gray-700 dark:text-stone-300">{user.username}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.email")}</dt>
                <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{user.email}</dd>
              </div>
              {user.phone && (
                <div>
                  <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.phone")}</dt>
                  <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{user.phone}</dd>
                </div>
              )}
              {user.groupName && (
                <div>
                  <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.group")}</dt>
                  <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-stone-300">{user.groupName}</dd>
                </div>
              )}
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.status")}</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    user.isActive !== false
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.isActive !== false ? "bg-green-500" : "bg-red-500"}`} />
                    {user.isActive !== false ? t("profile.active") : t("profile.inactive")}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.emailVerified")}</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    user.emailVerified
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}>
                    {user.emailVerified ? t("common.yes") : t("common.no")}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.timezone")}</dt>
                <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-stone-300">{user.timezone || "Asia/Jakarta"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.language")}</dt>
                <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-stone-300">{user.language ? getLocaleLabel(user.language as "en_US" | "id_ID") : "English"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Member Since</dt>
                <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-stone-300">
                  <FormattedDateTime date={user.created.at} />
                </dd>
                {user.createdByName && (
                  <dd className="text-[10px] text-gray-500 mt-0.5">by {user.createdByName}</dd>
                )}
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Last Updated</dt>
                <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-stone-300">
                  {user.updated?.at ? <FormattedDateTime date={user.updated.at} /> : "—"}
                </dd>
                {user.updatedByName && (
                  <dd className="text-[10px] text-gray-500 mt-0.5">by {user.updatedByName}</dd>
                )}
              </div>
            </dl>
          </div>

          {/* API Key */}
          <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-655">API Key</h3>
              <button
                onClick={generateApiKey}
                disabled={generating}
                className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-xl transition-all"
              >
                {generating ? "Generating..." : apiKey ? "Regenerate" : "Generate"}
              </button>
            </div>
            {successMsg && !successMsg.includes("image") && (
              <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/50 text-green-600 dark:text-green-400 rounded-xl text-[10px] font-bold">
                {successMsg}
              </div>
            )}
            {apiKey ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-gray-100 dark:bg-stone-800/40 px-3 py-2 rounded-xl text-gray-700 dark:text-stone-300 truncate select-all">
                  {maskApiKey(apiKey)}
                </code>
                <button
                  onClick={copyApiKey}
                  className="flex-shrink-0 p-2 bg-gray-100 dark:bg-stone-800/40 hover:bg-gray-200 dark:hover:bg-stone-700 rounded-xl transition-colors"
                  title="Copy API key"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                    </svg>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No API key configured. Generate one to access the API.</p>
            )}
            {apiKey && (
              <p className="text-[10px] text-gray-400 mt-2">
                Use this key in the <code className="text-emerald-600 dark:text-emerald-400 bg-gray-100 dark:bg-stone-800/40 px-1 rounded text-[10px] font-mono">Authorization: Bearer &lt;key&gt;</code> header.
                See the <Link href="/doc/api/v1" className="text-emerald-600 dark:text-emerald-400 underline font-bold">API documentation</Link> for details.
              </p>
            )}
          </div>

          {user.biography && (
            <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-655 mb-3">{t("profile.biography")}</h3>
              <p className="text-sm text-gray-700 dark:text-stone-300 whitespace-pre-wrap">{user.biography}</p>
            </div>
          )}
        </div>
      </div>

      <CropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </div>
  );
}
