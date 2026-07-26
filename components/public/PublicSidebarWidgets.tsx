import Link from "next/link";
import ConnectDB from "@/lib/db";
import Post from "@/models/content/Post";
import Category from "@/models/content/Category";

async function getLatestPostsForSidebar(limit = 5, excludeId?: string) {
  await ConnectDB();
  const now = new Date();
  const query: any = {
    status: "published",
    isActive: true,
    "published.at": { $lte: now },
  };
  if (excludeId) query._id = { $ne: excludeId };

  const posts = await Post.find(query)
    .sort({ "published.at": -1 })
    .limit(limit)
    .select("title slug published.at featuredImage")
    .lean();

  return posts.map((p: any) => ({
    title: p.title,
    slug: p.slug,
    date: p.published?.at,
    thumbnail: p.featuredImage?.url || null,
  }));
}

async function getCategoryTree() {
  await ConnectDB();
  const categories = await Category.find({ isActive: true })
    .populate("parent", "_id")
    .sort({ name: 1 })
    .lean();

  const postCounts = await Post.aggregate([
    { $match: { status: "published", isActive: true, "published.at": { $lte: new Date() } } },
    { $unwind: "$categories" },
    { $group: { _id: "$categories", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(postCounts.map((i: any) => [i._id.toString(), i.count]));

  const roots: any[] = [];
  const map = new Map<string, any>();

  for (const cat of categories) {
    const id = cat._id.toString();
    const parentId = cat.parent?._id?.toString() || cat.parent?.toString() || null;
    map.set(id, {
      _id: id,
      name: cat.name,
      slug: cat.slug,
      postCount: countMap.get(id) || 0,
      children: [],
      parentId,
    });
  }

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

async function getTagsWithCount() {
  await ConnectDB();
  const result = await Post.aggregate([
    { $match: { status: "published", isActive: true, "published.at": { $lte: new Date() } } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 30 },
  ]);
  return result.map((t: any) => ({ name: t._id, count: t.count }));
}

const WIDGET_STYLE =
  "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900";

const SECTION_TITLE = "text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3";

async function LatestPostsWidget({ excludeId }: { excludeId?: string }) {
  const posts = await getLatestPostsForSidebar(5, excludeId);

  return (
    <div className={WIDGET_STYLE}>
      <h3 className={SECTION_TITLE}>Latest Posts</h3>
      <div className="space-y-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/read/${post.slug}`}
            className="group flex gap-3"
          >
            {post.thumbnail ? (
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                <img
                  src={post.thumbnail}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800">
                <svg className="h-5 w-5 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-stone-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                {post.title}
              </p>
              {post.date && (
                <p className="mt-0.5 text-[10px] text-stone-400 dark:text-stone-500">
                  {new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          </Link>
        ))}
        {posts.length === 0 && (
          <p className="text-xs text-stone-400 italic">No posts yet.</p>
        )}
      </div>
    </div>
  );
}

function CategoryNode({ node, activeCategoryIds, depth = 0 }: { node: any; activeCategoryIds?: string[]; depth?: number }) {
  const isActive = Array.isArray(activeCategoryIds) && activeCategoryIds.includes(node._id);

  return (
    <div>
      <Link
        href={`/category/${node.slug}`}
        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
          isActive
            ? "bg-emerald-50 text-emerald-700 font-bold dark:bg-emerald-950/50 dark:text-emerald-400"
            : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.children.length > 0 ? (
          <svg className={`h-3 w-3 shrink-0 ${isActive ? "text-emerald-500" : "text-stone-300 dark:text-stone-600"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        ) : (
          <span className="w-3" />
        )}
        <span className="flex-1 truncate">{node.name}</span>
        {node.postCount > 0 && (
          <span className="text-[10px] text-stone-300 dark:text-stone-600 tabular-nums">{node.postCount}</span>
        )}
      </Link>
      {node.children.length > 0 && (
        <div>
          {node.children.map((child: any) => (
            <CategoryNode key={child._id} node={child} activeCategoryIds={activeCategoryIds} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

async function CategoryTreeWidget({ activeCategoryIds }: { activeCategoryIds?: string[] }) {
  const tree = await getCategoryTree();

  return (
    <div className={WIDGET_STYLE}>
      <h3 className={SECTION_TITLE}>Categories</h3>
      <div className="space-y-0.5">
        {tree.map((node) => (
          <CategoryNode key={node._id} node={node} activeCategoryIds={activeCategoryIds} />
        ))}
        {tree.length === 0 && (
          <p className="text-xs text-stone-400 italic">No categories yet.</p>
        )}
      </div>
    </div>
  );
}

async function TagsCloudWidget() {
  const tags = await getTagsWithCount();

  return (
    <div className={WIDGET_STYLE}>
      <h3 className={SECTION_TITLE}>Tags</h3>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const tagSlug = tag.name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
          let size = "text-xs px-2 py-0.5";
          if (tag.count >= 10) size = "text-sm px-2.5 py-1 font-bold";
          else if (tag.count >= 5) size = "text-xs px-2.5 py-0.5 font-semibold";

          return (
            <Link
              key={tag.name}
              href={`/tag/${tagSlug}`}
              className={`inline-flex items-center rounded-lg border border-stone-200 bg-stone-50 text-stone-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 ${size}`}
            >
              {tag.name}
            </Link>
          );
        })}
        {tags.length === 0 && (
          <p className="text-xs text-stone-400 italic">No tags yet.</p>
        )}
      </div>
    </div>
  );
}

export default async function PublicSidebar({ activeCategoryIds, excludePostId }: { activeCategoryIds?: string[]; excludePostId?: string }) {
  return (
    <aside className="space-y-6">
      <LatestPostsWidget excludeId={excludePostId} />
      <CategoryTreeWidget activeCategoryIds={activeCategoryIds} />
      <TagsCloudWidget />
    </aside>
  );
}
