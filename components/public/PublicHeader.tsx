import Link from "next/link";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getSetting } from "@/lib/settings";
import ConnectDB from "@/lib/db";
import Page from "@/models/content/Page";
import UserMenu from "./UserMenu";
import ThemeToggle from "@/components/ui/ThemeToggle";

interface NavPage {
  _id: string;
  title: string;
  slug: string;
  menuOrder: number;
  parent: string | null;
}

interface NavItem extends NavPage {
  children: NavItem[];
}

async function getNavPages(): Promise<NavPage[]> {
  await ConnectDB();
  const pages = await Page.find({
    menuGroup: "main",
    status: "published",
    isActive: true,
  })
    .select("title slug menuOrder parent")
    .sort({ menuOrder: 1 })
    .lean();
  return pages.map((p: any) => ({
    _id: p._id.toString(),
    title: p.title,
    slug: p.slug,
    menuOrder: p.menuOrder,
    parent: p.parent ? p.parent.toString() : null,
  }));
}

function buildNavTree(pages: NavPage[]): NavItem[] {
  const map = new Map<string, NavItem>();
  const roots: NavItem[] = [];

  for (const page of pages) {
    map.set(page._id, { ...page, children: [] });
  }

  for (const page of pages) {
    const node = map.get(page._id)!;
    if (page.parent && map.has(page.parent)) {
      map.get(page.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function getFullSlug(page: NavPage, pages: NavPage[]): string {
  const chain: string[] = [page.slug];
  let current = page;
  while (current.parent) {
    const parent = pages.find((p) => p._id === current.parent);
    if (!parent) break;
    chain.unshift(parent.slug);
    current = parent;
  }
  return chain.join("/");
}

function NavItemLink({ item, allPages }: { item: NavItem; allPages: NavPage[] }) {
  const fullPath = getFullSlug(item, allPages);

  if (item.children.length === 0) {
    return (
      <Link
        href={`/${fullPath}`}
        className="text-sm font-medium text-stone-600 hover:text-emerald-600 dark:text-stone-300 dark:hover:text-emerald-400 transition-colors"
      >
        {item.title}
      </Link>
    );
  }

  return (
    <div className="relative group">
      <button className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-emerald-600 dark:text-stone-300 dark:hover:text-emerald-400 transition-colors">
        {item.title}
        <svg className="h-3.5 w-3.5 text-stone-400 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg transition-all dark:border-stone-700 dark:bg-stone-900">
        <Link
          href={`/${fullPath}`}
          className="block rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-emerald-50 hover:text-emerald-600 dark:text-stone-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors"
        >
          {item.title}
        </Link>
        {item.children.map((child) => (
          <Link
            key={child._id}
            href={`/${getFullSlug(child, allPages)}`}
            className="block rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-emerald-50 hover:text-emerald-600 dark:text-stone-400 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors"
          >
            {child.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function PublicHeader() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const user = token ? await verifyToken(token) : null;

  let userImage: string | null = null;
  if (user) {
    const db = await getDb();
    const doc = await db.collection("systemUsers").findOne(
      { _id: new ObjectId(user.userId) },
      { projection: { image: 1 } }
    );
    userImage = doc?.image || null;
  }

  const enableSignup = await getSetting("enable_signup");
  const pages = await getNavPages();
  const navTree = buildNavTree(pages);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200/50 bg-white/70 backdrop-blur-md dark:border-stone-800/50 dark:bg-stone-950/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img src="/img/logo.webp" alt="Logo" width="36" height="36" className="h-9 w-9 rounded-xl object-contain shadow-md shadow-emerald-500/25" />
          <span className="text-lg font-bold tracking-tight text-stone-900 dark:text-white">
            {process.env.NEXT_PUBLIC_APP_NAME || "Pradha Finance"}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-stone-600 hover:text-emerald-600 dark:text-stone-300 dark:hover:text-emerald-400 transition-colors">
            Home
          </Link>
          {navTree.map((item) => (
            <NavItemLink key={item._id} item={item} allPages={pages} />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="flex items-center gap-4">
            {user ? (
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 hover:shadow-md hover:shadow-emerald-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                Go to Dashboard
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <UserMenu
                fullName={user.fullName || ""}
                username={user.username || ""}
                email={user.email || ""}
                image={userImage}
              />
            </div>
          ) : (
            <>
              <Link
                href="/account/signin"
                className="text-sm font-semibold text-stone-700 hover:text-emerald-600 dark:text-stone-300 dark:hover:text-emerald-400 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/account/signup"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-100"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
        </div>
      </div>

      {/* Mobile nav */}
      {navTree.length > 0 && (
        <div className="md:hidden border-t border-stone-100 dark:border-stone-800 px-6 py-3">
          <MobileNav items={navTree} allPages={pages} />
        </div>
      )}
    </header>
  );
}

function MobileNav({ items, allPages }: { items: NavItem[]; allPages: NavPage[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <Link href="/" className="text-sm font-medium text-stone-600 hover:text-emerald-600 dark:text-stone-300 dark:hover:text-emerald-400 transition-colors">
        Home
      </Link>
      {items.map((item) => (
        <MobileNavItem key={item._id} item={item} allPages={allPages} />
      ))}
    </div>
  );
}

function MobileNavItem({ item, allPages }: { item: NavItem; allPages: NavPage[] }) {
  const fullPath = getFullSlug(item, allPages);

  if (item.children.length === 0) {
    return (
      <Link
        href={`/${fullPath}`}
        className="text-sm font-medium text-stone-600 hover:text-emerald-600 dark:text-stone-300 dark:hover:text-emerald-400 transition-colors"
      >
        {item.title}
      </Link>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Link
        href={`/${fullPath}`}
        className="text-sm font-medium text-stone-600 hover:text-emerald-600 dark:text-stone-300 dark:hover:text-emerald-400 transition-colors"
      >
        {item.title}
      </Link>
      {item.children.map((child) => (
        <Link
          key={child._id}
          href={`/${getFullSlug(child, allPages)}`}
          className="text-sm text-stone-500 hover:text-emerald-600 dark:text-stone-400 dark:hover:text-emerald-400 transition-colors"
        >
          {child.title}
        </Link>
      ))}
    </span>
  );
}
