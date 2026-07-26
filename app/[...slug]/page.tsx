import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicSidebar from "@/components/public/PublicSidebar";
import { getPageBySlugArray } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { processArticleHtml } from "@/lib/article-html";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlugArray(slug);
  if (!page || page.status !== "published") return {};

  const meta = page.meta || {};
  const title = meta.title || page.title;
  const description = meta.description || page.excerpt || "";
  const s = await getSettings();
  const baseUrl = s.app_url || "http://localhost:3000";
  const path = slug.join("/");
  // Use the cover image directly as the social-share image (Facebook
  // accepts WebP, only warning about size). Fall back to the default OG image.
  const cover = page.featuredImage?.url;
  const ogImage = cover ? `${baseUrl}${cover}` : "/opengraph-image";
  const twitterImage = cover ? `${baseUrl}${cover}` : "/opengraph-image";

  return {
    title,
    description,
    keywords: meta.keywords?.join(", "),
    openGraph: {
      title,
      description,
      type: "website",
      url: baseUrl ? `${baseUrl}/${path}` : undefined,
      images: [{ url: ogImage, width: 1200, height: 630, alt: page.featuredImage?.alt || title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: twitterImage, width: 1200, height: 630, alt: page.featuredImage?.alt || title }],
    },
    alternates: {
      canonical: baseUrl ? `${baseUrl}/${path}` : undefined,
    },
  };
}

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const page = await getPageBySlugArray(slug);

  if (!page || page.status !== "published" || !page.isActive) {
    notFound();
  }

  const meta = page.meta || {};
  const path = slug.join("/");
  const processedContent = await processArticleHtml(page.content || "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": page.structuredData?.type || "WebPage",
    name: page.title,
    description: meta.description || page.excerpt || "",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/${path}`,
    image: page.featuredImage?.url || undefined,
    datePublished: page.published?.at || undefined,
    dateModified: page.updated?.at || undefined,
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50 transition-colors duration-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHeader />

      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="flex gap-10 py-16 lg:py-20">
          <PublicSidebar currentPath={path} />

          <main className="flex-1 min-w-0 max-w-4xl">
            {page.featuredImage?.url && (
              <figure className="mb-8">
                <div className="aspect-[1200/630] w-full overflow-hidden rounded-2xl shadow-sm">
                  <img
                    src={page.featuredImage.url}
                    alt={page.featuredImage.alt || page.title}
                    className="h-full w-full object-cover"
                    loading="eager"
                    fetchPriority="high"
                  />
                </div>
                {page.featuredImage.alt && (
                  <figcaption className="mt-2 text-center text-xs text-stone-400">{page.featuredImage.alt}</figcaption>
                )}
              </figure>
            )}

            <article lang={page.locale ? page.locale.replace("_", "-") : undefined}>
              <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl lg:text-5xl">
                {page.title}
              </h1>
              {page.published?.at && (
                <time className="mt-3 block text-sm text-stone-400 dark:text-stone-500" dateTime={new Date(page.published.at).toISOString()}>
                  Published {new Date(page.published.at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </time>
              )}
              <div className="prose mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: processedContent }} />
            </article>
          </main>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
