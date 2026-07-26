import Link from "next/link";
import ConnectDB from "@/lib/db";
import Page from "@/models/content/Page";

async function getFooterPages() {
  await ConnectDB();
  const pages = await Page.find({
    menuGroup: "secondary",
    status: "published",
    isActive: true,
  })
    .select("title slug menuOrder")
    .sort({ menuOrder: 1 })
    .lean();
  return pages.map((p: any) => ({
    title: p.title,
    slug: p.slug,
  }));
}

export default async function PublicFooter() {
  const year = new Date().getFullYear();
  const pages = await getFooterPages();

  return (
    <footer className="border-t border-stone-200/50 bg-white/50 dark:border-stone-800/50 dark:bg-stone-950/50">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="flex items-center gap-3">
            <img src="/img/logo.webp" alt="Logo" width="32" height="32" className="h-8 w-8 rounded-lg object-contain shadow-sm" />
            <span className="text-sm font-bold text-stone-900 dark:text-white">
              {process.env.NEXT_PUBLIC_APP_NAME || "Pradha Finance"}
            </span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-stone-500 dark:text-stone-400">
            {pages.map((page) => (
              <Link
                key={page.slug}
                href={`/${page.slug}`}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                {page.title}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 border-t border-stone-100 dark:border-stone-800 pt-6 text-center">
          <p className="text-xs text-stone-400 dark:text-stone-500">
            &copy; {year} {process.env.NEXT_PUBLIC_APP_NAME || "Pradha Finance"}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
