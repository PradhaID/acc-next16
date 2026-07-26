import Link from "next/link";
import ConnectDB from "@/lib/db";
import Page from "@/models/content/Page";

interface NavPage {
  _id: string;
  title: string;
  slug: string;
  menuOrder: number;
  parent: string | null;
  menuGroup: string;
}

interface NavItem extends NavPage {
  children: NavItem[];
}

async function getAllPages(): Promise<NavPage[]> {
  await ConnectDB();
  const pages = await Page.find({
    status: "published",
    isActive: true,
  })
    .select("title slug menuOrder parent menuGroup")
    .sort({ menuOrder: 1 })
    .lean();
  return pages.map((p: any) => ({
    _id: p._id.toString(),
    title: p.title,
    slug: p.slug,
    menuOrder: p.menuOrder,
    parent: p.parent ? p.parent.toString() : null,
    menuGroup: p.menuGroup || "main",
  }));
}

function buildTree(pages: NavPage[]): NavItem[] {
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

interface PublicSidebarProps {
  currentPath: string;
}

export default async function PublicSidebar({ currentPath }: PublicSidebarProps) {
  const allPages = await getAllPages();
  const mainPages = allPages.filter((p) => p.menuGroup === "main");
  const secondaryPages = allPages.filter((p) => p.menuGroup === "secondary");
  const mainTree = buildTree(mainPages);
  const secondaryTree = buildTree(secondaryPages);

  function renderItem(item: NavItem): React.ReactNode {
    const fullPath = getFullSlug(item, allPages);
    const isActive = currentPath === fullPath;
    const isParentActive = currentPath.startsWith(fullPath + "/");

    if (item.children.length === 0) {
      return (
        <li key={item._id}>
          <Link
            href={`/${fullPath}`}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
            }`}
          >
            {item.title}
          </Link>
        </li>
      );
    }

    return (
      <li key={item._id}>
        <Link
          href={`/${fullPath}`}
          className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
            isActive || isParentActive
              ? "text-stone-900 dark:text-white"
              : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
          }`}
        >
          {item.title}
        </Link>
        <ul className="mt-0.5 ml-3 border-l border-stone-200 dark:border-stone-800 pl-3 space-y-0.5">
          {item.children.map((child) => renderItem(child))}
        </ul>
      </li>
    );
  }

  if (mainTree.length === 0 && secondaryTree.length === 0) return null;

  return (
    <nav className="w-56 shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-6">
        {mainTree.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Menu</p>
            <ul className="space-y-0.5">
              {mainTree.map((item) => renderItem(item))}
            </ul>
          </div>
        )}
        {secondaryTree.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">More</p>
            <ul className="space-y-0.5">
              {secondaryTree.map((item) => renderItem(item))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
