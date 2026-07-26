import Link from "next/link";

interface Module {
  id: string;
  eyebrow: string;
  title: string;
  desc: string;
  features: string[];
  visual: React.ReactNode;
}

const modules: Module[] = [
  {
    id: "auth",
    eyebrow: "Authentication & Security",
    title: "Rock-Solid Authentication, Built In",
    desc: "A complete authentication layer covering signup, login, verification, and recovery — so you never build another auth form from scratch.",
    features: [
      "Email or username login with bcrypt password hashing",
      "Email & WhatsApp OTP verification (WAHA integration)",
      "Forgot / reset password with secure OTP flow",
      "JOSE JWT cookie-based sessions with remember-me",
      "Password strength indicator & show/hide toggle",
      "International phone input with validation",
    ],
    visual: (
      <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-5 dark:border-stone-700/50 dark:bg-stone-900/60 shadow-sm">
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 dark:border-stone-700/50 dark:bg-stone-900/80">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Sign In</p>
          <div className="mt-3 space-y-2">
            <div className="h-8 rounded-lg bg-stone-100 dark:bg-stone-800/60" />
            <div className="h-8 rounded-lg bg-stone-100 dark:bg-stone-800/60" />
            <div className="h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600" />
          </div>
          <div className="mt-3 flex items-center justify-between text-[9px] text-stone-400">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> OTP Sent
            </span>
            <span>Forgot password?</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["JWT", "bcrypt", "OTP"].map((t) => (
            <div key={t} className="rounded-lg bg-emerald-50 py-1.5 text-center text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "cms",
    eyebrow: "Content Management Suite",
    title: "A Full CMS With a Powerful Editor",
    desc: "Publish rich content with a TipTap-powered editor, hierarchical pages, categories, and an auto-saving draft system.",
    features: [
      "Posts with rich text editor, tables & code blocks",
      "Hierarchical pages with menu groups (header / footer)",
      "Categories with parent-child nesting",
      "SEO meta fields, canonical & OpenGraph tags",
      "Auto-save drafts with restore prompt",
      "Bulk actions: activate, deactivate, delete, export",
    ],
    visual: (
      <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-5 dark:border-stone-700/50 dark:bg-stone-900/60 shadow-sm">
        <div className="flex gap-2 border-b border-stone-200/80 pb-2 dark:border-stone-700/50">
          {["B", "I", "U", "S", "❝", "🔗", "▦"].map((t) => (
            <span key={t} className="flex h-6 w-6 items-center justify-center rounded bg-stone-100 text-[10px] text-stone-500 dark:bg-stone-800/60">{t}</span>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-3 w-2/3 rounded bg-stone-200 dark:bg-stone-700/60" />
          <div className="h-2.5 w-full rounded bg-stone-100 dark:bg-stone-800/60" />
          <div className="h-2.5 w-full rounded bg-stone-100 dark:bg-stone-800/60" />
          <div className="h-2.5 w-4/5 rounded bg-stone-100 dark:bg-stone-800/60" />
          <div className="mt-2 h-16 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-950/40 flex items-center justify-center text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
            Featured Image
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[9px]">
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Draft</span>
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Auto-saved</span>
        </div>
      </div>
    ),
  },
  {
    id: "access",
    eyebrow: "User & Access Control",
    title: "Granular RBAC, Down to the Route",
    desc: "Organize users into groups, assign permission routes, and let the system enforce access at both the UI and API layer.",
    features: [
      "System users & groups with full CRUD",
      "Bulk user activation / deactivation / export",
      "Dynamic permission routes per group",
      "Route-level RoleGuard component",
      "Sidebar menu auto-filters by role",
      "API endpoints protected by token claims",
    ],
    visual: (
      <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-5 dark:border-stone-700/50 dark:bg-stone-900/60 shadow-sm">
        <div className="rounded-xl border border-stone-200/80 bg-white p-3 dark:border-stone-700/50 dark:bg-stone-900/80">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Admin Group</p>
          <div className="mt-2 space-y-1.5">
            {["/dashboard", "/content/*", "/system/users", "/system/settings"].map((r) => (
              <div key={r} className="flex items-center justify-between rounded-lg bg-stone-100 px-2 py-1 text-[9px] dark:bg-stone-800/60">
                <span className="font-mono text-stone-600 dark:text-stone-300">{r}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[9px] text-stone-400">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Protected
          </span>
          <span>RoleGuard active</span>
        </div>
      </div>
    ),
  },
  {
    id: "system",
    eyebrow: "Dashboard & System Admin",
    title: "Monitor and Configure With Ease",
    desc: "Track server health, review activity, and manage application settings — all from a clean administration panel.",
    features: [
      "Real-time CPU, memory & uptime metrics",
      "User & group statistics with charts",
      "Activity feed timeline by category",
      "System logs with search & filtering",
      "URL redirect manager (301 / 302 / 308)",
      "In-app notifications & 404 tracking",
    ],
    visual: (
      <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-5 dark:border-stone-700/50 dark:bg-stone-900/60 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: "CPU", v: "24%" },
            { l: "Memory", v: "1.8GB" },
            { l: "Uptime", v: "42d" },
            { l: "Logs", v: "1.2k" },
          ].map((m) => (
            <div key={m.l} className="rounded-lg border border-stone-200/80 bg-white p-2 dark:border-stone-700/50 dark:bg-stone-900/80">
              <p className="text-[8px] uppercase tracking-wider text-stone-400">{m.l}</p>
              <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{m.v}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 h-12 rounded-lg bg-gradient-to-r from-emerald-200/60 to-emerald-200/60 dark:from-emerald-900/30 dark:to-emerald-900/30" />
        <div className="mt-2 flex items-center justify-between rounded-lg bg-stone-100 px-2 py-1 text-[9px] dark:bg-stone-800/60">
          <span>system.settings.updated</span>
          <span className="text-emerald-600 dark:text-emerald-400">view</span>
        </div>
      </div>
    ),
  },
  {
    id: "analytics",
    eyebrow: "Built-In Web Analytics",
    title: "Track Everything, No External Services",
    desc: "A complete analytics dashboard built right in — no Google Analytics, no third-party scripts, no privacy concerns.",
    features: [
      "Page views, unique visitors & returning sessions",
      "Most visited pages with ranking",
      "Traffic trend charts (7 / 14 / 30 / 90 days)",
      "Peak hours analysis to optimize publishing",
      "Top referrers tracking",
      "Configurable: track all pages or public-only",
    ],
    visual: (
      <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-5 dark:border-stone-700/50 dark:bg-stone-900/60 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: "Views", v: "12.4k" },
            { l: "Visitors", v: "3.2k" },
            { l: "Returning", v: "847" },
            { l: "Avg/Session", v: "3.8" },
          ].map((m) => (
            <div key={m.l} className="rounded-lg border border-stone-200/80 bg-white p-2 dark:border-stone-700/50 dark:bg-stone-900/80">
              <p className="text-[8px] uppercase tracking-wider text-stone-400">{m.l}</p>
              <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{m.v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-1 h-12">
          {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-emerald-500 to-emerald-500" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-stone-100 px-2 py-1 text-[9px] dark:bg-stone-800/60">
          <span>/blog/getting-started</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">2.4k views</span>
        </div>
      </div>
    ),
  },
  {
    id: "developer",
    eyebrow: "Developer Experience",
    title: "API, i18n, and DX Done Right",
    desc: "Expose your data through a documented REST API, support multiple languages, and ship with a polished component library.",
    features: [
      "REST API v1 with API-key authentication",
      "Interactive API documentation page",
      "English + Indonesian localization (i18n)",
      "Light / dark theme with no FOUC",
      "Rate limiting, email service & image processing",
      "Reusable UI kit: Toggle, Skeleton, DataTable & more",
    ],
    visual: (
      <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-5 dark:border-stone-700/50 dark:bg-stone-900/60 shadow-sm">
        <div className="rounded-xl border border-stone-200/80 bg-stone-900 p-3 font-mono text-[9px] text-stone-300 dark:border-stone-700/50">
          <p><span className="text-emerald-400">GET</span> /api/v1/content/post</p>
          <p className="text-stone-500">Authorization: Bearer &lt;api_key&gt;</p>
          <p className="mt-1 text-emerald-300">200 OK</p>
          <p className="text-cyan-300">{`{ "data": [ ... ] }`}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["EN", "ID", "Light", "Dark", "XLSX", "SEO"].map((t) => (
            <span key={t} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              {t}
            </span>
          ))}
        </div>
      </div>
    ),
  },
];

export default function ModuleShowcase() {
  return (
    <section id="modules" className="mt-32 space-y-24">
      {modules.map((m, i) => (
        <div
          key={m.id}
          className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center"
        >
          {/* Text */}
          <div className={i % 2 === 1 ? "lg:order-2" : ""}>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              {m.eyebrow}
            </p>
            <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-3xl">
              {m.title}
            </h3>
            <p className="mt-4 text-stone-600 dark:text-stone-400 leading-relaxed">
              {m.desc}
            </p>
            <ul className="mt-6 space-y-3">
              {m.features.map((feat) => (
                <li key={feat} className="flex items-start gap-3 text-sm text-stone-700 dark:text-stone-300">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {feat}
                </li>
              ))}
            </ul>
          </div>

          {/* Visual */}
          <div className={`mt-10 lg:mt-0 ${i % 2 === 1 ? "lg:order-1" : ""}`}>
            {m.visual}
          </div>
        </div>
      ))}

      <div className="rounded-3xl border border-stone-200/80 bg-gradient-to-br from-emerald-50 to-emerald-50 p-8 text-center dark:border-stone-700/50 dark:from-emerald-950/30 dark:to-emerald-950/30">
        <h3 className="text-xl font-extrabold text-stone-900 dark:text-white">
          Plus SEO, Sitemaps & Public Pages
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-stone-600 dark:text-stone-400">
          Dynamic CMS pages, a blog reader, category &amp; tag archives, JSON-LD
          structured data, OpenGraph cards, canonical URLs, and auto-generated
          XML sitemaps &amp; robots.txt — all handled for you.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {["robots.txt", "sitemap.xml", "JSON-LD", "OpenGraph", "Canonical", "Blog", "Categories", "Tags"].map((t) => (
            <span key={t} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm dark:bg-stone-900/80 dark:text-emerald-400">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
