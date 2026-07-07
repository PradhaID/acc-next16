"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { FormattedDateTime } from "@/hooks/useTimezone";

interface User {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  groupId: string | null;
  timezone: string;
  biography?: string;
  isActive?: boolean;
  created: { at: string; by: string | null };
  updated: { at: string; by: string | null };
}

const avatarColors = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-violet-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("created") === "true") setSuccessMsg("User created successfully");
    else if (searchParams.get("updated") === "true") setSuccessMsg("User updated successfully");
  }, [searchParams]);

  useEffect(() => { document.title = "User Detail - AccNext"; }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [uRes, gRes] = await Promise.all([
          fetch(`/api/system/users?id=${id}`),
          fetch("/api/system/groups"),
        ]);
        if (!cancelled) {
          setUser(await uRes.json());
          setGroups(await gRes.json());
        }
      } catch {
        //
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const groupName = groups.find((g) => g._id === user.groupId)?.name;

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title="User Detail"
        subtitle={
          <>
            Viewing: <span className="font-bold text-indigo-600">{user.fullName}</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/system/users"
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Back
            </Link>
            <Link
              href={`/system/users/edit/${id}`}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              Edit User
            </Link>
          </div>
        }
      />

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Avatar + Key Info */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm p-6 text-center">
            <div className={`w-20 h-20 rounded-full ${getAvatarColor(user.fullName)} flex items-center justify-center text-white text-3xl font-bold mx-auto`}>
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mt-4">{user.fullName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>

            <div className="mt-6 space-y-3 text-left">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Status</span>
                <span className="font-bold flex items-center gap-1.5">
                  {user.isActive !== false ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span className="text-rose-600 dark:text-rose-400">Inactive</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Verified</span>
                <span className={`font-bold ${user.emailVerified ? "text-emerald-600" : "text-gray-400"}`}>
                  {user.emailVerified ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Group</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{groupName || "None"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Timezone</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{user.timezone || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-5">Account Information</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">User ID</dt>
                <dd className="mt-1 font-mono text-sm font-bold text-gray-700 dark:text-gray-300">{user._id}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Username</dt>
                <dd className="mt-1 font-mono text-sm font-bold text-gray-700 dark:text-gray-300">{user.username}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</dt>
                <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{user.fullName}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</dt>
                <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{user.email}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Group</dt>
                <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">{groupName || "None"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Timezone</dt>
                <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">{user.timezone || "—"}</dd>
              </div>
            </dl>
          </div>

          {user.biography && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">Biography</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{user.biography}</p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-5">Audit Trail</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Created At</dt>
                <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">
                  <FormattedDateTime date={user.created.at} />
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">Updated At</dt>
                <dd className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">
                  {user.updated?.at ? <FormattedDateTime date={user.updated.at} /> : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
