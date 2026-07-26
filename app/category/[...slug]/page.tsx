import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicSidebar from "@/components/public/PublicSidebarWidgets";
import ConnectDB from "@/lib/db";
import Category from "@/models/content/Category";
import Post from "@/models/content/Post";
import { getSettings } from "@/lib/settings";

async function resolveCategory(slugArray: string[]) {
  await ConnectDB();
  const targetSlug = slugArray[slugArray.length - 1];

  const allCategories = await Category.find({ isActive: true })
    .populate("parent", "slug")
    .lean();

  for (const cat of allCategories) {
    if (cat.slug !== targetSlug) continue;

    const path: string[] = [cat.slug];
    let current = cat;
    while (current.parent) {
      const parentId = current.parent._id?.toString() || current.parent.toString();
      const parent = allCategories.find((c: any) => c._id.toString() === parentId);
      if (!parent) break;
      path.unshift(parent.slug);
      current = parent;
    }

    if (path.join("/") === slugArray.join("/")) {
      return {
        ...cat,
        _id: cat._id.toString(),
        parent: cat.parent ? { _id: cat.parent._id?.toString() || cat.parent.toString(), slug: cat.parent.slug || "" } : null,
      };
    }
  }

  return null;
}

async function getPostsByCategoryId(categoryId: string, limit = 50) {
  await ConnectDB();
  const now = new Date();
  const posts = await Post.find({
    categories: categoryId,
    status: "published",
    isActive: true,
    "published.at": { $lte: now },
  })
    .populate("categories", "name slug")
    .populate("author", "fullName username")
    .sort({ "published.at": -1 })
    .limit(limit)
    .lean();

  return posts.map((post: any) => ({
    ...post,
    _id: post._id.toString(),
    categories: post.categories?.map((c: any) => ({ ...c, _id: c._id.toString() })),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await resolveCategory(slug);
  if (!category) return {};

  const meta = category.meta || {};
  const title = meta.title || category.name;
  const description = meta.description || category.description || `Articles in ${category.name}`;
  const s = await getSettings();
  const baseUrl = s.app_url || "";
  const path = `category/${slug.join("/")}`;

  return {
    title,
    description,
    keywords: meta.keywords?.join(", "),
    openGraph: {
      title,
      description,
      type: "website",
      url: baseUrl ? `${baseUrl}/${path}` : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: baseUrl ? `${baseUrl}/${path}` : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const category = await resolveCategory(slug);

  if (!category || !category.isActive) {
    notFound();
  }

  const posts = await getPostsByCategoryId(category._id);
  const path = `category/${slug.join("/")}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.description || "",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/${path}`,
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50 transition-colors duration-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHeader />

      <main className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:py-20">
        <div className="flex gap-10">
          {/* Content */}
          <div className="min-w-0 flex-1 max-w-4xl">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
              <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Home</Link>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              <Link href="/category" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Categories</Link>
              {slug.length > 1 && slug.slice(0, -1).map((seg, i) => (
                <span key={i} className="flex items-center gap-2">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  <Link href={`/category/${slug.slice(0, i + 1).join("/")}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors capitalize">{seg.replace(/-/g, " ")}</Link>
                </span>
              ))}
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              <span className="text-stone-500 dark:text-stone-400">{category.name}</span>
            </nav>

            <div className="mb-10">
              <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
                {category.name}
              </h1>
              {category.description && (
                <p className="mt-3 text-base text-stone-500 dark:text-stone-400">{category.description}</p>
              )}
              <p className="mt-2 text-sm text-stone-400 dark:text-stone-500">{posts.length} article{posts.length !== 1 ? "s" : ""}</p>
            </div>

            {posts.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center dark:border-stone-800 dark:bg-stone-900">
                <svg className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">No articles in this category yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post: any) => (
                  <Link
                    key={post._id}
                    href={`/read/${post.slug}`}
                    className="group block rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-stone-800 dark:bg-stone-900 dark:hover:shadow-stone-900/50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {post.featuredImage?.url && (
                        <div className="sm:w-40 sm:h-28 shrink-0 overflow-hidden rounded-xl">
                          <img
                            src={post.featuredImage.url}
                            alt={post.featuredImage.alt || post.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-stone-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {post.title}
                        </h2>
                        {post.excerpt && (
                          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400 line-clamp-2">{post.excerpt}</p>
                        )}
                        <div className="mt-3 flex items-center gap-3 text-xs text-stone-400 dark:text-stone-500">
                          {post.author && (
                            <span>{post.author.fullName || post.author.username}</span>
                          )}
                          {post.published?.at && (
                            <time dateTime={new Date(post.published.at).toISOString()}>
                              {formatDate(post.published.at)}
                            </time>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden w-80 shrink-0 lg:block">
            <div className="sticky top-24">
              <PublicSidebar activeCategoryIds={[category._id]} />
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
