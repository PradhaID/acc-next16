"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import FormField from "@/components/ui/FormField";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((res) => {
      if (res.status === 401) router.replace("/account/signin");
      else setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title="Change Password"
        subtitle="Update your account password"
      />

      <form id="password-change-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Current Password" required>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter current password"
                  required
                />
              </FormField>

              <FormField label="New Password" required>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter new password"
                  required
                />
              </FormField>

              <FormField label="Confirm New Password" required>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Confirm new password"
                  required
                />
              </FormField>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              Password Requirements
            </h3>
            <ul className="space-y-1.5 text-xs text-gray-500 list-disc list-inside leading-relaxed">
              <li>Minimum 6 characters</li>
              <li>Must match confirmation</li>
              <li>Password is hashed with bcrypt</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm text-xs">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              Need Help?
            </h3>
            <p className="text-gray-500 leading-relaxed italic">
              Contact your system administrator if you are unable to change your password.
            </p>
          </div>

          <button
            type="submit"
            form="password-change-form"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
