import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import { getAuthorById, getPostsByAuthor } from "@/lib/data";
import { getSettings } from "@/lib/settings";

function formatDate(date: Date | string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function readingTime(content?: string) {
  if (!content) return null;
  const words = content.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const author = await getAuthorById(id);
  if (!author) return {};

  const name = author.fullName || author.username || "Author";
  const description = author.biography || `Articles by ${name}`;
  const s = await getSettings();
  const baseUrl = s.app_url || "http://localhost:3000";

  return {
    title: `${name} — Author`,
    description,
    authors: [{ name, url: `${baseUrl}/author/${id}` }],
    alternates: { canonical: `${baseUrl}/author/${id}` },
    openGraph: {
      type: "profile",
      siteName: s.site_name || "Pradha.id",
      title: `${name} — Author`,
      description,
      locale: "id_ID",
      url: `${baseUrl}/author/${id}`,
      images: author.image ? [{ url: author.image, width: 128, height: 128, alt: name }] : [],
    },
    twitter: {
      card: "summary",
      title: `${name} — Author`,
      description,
      images: author.image ? [author.image] : [],
    },
  };
}

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);

  const [author, postsResult] = await Promise.all([
    getAuthorById(id),
    getPostsByAuthor(id, currentPage, 12),
  ]);

  if (!author) notFound();

  const { posts, total, totalPages, page } = postsResult;
  const name = author.fullName || author.username || "Author";
  const initials = (name.trim().charAt(0) || "?").toUpperCase();
  const baseUrl = (await getSettings()).app_url || "http://localhost:3000";

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white dark:from-stone-950 dark:to-stone-900">
        {/* Author Hero */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            {/* Avatar */}
            {author.image ? (
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-lg dark:border-stone-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={author.image}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-white bg-orange-100 text-4xl font-bold text-orange-600 shadow-lg dark:border-stone-800 dark:bg-orange-500/20 dark:text-orange-400">
                {initials}
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl dark:text-white">
                {name}
              </h1>
              {author.username && (
                <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                  @{author.username}
                </p>
              )}
              {author.biography && (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600 dark:text-stone-400">
                  {author.biography}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-stone-500 dark:text-stone-400">
                {total > 0 && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    {total} {total === 1 ? "article" : "articles"}
                  </span>
                )}
                {author.created?.at && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    Joined {formatDate(author.created.at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Posts Grid */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-xl font-bold text-stone-900 dark:text-white">
            Articles by {name}
          </h2>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-12 text-center backdrop-blur-sm dark:border-stone-800/80 dark:bg-stone-900/80">
              <svg className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <p className="mt-4 text-stone-500 dark:text-stone-400">No articles published yet.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post: any) => {
                  const thumb = post.featuredImage?.url || null;
                  const cat = post.categories?.[0];
                  const rt = readingTime(post.content);

                  return (
                    <article
                      key={post._id}
                      className="group relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white/80 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-stone-200/50 dark:border-stone-800/80 dark:bg-stone-900/80 dark:hover:shadow-stone-800/50"
                    >
                      <Link href={`/read/${post.slug}`} className="block">
                        {/* Thumbnail */}
                        {thumb && (
                          <div className="relative h-48 overflow-hidden bg-stone-100 dark:bg-stone-800">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumb}
                              alt={post.featuredImage?.alt || post.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                            {cat && (
                              <span className="absolute left-3 top-3 rounded-full bg-orange-600/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                                {cat.name}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="p-5">
                          <div className="mb-2 flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
                            <span>{formatDate(post.published?.at || post.created?.at)}</span>
                            {rt && (
                              <>
                                <span>·</span>
                                <span>{rt}</span>
                              </>
                            )}
                          </div>
                          <h3 className="text-base font-bold leading-snug text-stone-900 transition-colors group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                              {post.excerpt}
                            </p>
                          )}
                          {!thumb && cat && (
                            <span className="mt-3 inline-block rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                              {cat.name}
                            </span>
                          )}
                        </div>
                      </Link>
                    </article>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2">
                  {page > 1 && (
                    <Link
                      href={`/author/${id}?page=${page - 1}`}
                      className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                    >
                      ← Previous
                    </Link>
                  )}
                  <span className="px-3 text-sm text-stone-500 dark:text-stone-400">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={`/author/${id}?page=${page + 1}`}
                      className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                    >
                      Next →
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
