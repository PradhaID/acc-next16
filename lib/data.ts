import { cache } from 'react';
import slugify from 'slugify';
import ConnectDB from './db';
import Page from '@/models/content/Page'
import Post from '@/models/content/Post'
import Category from '@/models/content/Category'
import User from '@/models/system/User'
import { getSettings } from '@/lib/settings';


export const getContentLanguage = cache(async (pathname: string): Promise<string> => {
  await ConnectDB();
  const clean = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  const defaultLang = "en_US";

  if (clean.startsWith("/read/")) {
    const slug = clean.slice("/read/".length);
    const post = await Post.findOne({ slug, isActive: true }).select("locale").lean();
    return (post?.locale as string) || defaultLang;
  }

  if (clean.startsWith("/category/")) {
    const slug = clean.slice("/category/".length);
    const cat = await Category.findOne({ slug, isActive: true }).select("locale").lean();
    return (cat?.locale as string) || defaultLang;
  }

  // Try to resolve as a page (supports nested paths)
  const segments = clean.split("/").filter(Boolean);
  const pages = await Page.find({ isActive: true, status: "published" })
    .select("slug parent locale")
    .lean();
  const pageBySlug = new Map(pages.map((p: any) => [p.slug, p]));

  let matched: any = null;
  for (const seg of segments) {
    const p = pageBySlug.get(seg);
    if (p) matched = p;
  }
  if (matched?.locale) return matched.locale;

  // Fall back to the site's default_locale setting
  const s = await getSettings();
  return (s.default_locale as string) || defaultLang;
});

export const getPostBySlug = cache(async (slug: string) => {
    await ConnectDB();
    const now = new Date();
    const post = await Post.findOne({
        slug,
        isActive: true,
        $or: [
            { status: 'published', 'published.at': { $lte: now } },
            { status: { $ne: 'published' } } // Still allow draft/archived if requested via ID in admin (but this is by slug, usually public)
        ]
    })
        .populate('categories', 'name slug')
        .populate('author', 'fullName username email image biography')
        .lean();

    if (!post) return null;

    return {
        ...post,
        _id: post._id.toString(),
        categories: post.categories?.map((cat: any) => ({
            ...cat,
            _id: cat._id.toString()
        })),
        author: post.author ? {
            ...post.author,
            _id: post.author._id.toString()
        } : null
    };
});

export const getLatestPosts = cache(async (limit = 5) => {
    await ConnectDB();
    const now = new Date();
    return await Post.find({
        status: 'published',
        isActive: true,
        'published.at': { $lte: now }
    })
        .populate("categories", "name slug parent")
        .sort({ 'published.at': -1 }) // Sort by published date
        .limit(limit)
        .lean();
});

export const getCategoriesWithCount = cache(async () => {
    await ConnectDB();

    // Get all active categories
    const categories = await Category.find({ isActive: true }).lean();

    // Aggregate posts count by category
    const postCounts = await Post.aggregate([
        {
            $match: {
                status: 'published',
                isActive: true,
                'published.at': { $lte: new Date() }
            }
        },
        {
            $unwind: '$categories'
        },
        {
            $group: {
                _id: '$categories',
                count: { $sum: 1 }
            }
        }
    ]);

    // Create a map of category ID to count
    const countMap = new Map(
        postCounts.map((item: any) => [item._id.toString(), item.count])
    );

    // Add counts to categories
    const categoriesWithCount = categories.map((cat: any) => ({
        ...cat,
        _id: cat._id.toString(),
        _count: {
            posts: countMap.get(cat._id.toString()) || 0
        }
    }));

    return categoriesWithCount;
});

export const getPageBySlug = cache(async (slugArray: string[]) => {
    await ConnectDB();
    const fullPath = slugArray.join('/');
    // Kita asumsikan ada field 'slug' yang menyimpan full path seperti 'tentang-kami/visi-misi'
    const page = await Page.findOne({ slug: fullPath, isActive: true })
        .populate('created.by', 'fullName')
        .lean();
    return page;
});

// Opsi: Ambil halaman-halaman yang merupakan "sibling" atau "children" dari parent yang sama
export const getRelatedPages = cache(async (parentSlug: string | null) => {
    await ConnectDB();
    return await Page.find({ parent: parentSlug, isActive: true }).select('title slug').lean();
});

export const getAllPages = cache(async () => {
    await ConnectDB();
    return await Page.find({
        status: { $in: ['published', 'PUBLISHED'] },
        isActive: true
    })
        .populate('parent', 'title slug')
        .sort({ menuOrder: 1 })
        .lean();
});

// Helper to build full path for a page
export const getPageFullPath = (page: any, allPages: any[]): string => {
    const buildPath = (currentPage: any): string[] => {
        const slugs = [currentPage.slug];

        if (currentPage.parent) {
            const parentPage = allPages.find((p: any) =>
                p._id.toString() === (currentPage.parent._id || currentPage.parent).toString()
            );

            if (parentPage) {
                slugs.unshift(...buildPath(parentPage));
            }
        }

        return slugs;
    };

    return buildPath(page).join('/');
};

// Get page by slug array (for catch-all routes)
export const getPageBySlugArray = cache(async (slugArray: string[]) => {
    await ConnectDB();

    // Add null/undefined check
    if (!slugArray || !Array.isArray(slugArray) || slugArray.length === 0) {
        return null;
    }

    const allPages = await Page.find({
        status: 'published',
        isActive: true
    })
        .populate('parent', 'title slug')
        .lean();

    // Find the page that matches the last slug in the array
    const targetSlug = slugArray[slugArray.length - 1];
    let matchedPage = null;

    for (const page of allPages) {
        if (page.slug === targetSlug) {
            // Verify the full path matches
            const fullPath = getPageFullPath(page, allPages);
            if (fullPath === slugArray.join('/')) {
                matchedPage = page;
                break;
            }
        }
    }

    return matchedPage;
});

export const getCategoryBySlug = cache(async (slug: string) => {
    await ConnectDB();
    const category = await Category.findOne({ slug, isActive: true }).lean();

    if (!category) return null;

    return {
        ...category,
        _id: category._id.toString(),
        parent: category.parent ? category.parent.toString() : null
    };
});

export const getPostsByCategory = cache(async (categoryId: string, page = 1, limit = 12) => {
    await ConnectDB();
    const skip = (page - 1) * limit;

    const now = new Date();
    const posts = await Post.find({
        categories: categoryId,
        status: 'published',
        isActive: true,
        'published.at': { $lte: now }
    })
        .populate('categories', 'name slug')
        .sort({ 'published.at': -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    return posts.map((post: any) => ({
        ...post,
        _id: post._id.toString(),
        categories: post.categories?.map((cat: any) => ({
            ...cat,
            _id: cat._id.toString()
        }))
    }));
});

export const getNavigationMenu = cache(async (group = 'main') => {
    await ConnectDB();

    // Get top-level pages for navigation (menuOrder determines position)
    const parentPages = await Page.find({
        status: 'published',
        isActive: true,
        parent: null,
        menuGroup: group
    })
        .sort({ menuOrder: 1 })
        .select('title slug')
        .lean();

    // Get children for each parent
    const navigation = await Promise.all(
        parentPages.map(async (parent: any) => {
            const children = await Page.find({
                status: 'published',
                isActive: true,
                parent: parent._id
            })
                .sort({ menuOrder: 1 })
                .select('title slug')
                .lean();

            return {
                name: parent.title,
                href: `/${parent.slug}`,
                ...(children.length > 0 && {
                    children: children.map((child: any) => ({
                        name: child.title,
                        href: `/${parent.slug}/${child.slug}`
                    }))
                })
            };
        })
    );

    return navigation;
});

export const getPageById = cache(async (id: string) => {
    await ConnectDB();
    const page = await Page.findById(id)
        .populate('parent', 'title slug')
        .populate('author', 'fullName username email image biography')
        .lean();

    if (!page) return null;

    return {
        ...page,
        _id: page._id.toString(),
    };
});


export const getPostsByTag = cache(async (tagSlug: string, page = 1, limit = 12) => {
    await ConnectDB();

    // 1. Resolve original tag from slug
    const allTags = await Post.distinct('tags', { status: 'published', isActive: true });
    const originalTag = allTags.find(tag =>
        slugify(tag, { lower: true, strict: true }) === tagSlug
    ) || tagSlug; // fallback to slug if no match (though shouldn't happen)

    const skip = (page - 1) * limit;

    const now = new Date();
    const posts = await Post.find({
        tags: originalTag,
        status: 'published',
        isActive: true,
        'published.at': { $lte: now }
    })
        .populate('categories', 'name slug')
        .sort({ 'published.at': -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    return posts.map((post: any) => ({
        ...post,
        _id: post._id.toString(),
        categories: post.categories?.map((cat: any) => ({
            ...cat,
            _id: cat._id.toString()
        }))
    }));
});

export const getAllTags = cache(async () => {
    await ConnectDB();
    const tags = await Post.distinct('tags', {
        status: 'published',
        isActive: true,
        'published.at': { $lte: new Date() }
    });
    return tags;
});

export const getPostsList = cache(async (opts: {
  page?: number;
  limit?: number;
  search?: string;
  categorySlug?: string;
} = {}) => {
  await ConnectDB();
  const page = Math.max(1, opts.page || 1);
  const limit = opts.limit || 9;
  const skip = (page - 1) * limit;
  const now = new Date();

  const match: any = {
    status: "published",
    isActive: true,
    "published.at": { $lte: now },
  };

  if (opts.search) {
    const re = { $regex: opts.search, $options: "i" };
    match.$or = [
      { title: re },
      { excerpt: re },
      { content: re },
      { tags: re },
    ];
  }

  if (opts.categorySlug) {
    const cat = await Category.findOne({ slug: opts.categorySlug, isActive: true }).lean();
    if (!cat) return { posts: [], total: 0, totalPages: 0, page, limit };
    match.categories = cat._id;
  }

  const [posts, total] = await Promise.all([
    Post.find(match)
      .populate("categories", "name slug")
      .populate("author", "fullName username")
      .sort({ "published.at": -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments(match),
  ]);

  return {
    posts: posts.map((post: any) => ({
      ...post,
      _id: post._id.toString(),
      categories: post.categories?.map((c: any) => ({ ...c, _id: c._id.toString() })),
    })),
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    page,
    limit,
  };
});

export const globalSearch = cache(async (query: string) => {
    await ConnectDB();

    const searchRegex = { $regex: query, $options: 'i' };

    // Search Posts
    const posts = await Post.find({
        $or: [
            { title: searchRegex },
            { excerpt: searchRegex },
            { content: searchRegex },
            { tags: searchRegex },
            { slug: searchRegex }
        ],
        status: 'published',
        isActive: true,
        'published.at': { $lte: new Date() }
    })
        .populate('categories', 'name slug')
        .limit(10)
        .lean();

    // Search Pages
    const pages = await Page.find({
        $or: [
            { title: searchRegex },
            { excerpt: searchRegex },
            { content: searchRegex },
            { slug: searchRegex }
        ],
        status: 'published',
        isActive: true
    })
        .limit(10)
        .lean();

    // Search Categories
    const categories = await Category.find({
        $or: [
            { name: searchRegex },
            { description: searchRegex },
            { slug: searchRegex }
        ],
        isActive: true
    })
        .limit(5)
        .lean();

    return {
        posts: posts.map((p: any) => ({ ...p, _id: p._id.toString(), type: 'post' })),
        pages: pages.map((p: any) => ({ ...p, _id: p._id.toString(), type: 'page' })),
        categories: categories.map((c: any) => ({ ...c, _id: c._id.toString(), type: 'category' }))
    };
});


export const getAuthorById = cache(async (id: string) => {
    await ConnectDB();
    const author = await User.findById(id).lean();

    if (!author) return null;

    return {
        ...author,
        _id: author._id.toString(),
    };
});

export const getPostsByAuthor = cache(async (authorId: string, page = 1, limit = 12) => {
    await ConnectDB();
    const skip = (page - 1) * limit;

    const now = new Date();
    const match = {
        author: authorId,
        status: 'published',
        isActive: true,
        'published.at': { $lte: now }
    };

    const [posts, total] = await Promise.all([
        Post.find(match)
            .populate('categories', 'name slug')
            .sort({ 'published.at': -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Post.countDocuments(match),
    ]);

    return {
        posts: posts.map((post: any) => ({
            ...post,
            _id: post._id.toString(),
            categories: post.categories?.map((cat: any) => ({
                ...cat,
                _id: cat._id.toString()
            }))
        })),
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        page,
        limit,
    };
});

