"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { FormattedDateTime } from "@/hooks/useTimezone";

interface User {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  timezone?: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => { document.title = "My Profile - AccNext"; }, []);

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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-500">Unable to load profile. <Link href="/dashboard" className="text-indigo-600 hover:underline">Go to Dashboard</Link></p>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title="My Profile"
        subtitle="View your account information"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/account/profile/edit"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              Edit Profile
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm p-6 text-center">
            <div className="h-16 w-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-semibold mx-auto">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mt-4">{user.fullName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-5">Account Information</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</dt>
                <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{user.fullName}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Username</dt>
                <dd className="mt-1 font-mono text-sm font-bold text-gray-700 dark:text-gray-300">{user.username}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</dt>
                <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{user.email}</dd>
              </div>
              {user.groupName && (
                <div>
                  <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Group</dt>
                  <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">{user.groupName}</dd>
                </div>
              )}
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    user.isActive !== false
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.isActive !== false ? "bg-green-500" : "bg-red-500"}`} />
                    {user.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Verified</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    user.emailVerified
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}>
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Timezone</dt>
                <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">{user.timezone || "Asia/Jakarta"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Member Since</dt>
                <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">
                  <FormattedDateTime date={user.created.at} />
                </dd>
                {user.createdByName && (
                  <dd className="text-[10px] text-gray-500 mt-0.5">by {user.createdByName}</dd>
                )}
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Last Updated</dt>
                <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">
                  {user.updated?.at ? <FormattedDateTime date={user.updated.at} /> : "—"}
                </dd>
                {user.updatedByName && (
                  <dd className="text-[10px] text-gray-500 mt-0.5">by {user.updatedByName}</dd>
                )}
              </div>
            </dl>
          </div>

          {/* API Key */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">API Key</h3>
              <button
                onClick={generateApiKey}
                disabled={generating}
                className="text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-xl transition-all"
              >
                {generating ? "Generating..." : apiKey ? "Regenerate" : "Generate"}
              </button>
            </div>
            {successMsg && (
              <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/50 text-green-600 dark:text-green-400 rounded-xl text-[10px] font-bold">
                {successMsg}
              </div>
            )}
            {apiKey ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-300 truncate select-all">
                  {maskApiKey(apiKey)}
                </code>
                <button
                  onClick={copyApiKey}
                  className="flex-shrink-0 p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
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
                Use this key in the <code className="text-indigo-600 dark:text-indigo-400 bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px] font-mono">Authorization: Bearer &lt;key&gt;</code> header.
                See the <Link href="/doc/api/v1" className="text-indigo-600 dark:text-indigo-400 underline font-bold">API documentation</Link> for details.
              </p>
            )}
          </div>

          {user.biography && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">Biography</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{user.biography}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
