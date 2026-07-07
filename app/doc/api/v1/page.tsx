"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";

const endpointStyle = "bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6";

const methodColors: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  POST: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PUT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  PATCH: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${color}`}>{children}</span>;
}

function MethodBadge({ method }: { method: string }) {
  return <Badge color={methodColors[method] || "bg-gray-100 text-gray-700"}>{method}</Badge>;
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-400">{children}</code>;
}

function Pre({ children }: { children: React.ReactNode }) {
  return <pre className="bg-gray-900 text-gray-100 text-xs leading-relaxed p-4 rounded-xl overflow-x-auto font-mono whitespace-pre">{children}</pre>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Endpoint({ method, path, description, queryParams, requestBody, response }: {
  method: string;
  path: string;
  description: string;
  queryParams?: { name: string; type: string; required?: boolean; description: string }[];
  requestBody?: string;
  response: string;
}) {
  return (
    <div className={endpointStyle}>
      <div className="flex items-start gap-3 mb-4">
        <MethodBadge method={method} />
        <div className="flex-1 min-w-0">
          <code className="text-sm font-mono font-bold text-gray-900 dark:text-white break-all">{path}</code>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>

      {queryParams && queryParams.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Query Parameters</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-1.5 pr-3 font-bold text-gray-500">Name</th>
                  <th className="text-left py-1.5 pr-3 font-bold text-gray-500">Type</th>
                  <th className="text-left py-1.5 pr-3 font-bold text-gray-500">Required</th>
                  <th className="text-left py-1.5 font-bold text-gray-500">Description</th>
                </tr>
              </thead>
              <tbody>
                {queryParams.map((p) => (
                  <tr key={p.name} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-1.5 pr-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.name}</td>
                    <td className="py-1.5 pr-3 text-gray-500">{p.type}</td>
                    <td className="py-1.5 pr-3">{p.required ? <Badge color="bg-red-100 text-red-600">Required</Badge> : <Badge color="bg-gray-100 text-gray-500">Optional</Badge>}</td>
                    <td className="py-1.5 text-gray-700 dark:text-gray-300">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {requestBody && (
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Request Body</p>
          <Pre>{requestBody}</Pre>
        </div>
      )}

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Response</p>
        <Pre>{response}</Pre>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-sm font-bold text-gray-900 dark:text-white">{title}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="px-6 pb-4">{children}</div>}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/dashboard" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold">&larr; Dashboard</Link>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">API v1 Reference</h1>
        <p className="text-sm text-gray-500">
          RESTful API for accessing accounting data. All endpoints require authentication via API key.
        </p>
      </div>

      {/* Authentication */}
      <Section title="Authentication">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">API Key Authentication</p>
            <p className="text-xs text-gray-500 mt-1">
              Include your API key in the <Code>Authorization</Code> header with the <Code>Bearer</Code> scheme.
            </p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Example Header</p>
            <Pre>{`Authorization: Bearer <your-api-key>`}</Pre>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Error Response (401)</p>
            <Pre>{`{
  "error": "Unauthorized"
}`}</Pre>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/50 rounded-xl p-3 text-xs text-yellow-700 dark:text-yellow-400">
            <strong>Note:</strong> Generate your API key from your{" "}
            <Link href="/account/profile" className="underline font-bold">Profile Settings</Link> page.
          </div>
        </div>
      </Section>

      {/* Endpoints */}
      <Section title="Chart of Accounts">
        <Endpoint
          method="GET"
          path="/api/v1/coa"
          description="Retrieve the chart of accounts hierarchy."
          queryParams={[
            { name: "active", type: "boolean", description: "Filter by active status (default: true). Use `all=true` to include inactive." },
            { name: "all", type: "boolean", description: "Include inactive COA entries." },
            { name: "search", type: "string", description: "Search by name or code (regex)." },
          ]}
          response={`[
  {
    "_id": "...",
    "parent": null,
    "code": "1",
    "name": "Current Assets",
    "position": "Db",
    "category": "Asset",
    "isActive": true
  }
]`}
        />
      </Section>

      <Section title="Accounts">
        <Endpoint
          method="GET"
          path="/api/v1/accounts"
          description="Retrieve accounts. Optionally filter by COA or get a single account by ID."
          queryParams={[
            { name: "id", type: "string", description: "Get a single account by ID." },
            { name: "coa", type: "string", description: "Filter accounts by parent COA ID." },
            { name: "all", type: "boolean", description: "Include inactive accounts." },
          ]}
          response={`[
  {
    "_id": "...",
    "coa": "...",
    "number": "10101",
    "name": "Petty Cash",
    "balance": 5000000,
    "isActive": true
  }
]`}
        />
      </Section>

      <Section title="Transactions">
        <div className="space-y-4">
          <Endpoint
            method="GET"
            path="/api/v1/transactions"
            description="List transactions with optional filters."
            queryParams={[
              { name: "id", type: "string", description: "Get a single transaction by ID." },
              { name: "status", type: "string", description: "Filter by status: Pending, Confirmed, Rejected, Reversed." },
              { name: "includeDetails", type: "boolean", description: "Include journal line details." },
            ]}
            response={`[
  {
    "_id": "...",
    "code": "GJ-20260701-001",
    "effectiveDate": "2026-07-01T00:00:00.000Z",
    "amount": 1000000,
    "status": "Confirmed",
    "reference": "INV-001",
    "information": "Payment received",
    "source": "api"
  }
]`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/transactions/:id"
            description="Get a single transaction by ID with journal line details."
            response={`{
  "_id": "...",
  "code": "GJ-20260701-001",
  "effectiveDate": "2026-07-01T00:00:00.000Z",
  "amount": 1000000,
  "status": "Confirmed",
  "source": "api",
  "details": [
    { "account": { "number": "10101", "name": "Petty Cash" }, "debit": 1000000, "credit": 0 },
    { "account": { "number": "40101", "name": "Revenue" }, "debit": 0, "credit": 1000000 }
  ]
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/transactions"
            description="Create a new transaction. At least 2 journal lines required; debits must equal credits."
            requestBody={`{
  "type": "General",
  "effectiveDate": "2026-07-01",
  "reference": "INV-001",
  "information": "Payment received",
  "lines": [
    { "accountId": "...", "debit": 1000000, "credit": 0 },
    { "accountId": "...", "debit": 0, "credit": 1000000 }
  ]
}`}
            response={`{
  "_id": "...",
  "code": "GJ-20260701-001",
  "status": "Pending",
  "source": "api"
}`}
          />

          <Endpoint
            method="PUT"
            path="/api/v1/transactions/:id"
            description="Update a pending transaction. Replaces all journal lines if provided."
            queryParams={[
              { name: "id", type: "string", required: true, description: "Transaction ID (in path)." },
            ]}
            requestBody={`{
  "effectiveDate": "2026-07-02",
  "reference": "INV-001",
  "information": "Updated info",
  "lines": [
    { "accountId": "...", "debit": 2000000, "credit": 0 },
    { "accountId": "...", "debit": 0, "credit": 2000000 }
  ]
}`}
            response={`{
  "message": "Updated."
}`}
          />

          <Endpoint
            method="DELETE"
            path="/api/v1/transactions/:id?action=confirm"
            description="Confirm a pending transaction. Affects account balances."
            response={`{
  "message": "Confirmed."
}`}
          />

          <Endpoint
            method="DELETE"
            path="/api/v1/transactions/:id?action=reject"
            description="Reject a pending transaction."
            response={`{
  "message": "Rejected."
}`}
          />

          <Endpoint
            method="DELETE"
            path="/api/v1/transactions/:id?action=cancel"
            description="Hard-delete a pending transaction (removes from database)."
            response={`{
  "message": "Deleted."
}`}
          />
        </div>
      </Section>

      <Section title="Transaction Types">
        <Endpoint
          method="GET"
          path="/api/v1/transaction-types"
          description="List available transaction types and their code prefixes."
          response={`{
  "General": "GJ",
  "FundTransfer": "FT",
  "Expense": "EX",
  "Revenue": "RV",
  "Purchase": "PC",
  "Sales": "SL",
  "Payroll": "PR",
  "Tax": "TX",
  "Depreciation": "DP",
  "Closing": "CE"
}`}
        />
      </Section>

      <Section title="Ledger">
        <Endpoint
          method="GET"
          path="/api/v1/ledger-periods"
          description="Retrieve ledger entries for a specific account within a date range. Returns opening balance, period mutations, and running balance."
          queryParams={[
            { name: "accountId", type: "string", required: true, description: "Account ID to retrieve ledger for." },
            { name: "startDate", type: "string (YYYY-MM-DD)", description: "Start date (inclusive). Defaults to beginning of current year." },
            { name: "endDate", type: "string (YYYY-MM-DD)", description: "End date (inclusive). Defaults to today." },
          ]}
          response={`{
  "account": { "number": "10101", "name": "Petty Cash" },
  "coa": { "code": "1", "name": "Current Assets", "position": "Db" },
  "openingBalance": 0,
  "startDate": "2026-01-01",
  "endDate": "2026-07-01",
  "rows": [
    { "date": "2026-07-01T00:00:00.000Z", "code": "GJ-20260701-001", "information": "Payment", "debit": 1000000, "credit": 0, "balance": 1000000 }
  ]
}`}
        />
      </Section>

      <Section title="Reports">
        <div className="space-y-4">
          <Endpoint
            method="GET"
            path="/api/v1/reports/balance-sheet"
            description="Generate the balance sheet as of a specific date."
            queryParams={[
              { name: "date", type: "string (YYYY-MM-DD)", description: "Date as of which to generate the balance sheet. Defaults to today." },
            ]}
            response={`{
  "asOfDate": "2026-07-01",
  "assets": { "total": 50000000, "children": [...] },
  "liabilities": { "total": 10000000, "children": [...] },
  "equity": { "total": 40000000, "children": [...] },
  "netIncome": 5000000
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/reports/income-statement"
            description="Generate the income statement for a date range."
            queryParams={[
              { name: "startDate", type: "string (YYYY-MM-DD)", description: "Start date (inclusive). Defaults to Jan 1 of current year." },
              { name: "endDate", type: "string (YYYY-MM-DD)", description: "End date (inclusive). Defaults to today." },
            ]}
            response={`{
  "startDate": "2026-01-01",
  "endDate": "2026-07-01",
  "revenue": { "total": 50000000, "children": [...] },
  "cogs": { "total": 20000000, "children": [...] },
  "expenses": { "total": 25000000, "children": [...] },
  "grossProfit": 30000000,
  "netProfit": 5000000
}`}
          />
        </div>
      </Section>

      {/* Error Codes */}
      <Section title="Error Codes">
        <div className="space-y-3">
          {[
            { code: 400, label: "Bad Request", desc: "Missing or invalid request parameters / body." },
            { code: 401, label: "Unauthorized", desc: "Missing or invalid API key." },
            { code: 403, label: "Forbidden", desc: "API key does not have permission for this resource." },
            { code: 404, label: "Not Found", desc: "The requested resource does not exist." },
            { code: 409, label: "Conflict", desc: "Conflict (e.g., duplicate transaction code, unbalanced journal)." },
            { code: 422, label: "Unprocessable", desc: "Validation error (e.g., debits != credits)." },
          ].map((err) => (
            <div key={err.code} className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl px-5 py-3">
              <span className="text-sm font-mono font-bold text-red-600 dark:text-red-400 w-10">{err.code}</span>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-24">{err.label}</span>
              <span className="text-xs text-gray-500">{err.desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Rate Limiting / Best Practices */}
      <Section title="Best Practices">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p><strong className="text-gray-900 dark:text-white">Store securely:</strong> Treat your API key like a password. Do not expose it in client-side code or version control.</p>
          <p><strong className="text-gray-900 dark:text-white">Regenerate periodically:</strong> You can regenerate your API key from your profile page at any time. Regenerating invalidates the previous key immediately.</p>
          <p><strong className="text-gray-900 dark:text-white">Date format:</strong> All dates should be in ISO 8601 format (<Code>YYYY-MM-DD</Code>) or ISO string (<Code>YYYY-MM-DDTHH:mm:ss.sssZ</Code>).</p>
          <p><strong className="text-gray-900 dark:text-white">Transaction source:</strong> Transactions created via the API are automatically marked with <Code>source: "api"</Code> to distinguish them from UI-created transactions.</p>
        </div>
      </Section>
    </div>
  );
}
