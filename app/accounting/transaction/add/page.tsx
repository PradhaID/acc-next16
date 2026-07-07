"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";

interface Account {
  _id: string;
  number: string;
  name: string;
}

interface JournalLine {
  key: string;
  account: string;
  accountLabel: string;
  position: "Db" | "Cr";
  amount: number;
}

const emptyLine = (): JournalLine => ({
  key: crypto.randomUUID(),
  account: "",
  accountLabel: "",
  position: "Db",
  amount: 0,
});

const typeOptions = [
  { value: "General", label: "(GJ) General Journal", code: "GJ", info: "Adjustments, accruals, corrections and other general transactions." },
  { value: "Fund Transfer", label: "(FT) Fund Transfer", code: "FT", info: "Transfer between cash or bank accounts." },
  { value: "Expense", label: "(EX) Expense", code: "EX", info: "Business expenses, purchases and operational costs." },
  { value: "Revenue", label: "(RV) Revenue", code: "RV", info: "Income, sales and other revenue-generating transactions." },
  { value: "Purchase", label: "(PC) Purchase", code: "PC", info: "Inventory or asset purchases on credit or cash." },
  { value: "Sales", label: "(SL) Sales", code: "SL", info: "Sales of goods or services to customers." },
  { value: "Payroll", label: "(PR) Payroll", code: "PR", info: "Salary, wage and employee benefit disbursements." },
  { value: "Tax", label: "(TX) Tax", code: "TX", info: "Tax payments, refunds and provisions." },
  { value: "Depreciation", label: "(DP) Depreciation", code: "DP", info: "Periodic depreciation and amortization of assets." },
  { value: "Closing", label: "(CE) Closing Entry", code: "CE", info: "Year-end or period-end closing entries." },
];

export default function AddTransactionPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [type, setType] = useState("General");
  const [effectiveDate, setEffectiveDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [reference, setReference] = useState("");
  const [information, setInformation] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);

  const [accountSearch, setAccountSearch] = useState<Record<string, string>>({});
  const [accountResults, setAccountResults] = useState<Record<string, Account[]>>({});
  const [showDropdown, setShowDropdown] = useState<Record<string, boolean>>({});
  const [amountRaw, setAmountRaw] = useState<Record<string, string>>({});
  const [amountFocused, setAmountFocused] = useState<Record<string, boolean>>({});

  useEffect(() => { document.title = "Add Transaction - AccNext"; }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/accounting/account?all=true")
      .then((r) => r.json())
      .then((data: Account[]) => { if (!cancelled) setAccounts(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const searchAccounts = async (query: string, key: string) => {
    setAccountSearch((prev) => ({ ...prev, [key]: query }));
    if (query.length < 1) {
      setAccountResults((prev) => ({ ...prev, [key]: [] }));
      return;
    }
    const q = query.toLowerCase();
    const filtered = accounts.filter(
      (a) => a.number.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    );
    setAccountResults((prev) => ({ ...prev, [key]: filtered.slice(0, 10) }));
    setShowDropdown((prev) => ({ ...prev, [key]: filtered.length > 0 }));
  };

  const selectAccount = (acc: Account, key: string) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, account: acc._id, accountLabel: `${acc.number} – ${acc.name}` } : l))
    );
    setAccountSearch((prev) => ({ ...prev, [key]: `${acc.number} – ${acc.name}` }));
    setShowDropdown((prev) => ({ ...prev, [key]: false }));
  };

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine()]);
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const updatePosition = useCallback((key: string, position: "Db" | "Cr") => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, position } : l)));
  }, []);

  const updateAmount = useCallback((key: string, raw: string) => {
    const cleaned = raw.replace(/,/g, "");
    if (!/^\d*\.?\d*$/.test(cleaned)) return;
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, amount: cleaned ? Number(cleaned) : 0 } : l)));
    const parts = cleaned.split(".");
    const decPart = parts[1] ?? "";
    const withComma = parts[0] ? parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";
    setAmountRaw((prev) => ({ ...prev, [key]: cleaned.includes(".") ? `${withComma}.${decPart}` : withComma }));
  }, []);

  const handleAmountFocus = useCallback((key: string) => {
    setAmountFocused((prev) => ({ ...prev, [key]: true }));
    const line = lines.find((l) => l.key === key);
    if (line && line.amount) {
      const parts = String(line.amount).split(".");
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      const decPart = parts[1] ?? "";
      setAmountRaw((prev) => ({ ...prev, [key]: decPart ? `${intPart}.${decPart}` : intPart }));
    } else {
      setAmountRaw((prev) => ({ ...prev, [key]: "" }));
    }
  }, [lines]);

  const handleAmountBlur = useCallback((key: string) => {
    setAmountFocused((prev) => ({ ...prev, [key]: false }));
  }, []);

  const totalDb = lines.filter((l) => l.position === "Db").reduce((s, l) => s + l.amount, 0);
  const totalCr = lines.filter((l) => l.position === "Cr").reduce((s, l) => s + l.amount, 0);
  const difference = totalDb - totalCr;
  const isBalanced = totalDb === totalCr && totalDb > 0;

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!effectiveDate) errs.effectiveDate = "Date is required";
    if (lines.length < 2) errs.lines = "At least 2 journal lines are required";
    if (!isBalanced) errs.difference = "Total debits must equal total credits";
    lines.forEach((line, i) => {
      if (!line.account) errs[`line-${i}-account`] = "Account is required";
      if (line.amount <= 0) errs[`line-${i}-amount`] = "Amount must be greater than 0";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [effectiveDate, lines, isBalanced]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      setSubmitting(true);
      try {
        const body = {
          type,
          effectiveDate,
          reference: reference || undefined,
          information,
          lines: lines.map((l) => ({ account: l.account, position: l.position, amount: l.amount })),
        };
        const res = await fetch("/api/accounting/transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const txn = await res.json();
          router.push(`/accounting/transaction/detail/${txn._id}?created=true`);
        } else {
          const data = await res.json();
          setErrors({ form: data.message || "Failed to create transaction" });
        }
      } catch {
        setErrors({ form: "An unexpected error occurred" });
      } finally {
        setSubmitting(false);
      }
    },
    [type, effectiveDate, reference, information, lines, validate, router]
  );

  const fmt = (v: number) => v ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title="Add Transaction"
        subtitle="Create a new journal entry"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/accounting/transaction"
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              form="txn-form"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {submitting ? "Creating..." : "Create Transaction"}
            </button>
          </div>
        }
      />

      <form id="txn-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Header card */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
          {errors.form && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
              {errors.form}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left column: type/date/ref + memo */}
            <div className="flex flex-col space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-[65%_35%] gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold appearance-none cursor-pointer transition-colors"
                  >
                    {typeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white transition-colors"
                  />
                  {errors.effectiveDate && (
                    <p className="text-[10px] text-red-600 font-bold ml-1">{errors.effectiveDate}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Ref
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="—"
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                />
              </div>

              <div className="flex-1 space-y-1 flex flex-col">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Information <span className="text-gray-300 normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <textarea
                  value={information}
                  onChange={(e) => setInformation(e.target.value)}
                  placeholder="Memo or description"
                  disabled={submitting}
                  className="flex-1 w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 resize-none transition-colors"
                />
              </div>
            </div>

            {/* Right column: type info — hidden on mobile */}
            <div className="hidden md:block space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                Transaction Types
              </label>
              <div className="space-y-1">
                {typeOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      type === opt.value
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "bg-gray-50 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    <span className="font-black tracking-tighter w-7">{opt.code}</span>
                    <span className="font-semibold">{opt.info}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Code Format</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-300 font-semibold mt-0.5">
                  {typeOptions.find((o) => o.value === type)?.code}-YYYYMMDD-RND
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Journal Lines table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Account</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-32">Position</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-52">Amount</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {lines.map((line) => (
                <tr key={line.key} className="group">
                  <td className="px-4 py-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search account..."
                        value={accountSearch[line.key] ?? line.accountLabel ?? ""}
                        onChange={(e) => searchAccounts(e.target.value, line.key)}
                        onFocus={() => {
                          const res = accountResults[line.key];
                          if (res && res.length > 0) setShowDropdown((prev) => ({ ...prev, [line.key]: true }));
                        }}
                        disabled={submitting}
                        className="w-full bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      {showDropdown[line.key] && accountResults[line.key]?.length > 0 && (
                        <>
                          <div className="fixed inset-0 z-[9998]" onClick={() => setShowDropdown((prev) => ({ ...prev, [line.key]: false }))} />
                          <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {accountResults[line.key].map((acc) => (
                              <button
                                key={acc._id}
                                type="button"
                                onClick={() => selectAccount(acc, line.key)}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                              >
                                <div className="font-bold text-gray-900 dark:text-white">{acc.number} – {acc.name}</div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      {errors[`line-${lines.indexOf(line)}-account`] && (
                        <p className="text-[10px] text-red-600 font-bold mt-1">{errors[`line-${lines.indexOf(line)}-account`]}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updatePosition(line.key, "Db")}
                        disabled={submitting}
                        className={`flex-1 py-1 text-[10px] font-black uppercase rounded-md transition-all ${line.position === "Db" ? "bg-white dark:bg-gray-700 text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                      >Db</button>
                      <button
                        type="button"
                        onClick={() => updatePosition(line.key, "Cr")}
                        disabled={submitting}
                        className={`flex-1 py-1 text-[10px] font-black uppercase rounded-md transition-all ${line.position === "Cr" ? "bg-white dark:bg-gray-700 text-orange-500 shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                      >Cr</button>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-black">Rp</span>
                      <input
                        type="text"
                        value={amountFocused[line.key] ? (amountRaw[line.key] ?? "") : fmt(line.amount)}
                        placeholder="0.00"
                        onChange={(e) => updateAmount(line.key, e.target.value)}
                        onFocus={() => handleAmountFocus(line.key)}
                        onBlur={() => handleAmountBlur(line.key)}
                        disabled={submitting}
                        className="w-full pl-6 pr-3 py-1.5 bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-black text-right focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    {errors[`line-${lines.indexOf(line)}-amount`] && (
                      <p className="text-[10px] text-red-600 font-bold mt-1">{errors[`line-${lines.indexOf(line)}-amount`]}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={submitting || lines.length <= 1}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {errors.lines && (
            <div className="px-4 py-2">
              <p className="text-[10px] text-red-600 font-bold">{errors.lines}</p>
            </div>
          )}
          {errors.difference && (
            <div className="px-4 py-2">
              <p className="text-[10px] text-red-600 font-bold">{errors.difference}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col md:flex-row justify-between items-center gap-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={addLine}
              disabled={submitting}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Ledger Line
            </button>

            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Debits</p>
                <p className="text-lg font-black text-indigo-600">{totalDb.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Credits</p>
                <p className="text-lg font-black text-indigo-600">{totalCr.toLocaleString()}</p>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 hidden md:block" />
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Difference</p>
                <p className={`text-lg font-black ${difference === 0 ? "text-green-500" : "text-red-500"}`}>
                  {(difference).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
