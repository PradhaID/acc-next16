"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";

interface COA {
  _id: string;
  code: string;
  name: string;
  category: string;
}

interface AccountData {
  _id: string;
  coa: COA | string;
  number: string;
  name: string;
  description?: string;
  balance: number;
  isActive: boolean;
}

const categories = ["Asset", "Liability", "Equity", "Revenue", "COGS", "Expense"];

const categoryColors: Record<string, string> = {
  Asset: "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400",
  Liability: "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400",
  Equity: "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400",
  Revenue: "bg-violet-50 border-violet-100 text-violet-600 dark:bg-violet-950/20 dark:border-violet-800 dark:text-violet-400",
  Expense: "bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400",
};

export default function EditAccountPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [coas, setCoas] = useState<COA[]>([]);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [coaId, setCoaId] = useState("");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { document.title = "Edit Account - AccNext"; }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [acctRes, coaRes] = await Promise.all([
          fetch(`/api/accounting/account?id=${id}`),
          fetch("/api/accounting/coa?all=true"),
        ]);
        const acctData: AccountData = await acctRes.json();
        const coaData: COA[] = coaRes.ok ? await coaRes.json() : [];
        if (cancelled) return;

        setCoas(coaData);
        setAccount(acctData);

        const coa = typeof acctData.coa === "string"
          ? coaData.find((c) => c._id === acctData.coa)
          : (acctData.coa as COA);

        setCoaId(coa?._id || "");
        setNumber(acctData.number);
        setName(acctData.name);
        setDescription(acctData.description || "");
        setCategory(coa?.category || "");
        setIsActive(acctData.isActive);
      } catch {
        setErrors({ form: "Failed to load account data" });
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!name) {
      setErrors({ form: "Name is required." });
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/accounting/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: id,
          name,
          description,
          isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ form: data.message || data.error || "Failed to update account." });
        return;
      }
      router.push("/accounting/account");
    } catch {
      setErrors({ form: "An unexpected error occurred." });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const selectedCoa = coas.find((c) => c._id === coaId);

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title="Edit Account"
        subtitle={
          account ? (
            <>
              Editing: <span className="font-bold text-indigo-600">{account.number} – {account.name}</span>
            </>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/accounting/account"
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              form="account-edit-form"
              disabled={submitLoading}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {submitLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        }
      />

      <form id="account-edit-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column — form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            {errors.form && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                {errors.form}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* COA (read-only) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Chart of Account
                </label>
                <div className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800/50 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300">
                  {selectedCoa ? `${selectedCoa.code} – ${selectedCoa.name}` : "-"}
                </div>
              </div>

              {/* Category (read-only) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Category
                </label>
                <div className={`px-4 py-2.5 rounded-xl text-sm font-bold ${
                  selectedCoa
                    ? `${categoryColors[selectedCoa.category] || ""} border`
                    : "bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500"
                }`}>
                  {selectedCoa?.category || "-"}
                </div>
              </div>

              {/* Number (read-only) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Account Number
                </label>
                <div className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800/50 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">
                  {number}
                </div>
              </div>

              {/* Balance (read-only) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Current Balance
                </label>
                <div className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800/50 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">
                  {account?.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Account Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter account name"
                  required
                />
              </div>

              {/* Description — full width */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Description <span className="text-gray-300 normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 resize-none transition-colors"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Status toggle card */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Account Status</p>
              <p className="text-xs text-gray-500 mt-0.5">
                If deactivated, this account won&apos;t be available for transactions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                  : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
              }`}
            >
              {isActive ? "● Active" : "○ Deactivated"}
            </button>
          </div>
        </div>

        {/* Right column — info cards */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              Category Info
            </h3>
            <p className="text-gray-500 leading-relaxed italic text-xs mb-3">
              Category is inherited from the linked Chart of Account.
            </p>
            <div className="space-y-1.5 text-[11px]">
              {categories.map((cat) => (
                <div key={cat} className={`flex items-center justify-between py-1 px-2 rounded-lg ${
                  cat === (selectedCoa?.category || "")
                    ? "bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-200 dark:ring-indigo-800"
                    : "bg-gray-50 dark:bg-gray-800/50"
                }`}>
                  <span className={`font-medium ${cat === (selectedCoa?.category || "") ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>
                    {cat}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm text-xs">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              Account Details
            </h3>
            <dl className="space-y-2 text-gray-500">
              <div className="flex justify-between">
                <dt>Balance</dt>
                <dd className="font-mono font-bold text-gray-700 dark:text-gray-300">
                  {account ? account.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Status</dt>
                <dd className="font-bold text-gray-700 dark:text-gray-300">
                  {isActive ? "Active" : "Deactivated"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Transactions</dt>
                <dd className="font-mono font-bold text-gray-700 dark:text-gray-300">—</dd>
              </div>
            </dl>
          </div>
        </div>
      </form>
    </div>
  );
}
