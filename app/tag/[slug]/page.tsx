import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import slugify from "slugify";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import { getPostsByTag, getAllTags } from "@/lib/data";
import { getSettings } from "@/lib/settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const allTags = await getAllTags();
  const tagName = allTags.find((t) => slugify(t, { lower: true, strict: true }) === slug);

  if (!tagName) return {};

  const description = `Articles tagged "${tagName}"`;
  const s = await getSettings();
  const baseUrl = s.app_url || "";

  return {
    title: tagName,
    description,
    openGraph: {
      title: tagName,
      description,
      type: "website",
      url: baseUrl ? `${baseUrl}/tag/${slug}` : undefined,
    },
    twitter: {
      card: "summary",
      title: tagName,
      description,
    },
    alternates: {
      canonical: baseUrl ? `${baseUrl}/tag/${slug}` : undefined,
    },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const allTags = await getAllTags();
  const tagName = allTags.find((t) => slugify(t, { lower: true, strict: true }) === slug);

  if (!tagName) {
    notFound();
  }

  const posts = await getPostsByTag(slug, 1, 50);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: tagName,
    description: `Articles tagged "${tagName}"`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/tag/${slug}`,
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

      <main className="mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:py-20">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
          <Link href="/" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">Home</Link>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="text-stone-500 dark:text-stone-400">Tags</span>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="text-stone-500 dark:text-stone-400">{tagName}</span>
        </nav>

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-orange-50/50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-800/30 dark:bg-orange-950/30 dark:text-orange-400 mb-4">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            Tag
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
            {tagName}
          </h1>
          <p className="mt-2 text-sm text-stone-400 dark:text-stone-500">{posts.length} article{posts.length !== 1 ? "s" : ""}</p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center dark:border-stone-800 dark:bg-stone-900">
            <svg className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">No articles with this tag yet.</p>
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
                    <h2 className="text-lg font-bold text-stone-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400 line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-400 dark:text-stone-500">
                      {post.author && (
                        <span>{post.author.fullName || post.author.username}</span>
                      )}
                      {post.published?.at && (
                        <time dateTime={new Date(post.published.at).toISOString()}>
                          {formatDate(post.published.at)}
                        </time>
                      )}
                      {post.categories && post.categories.length > 0 && (
                        <span className="flex items-center gap-1">
                          {post.categories.map((cat: any, i: number) => (
                            <span key={cat._id}>
                              {i > 0 && ", "}
                              {cat.name}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
