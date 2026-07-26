import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicSidebar from "@/components/public/PublicSidebarWidgets";
import { getPostBySlug } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { processArticleHtml } from "@/lib/article-html";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.status !== "published") return {};

  const meta = post.meta || {};
  const title = meta.title || post.title;
  const description = meta.description || post.excerpt || "";
  const s = await getSettings();
  const baseUrl = s.app_url || "http://localhost:3000";
  // Prefer the generated composite social image; fall back to the raw cover,
  // then to the logo.
  const social = post.featuredImage?.social?.og;
  const cover = post.featuredImage?.url;
  const ogImage = social
    ? `${baseUrl}${social}`
    : cover
      ? `${baseUrl}${cover}`
      : "/img/logo.png";
  const twitterImage = social
    ? `${baseUrl}${social}`
    : cover
      ? `${baseUrl}${cover}`
      : "/img/logo.png";

  return {
    title,
    description,
    keywords: [...(meta.keywords || []), ...(post.tags || [])].join(", "),
    openGraph: {
      title,
      description,
      type: "article",
      url: baseUrl ? `${baseUrl}/read/${post.slug}` : undefined,
      publishedTime: post.published?.at ? new Date(post.published.at).toISOString() : undefined,
      modifiedTime: post.updated?.at ? new Date(post.updated.at).toISOString() : undefined,
      authors: post.author ? [post.author.fullName || post.author.username] : undefined,
      tags: post.tags || undefined,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.featuredImage?.alt || title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: twitterImage, width: 1200, height: 600, alt: post.featuredImage?.alt || title }],
    },
    alternates: {
      canonical: baseUrl ? `${baseUrl}/read/${post.slug}` : undefined,
    },
  };
}

export default async function ReadPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.status !== "published" || !post.isActive) {
    notFound();
  }

  const meta = post.meta || {};
  const s = await getSettings();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: meta.description || post.excerpt || "",
    url: `${s.app_url || ""}/read/${post.slug}`,
    image: post.featuredImage?.url || undefined,
    datePublished: post.published?.at || undefined,
    dateModified: post.updated?.at || undefined,
    author: post.author
      ? {
          "@type": "Person",
          name: post.author.fullName || post.author.username,
          email: post.author.email,
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: s.app_name || "boilerplate-next16",
    },
    keywords: post.tags?.join(", ") || undefined,
    articleSection: post.categories?.map((c: any) => c.name) || undefined,
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  // Relative "time ago" formatter: "just now", "5 minutes ago", "3 hours ago",
  // "2 days ago"; falls back to an absolute date for older posts.
  const timeAgo = (date: Date | string | null) => {
    if (!date) return "";
    const then = new Date(date).getTime();
    if (isNaN(then)) return "";
    const diff = Math.max(0, Date.now() - then);
    const sec = Math.floor(diff / 1000);
    if (sec < 45) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} minute${min > 1 ? "s" : ""} ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr > 1 ? "s" : ""} ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day} day${day > 1 ? "s" : ""} ago`;
    return formatDate(date) ?? "";
  };

  const processedContent = await processArticleHtml(post.content || "");

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
            <nav className="mb-8 flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
              <Link href="/" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">Home</Link>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              <span className="text-stone-500 dark:text-stone-400">Posts</span>
            </nav>

            {/* Categories */}
            {post.categories && post.categories.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {post.categories.map((cat: any) => (
                  <Link
                    key={cat._id}
                    href={`/category/${cat.slug}`}
                    className="inline-flex items-center rounded-full border border-orange-200/60 bg-orange-50/50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-800/30 dark:bg-orange-950/30 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}

            <article lang={post.locale ? post.locale.replace("_", "-") : undefined}>
              <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl lg:text-5xl">
                {post.title}
              </h1>

              {/* Meta row */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-400 dark:text-stone-500">
                {post.author && (
                  <Link href={`/author/${post.author._id}`} className="flex items-center gap-1.5 group/author hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                    {post.author.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.author.image}
                        alt={post.author.fullName || post.author.username || "Author"}
                        className="h-6 w-6 rounded-full object-cover ring-1 ring-stone-200 dark:ring-stone-700"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                        {((post.author.fullName || post.author.username || "?").trim().charAt(0) || "?").toUpperCase()}
                      </span>
                    )}
                    <span className="group-hover/author:underline underline-offset-2">{post.author.fullName?.trim() || post.author.username || "Aditya Pradhana"}</span>
                  </Link>
                )}
                {post.published?.at && (
                  <>
                    <span className="text-stone-300 dark:text-stone-600">/</span>
                    <time dateTime={new Date(post.published.at).toISOString()}>
                      {timeAgo(post.published.at)}
                    </time>
                  </>
                )}
              </div>

               {/* Featured image */}
               {post.featuredImage?.url && (
                 <figure className="mt-8">
                   <div className="aspect-[1200/630] w-full overflow-hidden rounded-2xl shadow-sm">
                     <img
                       src={post.featuredImage.url}
                       alt={post.featuredImage.alt || post.title}
                       className="h-full w-full object-cover"
                       loading="eager"
                       fetchPriority="high"
                     />
                   </div>
                   {post.featuredImage.alt && (
                     <figcaption className="mt-2 text-center text-xs text-stone-400">{post.featuredImage.alt}</figcaption>
                   )}
                 </figure>
               )}

               {/* Content */}
               <div className="prose mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: processedContent }} />

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-10 border-t border-stone-200 dark:border-stone-800 pt-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                    {post.tags.map((tag: string) => {
                      const tagSlug = tag.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
                      return (
                        <Link
                          key={tag}
                          href={`/tag/${tagSlug}`}
                          className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 transition-colors hover:border-orange-300 hover:text-orange-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-orange-700 dark:hover:text-orange-400"
                        >
                          {tag}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          </div>

          {/* Sidebar */}
          <div className="hidden w-80 shrink-0 lg:block">
            <div className="sticky top-24">
              <PublicSidebar activeCategoryIds={post.categories?.map((c: any) => c._id)} excludePostId={post._id} />
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
