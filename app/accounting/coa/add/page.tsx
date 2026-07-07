"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import NumberInput from "@/components/ui/NumberInput";

interface ParentOption {
  _id: string;
  code: string;
  name: string;
  parent?: string | null;
  category?: string;
}

const categories = ["Asset", "Liability", "Equity", "Revenue", "COGS", "Expense"];

const categoryMap: Record<string, { cat: string; pos: "Db" | "Cr" }> = {
  "1": { cat: "Asset", pos: "Db" },
  "2": { cat: "Liability", pos: "Cr" },
  "3": { cat: "Equity", pos: "Cr" },
  "4": { cat: "Revenue", pos: "Cr" },
  "5": { cat: "COGS", pos: "Db" },
  "6": { cat: "Expense", pos: "Db" },
};

const positionStyles: Record<string, string> = {
  Db: "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400",
  Cr: "bg-orange-50 border-orange-100 text-orange-600 dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-400",
};

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

function detectCategory(code: string): string {
  const firstDigit = code.charAt(0);
  return categoryMap[firstDigit]?.cat || "";
}

function detectPosition(code: string): "Db" | "Cr" {
  const firstDigit = code.charAt(0);
  return categoryMap[firstDigit]?.pos || "Db";
}

export default function AddCOAPage() {
  const router = useRouter();
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [parent, setParent] = useState("");
  const [code, setCode] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Asset");
  const [position, setPosition] = useState<"Db" | "Cr">("Db");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => { document.title = "Add COA - AccNext"; }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/accounting/coa?all=true")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setParents(data);
          if (!parent) {
            const nextCode = data.length > 0
              ? Math.max(...data.filter((p: ParentOption) => !p.parent).map((p: ParentOption) => Number(p.code))) + 1
              : 101;
            setCode(nextCode);
            const detected = detectCategory(String(nextCode));
            if (detected) { setCategory(detected); setPosition(detectPosition(String(nextCode))); }
          }
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const generateNextCode = (parentId: string | null): number => {
    if (!parentId) {
      const topLevel = parents.filter((p) => p.parent === null || p.parent === undefined || p.parent === "");
      const max = topLevel.reduce((m, p) => Math.max(m, Number(p.code)), 0);
      return max + 1;
    }
    const parentRec = parents.find((p) => p._id === parentId);
    if (!parentRec) return 0;

    const parentCodeStr = String(parentRec.code);
    const children = parents.filter((p) => p.parent === parentId);

    if (children.length === 0) return Number(parentCodeStr + "01");

    let maxSuffix = 0;
    children.forEach((c) => {
      const cStr = String(c.code);
      const suffix = cStr.slice(parentCodeStr.length);
      if (suffix.length >= 2 && /^\d+$/.test(suffix)) {
        maxSuffix = Math.max(maxSuffix, Number(suffix));
      }
    });
    const nextSuffix = (maxSuffix + 1).toString().padStart(2, "0");
    return Number(parentCodeStr + nextSuffix);
  };

  const autoGenerateCode = (parentId: string) => {
    const newCode = generateNextCode(parentId);
    setCode(newCode);
    const codeStr = String(newCode);
    const detected = detectCategory(codeStr);
    if (detected) setCategory(detected);
    setPosition(detectPosition(codeStr));
  };

  const handleParentChange = (value: string) => {
    setParent(value);
    if (value) {
      autoGenerateCode(value);
    }
  };

  const handleCodeChange = (value: number) => {
    setCode(value);
    const codeStr = String(value);
    const detected = detectCategory(codeStr);
    if (detected) {
      setCategory(detected);
      setPosition(detectPosition(codeStr));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitLoading(true);

    try {
      const res = await fetch("/api/accounting/coa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent: parent || undefined,
          code: String(code),
          name,
          description,
          category,
          position,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrors(err.errors || { form: "Failed to create account" });
        return;
      }

      router.push("/accounting/coa");
    } catch {
      setErrors({ form: "An unexpected error occurred" });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title="Add Chart of Account"
        subtitle="Create a category, group, or detail account"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/accounting/coa"
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              form="coa-form"
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

      <form id="coa-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column — form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            {errors.form && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                {errors.form}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Parent */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Parent Account <span className="text-gray-300 normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <select
                  value={parent}
                  onChange={(e) => handleParentChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold appearance-none cursor-pointer transition-colors"
                >
                  <option value="">— Top-level (Level 1) —</option>
                  {flattenCoa(parents).map((p) => {
                    const depth = getDepth(p._id, parents);
                    const isDisabled = depth >= 3;
                    return (
                      <option key={p._id} value={p._id} disabled={isDisabled}>
                        {"\u00A0".repeat(depth * 3)}
                        {depth === 1 ? "" : "↳ "}
                        {p.code} – {p.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Account Code <span className="text-red-400">*</span>
                </label>
                <NumberInput
                  value={code}
                  onChange={handleCodeChange}
                  decimals={0}
                  separators={false}
                  min={0}
                  placeholder="101"
                  required
                />
                {errors.code && (
                  <p className="text-[10px] text-red-600 font-bold ml-1">{errors.code}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!!parent}
                  className={`w-full px-4 py-2.5 rounded-xl outline-none text-sm font-bold appearance-none transition-colors ${
                    parent
                      ? "bg-gray-100 dark:bg-gray-800 opacity-70 cursor-not-allowed"
                      : "bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 cursor-pointer"
                  }`}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {parent && (
                  <p className="text-[10px] text-gray-400 ml-1">Inherited from parent</p>
                )}
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Normal Position
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as "Db" | "Cr")}
                  className={`w-full px-4 py-2.5 rounded-xl outline-none text-sm font-bold border-2 appearance-none transition-all ${
                    position === "Db"
                      ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 text-emerald-600"
                      : "bg-orange-50 dark:bg-orange-900/10 border-orange-100 text-orange-600"
                  }`}
                >
                  <option value="Db">Debit (Db)</option>
                  <option value="Cr">Credit (Cr)</option>
                </select>
              </div>

              {/* Name — full width */}
              <div className="md:col-span-2 space-y-1.5">
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
              Category Logic
            </h3>
            <p className="text-gray-500 leading-relaxed italic text-xs mb-3">
              Category is auto-detected from the first digit of the account code.
            </p>
            <div className="space-y-1.5 text-[11px]">
              {[
                { digit: "1", cat: "Asset", pos: "Db" },
                { digit: "2", cat: "Liability", pos: "Cr" },
                { digit: "3", cat: "Equity", pos: "Cr" },
                { digit: "4", cat: "Revenue", pos: "Cr" },
                { digit: "5", cat: "COGS", pos: "Db" },
                { digit: "6", cat: "Expense", pos: "Db" },
              ].map(({ digit, cat, pos }) => (
                <div key={digit} className="flex items-center justify-between py-1 px-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{digit}xx</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{cat}</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                    pos === "Db"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  }`}>
                    {pos}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm text-xs">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              Code Structure
            </h3>
            <ul className="space-y-2 text-gray-500 leading-relaxed">
              <li className="flex gap-2">
                <span className="font-mono font-bold text-indigo-600 shrink-0">1xx</span>
                <span>Top-level category</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono font-bold text-indigo-600 shrink-0">1xx-01</span>
                <span>Group under parent</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono font-bold text-indigo-600 shrink-0">1xx-01-01</span>
                <span>Detail account (max 3 levels)</span>
              </li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}
