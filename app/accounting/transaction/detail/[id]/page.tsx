"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { formatNumber } from "@/lib/format";
import { useFormatDateInTimezone, FormattedDateTime } from "@/hooks/useTimezone";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";

interface EvidenceItem {
  url: string;
  description?: string;
}

function urlPath(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}

interface LineItem {
  _id: string;
  account: string | { _id: string; number: string; name: string };
  position: "Db" | "Cr";
  amount: number;
}

interface TransactionDetail {
  _id: string;
  code: string;
  effectiveDate: string;
  reference: string;
  information: string;
  amount: number;
  evidence: EvidenceItem[];
  status: "Pending" | "Confirmed" | "Rejected" | "Reversed" | "Canceled";
  created: { at: string; by: string | null };
  updated: { at: string; by: string | null };
  confirmed?: { at: string; by: string | null };
  rejected?: { at: string; by: string | null };
  reversed?: { at: string; by: string | null };
  details: LineItem[];
}

interface AccountInfo {
  _id: string;
  number: string;
  name: string;
}

const codePrefixMap: Record<string, string> = {
  GJ: "General Journal",
  FT: "Fund Transfer",
  EX: "Expense",
  RV: "Revenue",
  PC: "Purchase",
  SL: "Sales",
  PR: "Payroll",
  TX: "Tax",
  DP: "Depreciation",
  CE: "Closing",
};

function decodeType(code: string): string {
  const prefix = code.split("-")[0];
  return codePrefixMap[prefix] || prefix || "General Journal";
}

const statusColors: Record<string, string> = {
  Pending: "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400",
  Confirmed: "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400",
  Rejected: "bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400",
  Reversed: "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400",
  Canceled: "bg-gray-50 border-gray-100 text-gray-400 dark:bg-gray-800/30 dark:border-gray-700 dark:text-gray-500",
};

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatDate } = useFormatDateInTimezone();

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [accounts, setAccounts] = useState<Map<string, AccountInfo>>(new Map());
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");

  const canEditTransaction = usePermission(ROLES.EDIT_TRANSACTION);
  const canConfirmTransaction = usePermission(ROLES.CONFIRM_TRANSACTION);

  useEffect(() => { document.title = "Transaction Detail - AccNext"; }, []);

  useEffect(() => {
    const msg = searchParams.get("created") ? "Transaction has been created successfully." : searchParams.get("updated") ? "Transaction has been updated successfully." : "";
    if (msg) {
      setSuccessBanner(msg);
      const url = new URL(window.location.href);
      url.searchParams.delete("created");
      url.searchParams.delete("updated");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/accounting/transaction?id=${id}&includeDetails=true`),
      fetch("/api/accounting/account?all=true"),
      fetch("/api/system/users"),
    ])
      .then(async ([txnRes, accRes, usersRes]) => {
        const txn: TransactionDetail = await txnRes.json();
        const accList: AccountInfo[] = await accRes.json();
        const usersList: { _id: string; username: string; fullName: string }[] = await usersRes.json();
        if (cancelled) return;
        setTransaction(txn);
        setAccounts(new Map(accList.map((a) => [a._id, a])));
        setUsersMap(new Map(usersList.map((u) => [u._id, u.fullName || u.username])));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const refetch = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/accounting/transaction?id=${id}&includeDetails=true`),
      fetch("/api/accounting/account?all=true"),
      fetch("/api/system/users"),
    ])
      .then(async ([txnRes, accRes, usersRes]) => {
        const txn: TransactionDetail = await txnRes.json();
        const accList: AccountInfo[] = await accRes.json();
        const usersList: { _id: string; username: string; fullName: string }[] = await usersRes.json();
        setTransaction(txn);
        setAccounts(new Map(accList.map((a) => [a._id, a])));
        setUsersMap(new Map(usersList.map((u) => [u._id, u.fullName || u.username])));
        setErrorMsg("");
      })
      .catch(() => setErrorMsg("Failed to reload transaction"))
      .finally(() => setLoading(false));
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/accounting/transaction?id=${id}&action=confirm`, { method: "DELETE" });
      if (res.ok) { setShowConfirmModal(false); refetch(); }
      else { const d = await res.json(); setErrorMsg(d.error || "Failed to confirm"); setShowConfirmModal(false); }
    } catch { setErrorMsg("Connection error"); setShowConfirmModal(false); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/accounting/transaction?id=${id}`, { method: "DELETE" });
      if (res.ok) { setShowDeleteModal(false); router.push("/accounting/transaction"); }
      else { const d = await res.json(); setErrorMsg(d.error || "Failed to delete"); setShowDeleteModal(false); }
    } catch { setErrorMsg("Connection error"); setShowDeleteModal(false); }
    finally { setActionLoading(false); }
  };

  const handleDeleteEvidence = async (url: string) => {
    try {
      const res = await fetch(`/api/accounting/transaction/evidence?transactionId=${id}&url=${encodeURIComponent(url)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        refetch();
        setSuccessBanner("Evidence removed.");
      } else {
        const d = await res.json();
        setErrorMsg(d.error || "Failed to remove");
      }
    } catch {
      setErrorMsg("Failed to remove evidence");
    }
  };

  const totals = (transaction?.details || []).reduce(
    (acc, line) => {
      if (line.position === "Db") acc.debit += line.amount;
      else acc.credit += line.amount;
      return acc;
    },
    { debit: 0, credit: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 font-medium">Transaction not found.</p>
        <Link href="/accounting/transaction" className="mt-4 inline-block text-indigo-600 font-bold hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className={`max-w-full mx-auto space-y-6 pb-10${transaction?.status === "Canceled" ? " opacity-50" : ""}`}>
        {successBanner && (
          <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-emerald-700 dark:text-emerald-300 text-sm font-bold">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            {successBanner}
            <button onClick={() => setSuccessBanner("")} className="ml-auto text-emerald-400 hover:text-emerald-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-3 px-5 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl text-red-700 dark:text-red-300 text-sm font-bold">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            {errorMsg}
            <button onClick={() => setErrorMsg("")} className="ml-auto text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/accounting/transaction"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                  {transaction.code}
                </h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusColors[transaction.status] || ""}`}>
                  {transaction.status}
                </span>
                {transaction.reversed?.at && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">
                    REVERSED
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 font-medium mt-1">
                Ref: {transaction.reference || "None"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {transaction.status === "Pending" && (
              <>
                {canEditTransaction && (
                  <Link
                    href={`/accounting/transaction/edit/${id}`}
                    className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                    Edit
                  </Link>
                )}
                {canEditTransaction && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    disabled={actionLoading}
                    className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    Delete
                  </button>
                )}
                {canConfirmTransaction && (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={actionLoading}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Confirm
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Metadata */}
          <div className="space-y-6">
            {/* Info card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm divide-y divide-gray-100 dark:divide-gray-800/50">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(transaction.effectiveDate)}</span>
              </div>
              <div className="px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Information</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {transaction.information || <span className="text-gray-400 italic">No additional description.</span>}
                </p>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Type</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{decodeType(transaction.code)}</span>
              </div>
            </div>

            {/* Evidence */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800/50">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  Evidence
                </h3>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {transaction.evidence?.length || 0}
                </span>
              </div>
              <div className="p-4">

              {transaction.evidence && transaction.evidence.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {transaction.evidence.map((item: EvidenceItem, index: number) => {
                    const isPdf = urlPath(item.url).toLowerCase().endsWith(".pdf");
                    return (
                      <div key={index} className="group relative rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 aspect-square">
                        {isPdf ? (
                          <div
                            className="w-full h-full flex flex-col items-center justify-center gap-1 p-3 cursor-pointer"
                            onClick={() => { setViewerUrl(item.url); setShowViewerModal(true); }}
                          >
                            <svg className="w-10 h-10 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
                              <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375h1.875a5.23 5.23 0 0 1 3.434 1.279 9.039 9.039 0 0 0-6.963-6.963Z" fill="red" />
                            </svg>
                            <span className="text-[9px] text-gray-700 dark:text-gray-300 font-bold text-center leading-tight truncate w-full">{item.url.split("/").pop()}</span>
                            {item.description && (
                              <span className="text-[8px] text-gray-500 dark:text-gray-400 text-center leading-tight truncate w-full">{item.description}</span>
                            )}
                            <span className="text-[7px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">PDF</span>
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const t = e.currentTarget;
                              if (t.dataset.fallback) return;
                              t.dataset.fallback = "1";
                              t.style.display = "none";
                              const fb = t.parentElement!.querySelector(".img-fallback") as HTMLElement;
                              if (fb) fb.style.display = "flex";
                            }}
                          />
                        )}
                        <div className="img-fallback absolute inset-0 flex flex-col items-center justify-center gap-1 p-3" style={{ display: "none" }}>
                          <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                          </svg>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium text-center leading-tight truncate w-full">{item.url.split("/").pop()}</span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setViewerUrl(item.url); setShowViewerModal(true); }}
                            className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteEvidence(item.url)}
                            className="p-2 bg-red-500/80 backdrop-blur-md rounded-lg text-white hover:bg-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                  <svg className="w-6 h-6 text-gray-200 dark:text-gray-700 mx-auto mb-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No evidence uploaded</p>
                </div>
              )}
              </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800/50">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Audit Trail</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                <div className="flex justify-between items-start px-4 py-3">
                  <span className="text-xs font-bold text-gray-500">Created</span>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300"><FormattedDateTime date={transaction.created?.at} /></p>
                    {transaction.created?.by && (
                      <p className="text-[10px] text-gray-400">{usersMap.get(transaction.created.by) || "—"}</p>
                    )}
                  </div>
                </div>
                {transaction.updated?.at && (
                  <div className="flex justify-between items-start px-4 py-3">
                    <span className="text-xs font-bold text-gray-500">Updated</span>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300"><FormattedDateTime date={transaction.updated.at} /></p>
                      {transaction.updated?.by && (
                        <p className="text-[10px] text-gray-400">{usersMap.get(transaction.updated.by) || "—"}</p>
                      )}
                    </div>
                  </div>
                )}
                {transaction.confirmed?.at && (
                  <div className="flex justify-between items-start px-4 py-3">
                    <span className="text-xs font-bold text-emerald-600">Confirmed</span>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-emerald-600"><FormattedDateTime date={transaction.confirmed.at} /></p>
                      {transaction.confirmed?.by && (
                        <p className="text-[10px] text-emerald-500">{usersMap.get(transaction.confirmed.by) || "—"}</p>
                      )}
                    </div>
                  </div>
                )}
                {transaction.rejected?.at && (
                  <div className="flex justify-between items-start px-4 py-3">
                    <span className="text-xs font-bold text-red-600">Rejected</span>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-red-600"><FormattedDateTime date={transaction.rejected.at} /></p>
                      {transaction.rejected?.by && (
                        <p className="text-[10px] text-red-500">{usersMap.get(transaction.rejected.by) || "—"}</p>
                      )}
                    </div>
                  </div>
                )}
                {transaction.reversed?.at && (
                  <div className="flex justify-between items-start px-4 py-3">
                    <span className="text-xs font-bold text-orange-600">Reversed</span>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-orange-600"><FormattedDateTime date={transaction.reversed.at} /></p>
                      {transaction.reversed?.by && (
                        <p className="text-[10px] text-orange-500">{usersMap.get(transaction.reversed.by) || "—"}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Journal Lines */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
              <div className="p-3 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  Journal Lines
                </h3>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-gray-400">{formatNumber(transaction.amount)}</p>
                </div>
              </div>

              {totals.debit !== totals.credit && (
                <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900">
                  <p className="text-[10px] font-bold text-red-600 flex items-center gap-2">
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    Warning: Journal is out of balance! Debit vs Credit
                  </p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-black uppercase text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <th className="px-4 py-2">Account</th>
                      <th className="px-4 py-2 text-right">Debit</th>
                      <th className="px-4 py-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {transaction.details.map((item, i) => {
                      const acc = typeof item.account === "string" ? accounts.get(item.account) : item.account;
                      return (
                        <tr key={item._id || i} className="text-xs hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-2">
                            <p className="font-bold text-gray-900 dark:text-gray-100 leading-tight">{acc?.number || "—"}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-tight">{acc?.name || "Unknown Account"}</p>
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-emerald-600">
                            {item.position === "Db" ? formatNumber(item.amount) : "-"}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-orange-600">
                            {item.position === "Cr" ? formatNumber(item.amount) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50/30 dark:bg-gray-800/20 font-bold border-t border-gray-200 dark:border-gray-700">
                    <tr>
                      <td className="px-4 py-2 text-[9px] uppercase text-gray-400 tracking-widest">Trial Balance</td>
                      <td className={`px-4 py-2 text-right ${totals.debit !== totals.credit ? "text-red-600" : "text-emerald-600"}`}>
                        {formatNumber(totals.debit)}
                      </td>
                      <td className={`px-4 py-2 text-right ${totals.debit !== totals.credit ? "text-red-600" : "text-orange-600"}`}>
                        {formatNumber(totals.credit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Confirm */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Confirm Transaction?</h3>
            <p className="text-gray-500 text-sm mb-8">This will update account balances and commit the double-entry journal permanently.</p>
            <div className="flex gap-3">
              <button onClick={handleConfirm} disabled={actionLoading} className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
                {actionLoading ? "Processing..." : "Yes, Confirm"}
              </button>
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95 text-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Delete Permanently?</h3>
            <p className="text-gray-500 text-sm mb-8">This action is permanent and cannot be undone. Are you sure you want to delete this journal?</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={actionLoading} className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-bold hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50">
                {actionLoading ? "Deleting..." : "Delete Now"}
              </button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95 text-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Viewer */}
      {showViewerModal && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 lg:p-10">
          <div className="absolute inset-0" onClick={() => setShowViewerModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl w-full max-w-5xl h-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Evidence Viewer
              </h3>
              <button onClick={() => setShowViewerModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                <svg className="w-6 h-6 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 bg-gray-50 dark:bg-black/20 overflow-auto p-4 flex items-center justify-center">
              {viewerUrl && urlPath(viewerUrl).toLowerCase().endsWith(".pdf") ? (
                <object data={viewerUrl} type="application/pdf" className="w-full h-full rounded-xl border border-gray-200 dark:border-gray-800">
                  <embed src={viewerUrl} type="application/pdf" className="w-full h-full rounded-xl" />
                </object>
              ) : (
                <img
                  src={viewerUrl}
                  alt="Evidence"
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-xl"
                  onError={(e) => {
                    const t = e.currentTarget;
                    if (t.dataset.fallback) return;
                    t.dataset.fallback = "1";
                    t.style.display = "none";
                    const parent = t.parentElement;
                    if (parent) {
                      const fallback = parent.querySelector(".viewer-fallback") as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }
                  }}
                />
              )}
              <div className="viewer-fallback flex-col items-center justify-center gap-3 p-8 text-center" style={{ display: "none" }}>
                <svg className="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                <p className="text-sm text-gray-400 font-medium">Preview not available</p>
                <a href={viewerUrl} download className="px-6 py-2 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 transition-all">
                  Download file
                </a>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <a
                href={viewerUrl}
                download
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Download Original
              </a>
              <button
                onClick={() => setShowViewerModal(false)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
