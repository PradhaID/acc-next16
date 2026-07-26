const tech = [
  { badge: "NEXT", label: "Next.js 16", desc: "App Router, React 19", tint: "bg-stone-950 text-white" },
  { badge: "TW4", label: "Tailwind CSS v4", desc: "Sleek styling engine", tint: "bg-orange-500 text-white" },
  { badge: "MDB", label: "MongoDB", desc: "Flexible NoSQL DB", tint: "bg-emerald-600 text-white" },
  { badge: "TS", label: "TypeScript", desc: "Full type safety", tint: "bg-emerald-600 text-white" },
  { badge: "JWT", label: "JOSE JWT", desc: "Encrypted tokens", tint: "bg-rose-600 text-white" },
  { badge: "TIP", label: "TipTap", desc: "Rich text editor", tint: "bg-violet-600 text-white" },
  { badge: "SHP", label: "Sharp", desc: "Image processing", tint: "bg-cyan-600 text-white" },
  { badge: "NOD", label: "Nodemailer", desc: "Email service", tint: "bg-amber-600 text-white" },
];

export default function TechStack() {
  return (
    <section id="tech-stack" className="mt-32">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
          Modern &amp; Robust Core Stack
        </h2>
        <p className="mt-4 text-stone-600 dark:text-stone-400">
          Built on the latest stable frameworks ensuring rapid rendering,
          maintainable styling, and database flexibility.
        </p>
      </div>

      <div className="mt-16 grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {tech.map((t) => (
          <div
            key={t.label}
            className="bg-white border border-stone-200 dark:border-stone-700/50 dark:bg-stone-900/80 p-6 rounded-2xl text-center flex flex-col items-center shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`h-12 w-12 flex items-center justify-center rounded-xl ${t.tint} font-black text-xs`}>
              {t.badge}
            </div>
            <h4 className="mt-4 text-sm font-bold text-stone-900 dark:text-white">{t.label}</h4>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{t.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
