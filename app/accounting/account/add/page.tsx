"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";

interface ParentOption {
  _id: string;
  code: string;
  name: string;
  parent?: string | null;
  category: string;
}

interface Account {
  _id: string;
  coa: string;
  number: string;
  name: string;
  description?: string;
  balance: number;
  isActive: boolean;
}

const categoryColors: Record<string, string> = {
  Asset: "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400",
  Liability: "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400",
  Equity: "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400",
  Revenue: "bg-violet-50 border-violet-100 text-violet-600 dark:bg-violet-950/20 dark:border-violet-800 dark:text-violet-400",
  Expense: "bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400",
};

const categories = ["Asset", "Liability", "Equity", "Revenue", "COGS", "Expense"];

function flattenCoa(nodes: ParentOption[], parentId: string | null = null): ParentOption[] {
  return nodes
    .filter((n) => (n.parent || null) === parentId)
    .sort((a, b) => Number(a.code) - Number(b.code))
    .reduce((acc: ParentOption[], child) => [...acc, child, ...flattenCoa(nodes, child._id)], []);
}

function getDepth(parentId: string | null, allNodes: ParentOption[]): number {
  if (!parentId) return 0;
  let depth = 0;
  let currentId: string | null = parentId;
  while (currentId) {
    const p = allNodes.find((n) => n._id === currentId);
    if (!p) break;
    depth++;
    currentId = p.parent || null;
    if (depth > 5) break;
  }
  return depth;
}

function generateNextNumber(coaCode: string, existingAccounts: Account[]): string {
  const coaAccounts = existingAccounts.filter((a) => {
    return a.number.startsWith(coaCode);
  });
  if (coaAccounts.length === 0) return `${coaCode}01`;
  let maxSuffix = 0;
  coaAccounts.forEach((a) => {
    const suffix = a.number.slice(coaCode.length);
    if (suffix.length >= 2 && /^\d+$/.test(suffix)) {
      maxSuffix = Math.max(maxSuffix, Number(suffix));
    }
  });
  return `${coaCode}${String(maxSuffix + 1).padStart(2, "0")}`;
}

export default function AddAccountPage() {
  const router = useRouter();
  const [coas, setCoas] = useState<ParentOption[]>([]);
  const [existingAccounts, setExistingAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [coaId, setCoaId] = useState("");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => { document.title = "Add Account - AccNext"; }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [coaRes, acctRes] = await Promise.all([
          fetch("/api/accounting/coa?all=true"),
          fetch("/api/accounting/account?all=true"),
        ]);
        const coaData: ParentOption[] = coaRes.ok ? await coaRes.json() : [];
        const acctData = acctRes.ok ? await acctRes.json() : [];
        if (!cancelled) {
          setCoas(coaData);
          setExistingAccounts(acctData);
        }
      } catch {
        //
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const handleCoaChange = (value: string) => {
    setCoaId(value);
    const selected = coas.find((c) => c._id === value);
    if (selected) {
      const nextNum = generateNextNumber(String(selected.code), existingAccounts);
      setNumber(nextNum);
      if (selected.category) setCategory(selected.category);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!coaId || !number || !name) {
      setErrors({ form: "COA, Number, and Name are required." });
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/accounting/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coa: coaId,
          number,
          name,
          description: description || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ form: data.message || data.error || "Failed to create account." });
        return;
      }
      router.push("/accounting/account");
    } catch {
      setErrors({ form: "An unexpected error occurred." });
    } finally {
      setSubmitLoading(false);
    }
  };

  const selectedCoa: ParentOption | undefined = coas.find((c) => c._id === coaId);

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title="Add Account"
        subtitle="Create a new ledger account linked to a chart of account"
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
              form="account-form"
              disabled={submitLoading}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {submitLoading ? "Saving..." : "Save Account"}
            </button>
          </div>
        }
      />

      <form id="account-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column — form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            {errors.form && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                {errors.form}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* COA */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Chart of Account <span className="text-red-400">*</span>
                </label>
                <select
                  value={coaId}
                  onChange={(e) => handleCoaChange(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold appearance-none cursor-pointer transition-colors disabled:opacity-50"
                >
                  <option value="">— Select COA —</option>
                  {flattenCoa(coas).map((c) => {
                    const depth = getDepth(c._id, coas);
                    const isDisabled = depth < 3;
                    return (
                      <option key={c._id} value={c._id} disabled={isDisabled}>
                        {"\u00A0".repeat(depth * 3)}
                        {depth === 1 ? "" : "↳ "}
                        {c.code} – {c.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Category
                </label>
                <div className={`px-4 py-2.5 rounded-xl text-sm font-bold ${
                  category
                    ? `${categoryColors[category] || ""} border`
                    : "bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500"
                }`}>
                  {category || "Auto-detected from COA"}
                </div>
              </div>

              {/* Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Account Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="101.001"
                  required
                />
                {errors.number && (
                  <p className="text-[10px] text-red-600 font-bold ml-1">{errors.number}</p>
                )}
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
        </div>

        {/* Right column — info cards */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              Category Info
            </h3>
            <p className="text-gray-500 leading-relaxed italic text-xs mb-3">
              Category is inherited from the selected Chart of Account.
            </p>
            <div className="space-y-1.5 text-[11px]">
              {categories.map((cat) => (
                <div key={cat} className={`flex items-center justify-between py-1 px-2 rounded-lg ${
                  cat === category
                    ? "bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-200 dark:ring-indigo-800"
                    : "bg-gray-50 dark:bg-gray-800/50"
                }`}>
                  <span className={`font-medium ${cat === category ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>
                    {cat}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm text-xs">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              Number Format
            </h3>
            <ul className="space-y-2 text-gray-500 leading-relaxed">
              <li className="flex gap-2">
                <span className="font-mono font-bold text-indigo-600 shrink-0">COA##</span>
                <span>COA code + 2-digit sequence</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono font-bold text-indigo-600 shrink-0">10101</span>
                <span>First account under COA 101</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono font-bold text-indigo-600 shrink-0">10102</span>
                <span>Second account under COA 101</span>
              </li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}
