import Post from "@/models/content/Post";
import Page from "@/models/content/Page";
import Media from "@/models/content/Media";
import Category from "@/models/content/Category";
import connectDB from "@/lib/db";
import { getSetting } from "@/lib/settings";
import slugify from "slugify";
import fs from "fs";
import { join } from "path";
import { writeFile } from "fs/promises";
import sharp from "sharp";

/* ============================================================
   TYPES
   ============================================================ */
interface SearchResult {
    title: string;
    url: string;
    content: string;
    publishedDate?: string;
}

interface ArticleResult {
    judul: string;
    excerpt: string;
    konten: string;
    keywords: string[];
    categoryNames: string[];
    sources: SearchResult[];
}

/* ============================================================
   PROVIDER DETECTION
   ============================================================ */
type Provider = "ollama" | "openai-compatible";

function detectProvider(url: string): Provider {
    const lower = url.toLowerCase();
    if (lower.includes("localhost:11434") || lower.includes("127.0.0.1:11434")) return "ollama";
    return "openai-compatible";
}

/* ============================================================
   HELPER: CALL AI (MULTI-PROVIDER)
   ============================================================ */
async function callAI(prompt: string, settings: { ai_url: string; ai_api_key: string; ai_model: string }): Promise<string> {
    const provider = detectProvider(settings.ai_url);
    const baseUrl = settings.ai_url.replace(/\/+$/, "");

    if (provider === "ollama") {
        const res = await fetch(`${baseUrl}/api/generate`, {
            method: "POST",
            body: JSON.stringify({
                model: settings.ai_model,
                prompt,
                stream: true,
                format: "json",
                options: { num_thread: 6, num_ctx: 32768, num_predict: 4000, temperature: 0.5 }
            })
        });
        if (!res.body) throw new Error("Ollama stream body is empty");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
                if (!line.trim()) continue;
                try {
                    const p = JSON.parse(line);
                    if (p.response) full += p.response;
                    if (p.done) break;
                } catch {}
            }
        }
        return full;
    }

    // OpenAI-compatible (OpenAI, OpenRouter, Groq, Together, LM Studio, etc.)
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.ai_api_key) headers["Authorization"] = `Bearer ${settings.ai_api_key}`;

    let url = baseUrl;
    if (!url.endsWith("/v1")) url += "/v1";

    const res = await fetch(`${url}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            model: settings.ai_model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.5,
            max_tokens: 4000
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`AI API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
}

/* ============================================================
   HELPER: SAFE JSON EXTRACTION
   Models sometimes wrap JSON in markdown fences (```json) or add
   trailing commentary. Strip fences and extract the first balanced
   JSON object so parsing stays robust.
*/
function extractJSON(raw: string): Record<string, any> {
    if (!raw) return {};
    let text = raw.trim();

    // Strip markdown code fences if present
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) text = fenceMatch[1].trim();

    // Find first { and last } to handle any leading/trailing prose
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
        text = text.slice(start, end + 1);
    }

    return JSON.parse(text);
}

/* ============================================================
   HELPER: SEARCH WITH SEARXNG
   ============================================================ */
async function searchWithSearXNG(query: string, searxngUrl: string, apiKey?: string): Promise<SearchResult[]> {
    const url = new URL(`${searxngUrl}/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("time_range", "year");
    if (apiKey) url.searchParams.set("token", apiKey);

    const res = await fetch(url.toString(), {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(25000)
    });
    if (!res.ok) throw new Error(`SearXNG returned ${res.status}`);
    const data = await res.json();
    if (!data.results?.length) throw new Error("No search results found");
    return data.results.slice(0, 10).map((r: any) => ({
        title: r.title || "",
        url: r.url || "",
        content: r.content || "",
        publishedDate: r.publishedDate || undefined
    }));
}

/* ============================================================
   HELPER: DOWNLOAD & OPTIMIZE IMAGE
   ============================================================ */
async function processAndSaveImage(title: string, userId: string) {
    try {
        const geminiKey = (await getSetting("gemini_api_key")) || "";
        if (!geminiKey) {
            console.log("⚠️  Gemini API key not configured, skipping image generation");
            return null;
        }

        console.log(`🖼️  Generating image for: ${title}...`);

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${geminiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Generate a professional featured image for an article titled "${title}". Style: digital art, clean, modern, professional news photography. Only return the image, no text.` }] }],
                    generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
                }),
                signal: AbortSignal.timeout(60000)
            }
        );

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Gemini Error: ${res.status} ${errBody}`);
        }

        const data = await res.json();
        const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (!imagePart) throw new Error("Gemini returned no image");

        const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
        const mimeType = imagePart.inlineData.mimeType || "image/png";
        const ext = mimeType.includes("webp") ? "webp" : "png";

        const now = new Date();
        const year = now.getFullYear().toString();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const uploadDir = join(process.cwd(), "public", "uploads", year, month);
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const safeSlug = slugify(title, { lower: true, strict: true }).substring(0, 50);
        const fileName = `${safeSlug}-${Date.now()}.webp`;
        const publicPath = `/uploads/${year}/${month}/${fileName}`;

        const optimizedBuffer = await sharp(imageBuffer)
            .resize(1200, 630, { fit: "cover", position: "centre" })
            .webp({ quality: 85 })
            .toBuffer();

        await writeFile(join(uploadDir, fileName), optimizedBuffer);

        const media = await Media.create({
            name: title.substring(0, 100),
            mimeType: "image/webp",
            extension: "webp",
            size: optimizedBuffer.byteLength,
            path: publicPath,
            slug: `${slugify(title, { lower: true, strict: true })}-${Date.now()}`,
            created: { at: now, by: userId },
            updated: { at: now, by: userId },
        });

        return { path: media.path };
    } catch (error) {
        console.error("❌ Image generation failed:", error);
        return null;
    }
}

/* ============================================================
   BUILD GROUNDED PROMPT
   ============================================================ */
function buildGroundedPrompt(searchQuery: string, sources: SearchResult[], categoryNames: string, today: string): string {
    const sourceBlock = sources.map((s, i) =>
        `[Source ${i + 1}] ${s.title}\nURL: ${s.url}\nDate: ${s.publishedDate || "Recent"}\nSnippet: ${s.content}`
    ).join("\n\n");

    return `You are a professional article writer. Write a factual article based ONLY on the research sources provided below. DO NOT invent facts, statistics, names, or events that are not mentioned in the sources.

## RESEARCH SOURCES
${sourceBlock}

## INSTRUCTIONS
- Write the article in the same language as the search query: "${searchQuery}"
- Use the sources above as your ONLY factual basis
- You may reorganize, elaborate, and connect information from multiple sources, but do NOT fabricate new facts
- Include a "sources" field in your JSON response listing 3 to 6 Source numbers you referenced (e.g., [1, 3, 5])
- Keep the total number of cited sources between 3 and 6 — do not exceed 6
- If a source provides a specific quote or statistic, attribute it naturally in the text
- The article must be 600-800 words maximum
- Write in a journalistic, informative style

## AVAILABLE CATEGORIES (pick one or more closest matches — an article may belong to several categories)
${categoryNames}

## TODAY'S DATE
${today}

## OUTPUT FORMAT (JSON only)
{
  "judul": "Article title (compelling, SEO-friendly)",
  "konten": "Full article in HTML (use <p>, <h2>, <h3>, <blockquote>, <ul>, <ol> tags)",
  "excerpt": "2-3 sentence summary",
  "categoryNames": ["Closest matching category/categories from the list above — use an array, can contain 1 or more names"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "sources": [1, 2, 3]
}

Respond ONLY with valid JSON. No markdown fences, no extra text.`;
}

/* ============================================================
   MAIN FUNCTION: GENERATE AUTO ARTICLE
   ============================================================ */
export async function generateAutoArticle(searchQuery: string = "berita teknologi terkini", userId?: string, generateImage: boolean = true) {
    const startTime = performance.now();
    try {
        await connectDB();

        // Load AI settings from DB
        const aiUrl = (await getSetting("ai_url")) || "";
        const aiApiKey = (await getSetting("ai_api_key")) || "";
        const aiModel = (await getSetting("ai_model")) || "";
        const searxngUrl = (await getSetting("searxng_url")) || "";
        const searxngApiKey = (await getSetting("searxng_api_key")) || "";

        if (!aiUrl || !aiModel) throw new Error("AI not configured. Set AI URL and Model in System Settings.");
        if (!searxngUrl) throw new Error("SearXNG not configured. Set SearXNG URL in System Settings.");

        const authorId = userId || (await getSetting("post_user_default")) || "";

        const dbCategories = await Category.find({ isActive: true }).select("name");
        const categoryNames = dbCategories.map(c => c.name).join(", ");

        // 1. Research with SearXNG
        console.log(`🔍 Researching: "${searchQuery}"...`);
        let sources: SearchResult[];
        try {
            sources = await searchWithSearXNG(searchQuery, searxngUrl, searxngApiKey);
            console.log(`📚 Found ${sources.length} sources`);
        } catch (e: any) {
            throw new Error(`SearXNG search failed: ${e.message}. Ensure SearXNG is running at ${searxngUrl}`);
        }

        // 2. Prepare date
        const today = new Date().toLocaleDateString("id-ID", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
        });

        // 3. Build prompt (use domain prompt if exists, otherwise built-in grounded prompt)
        let prompt = "";
        try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const hostname = new URL(appUrl).hostname;
            const domainName = hostname.replace("www.", "").split(".")[0];
            const promptPath = join(process.cwd(), "prompts", `${domainName}.txt`);

            if (fs.existsSync(promptPath)) {
                const basePrompt = fs.readFileSync(promptPath, "utf-8");
                const sourceContext = sources.map((s, i) => `- [${i + 1}] ${s.title} (${s.url}): ${s.content}`).join("\n");
                prompt = basePrompt
                    .split("${today}").join(today)
                    .split("${context}").join(sourceContext)
                    .split("${searchQuery}").join(searchQuery)
                    .split("${categoryNames}").join(categoryNames);
            } else {
                prompt = buildGroundedPrompt(searchQuery, sources, categoryNames, today);
            }
        } catch {
            prompt = buildGroundedPrompt(searchQuery, sources, categoryNames, today);
        }

        // 4. Call AI
        console.log(`🤖 Generating with ${aiModel}...`);
        const fullResponse = await callAI(prompt, { ai_url: aiUrl, ai_api_key: aiApiKey, ai_model: aiModel });

        if (!fullResponse || fullResponse.length < 200) {
            throw new Error("AI returned empty or too short response.");
        }

        // 5. Parse response
        let article: ArticleResult = { judul: searchQuery, excerpt: "", konten: "", keywords: [], categoryNames: [], sources: [] };
        try {
            const parsed = extractJSON(fullResponse);
            article.judul = parsed.judul || parsed.title || searchQuery;
            article.konten = parsed.konten || parsed.content || "";
            article.excerpt = parsed.excerpt || parsed.summary || "";
            const rawCat = parsed.categoryNames ?? parsed.categoryName ?? "";
            article.categoryNames = Array.isArray(rawCat)
                ? rawCat.map((c: string) => c.toString().trim()).filter(Boolean)
                : String(rawCat).split(",").map((c: string) => c.trim()).filter(Boolean);
            article.keywords = parsed.keywords || [];
            // Map source indices back to full source objects
            const sourceIndices: number[] = parsed.sources || [];
            article.sources = sourceIndices
                .filter((i: number) => i >= 1 && i <= sources.length)
                .map((i: number) => sources[i - 1]);
            // If AI didn't provide sources, include all
            if (article.sources.length === 0) article.sources = sources.slice(0, 6);
            else if (article.sources.length > 6) article.sources = article.sources.slice(0, 6);
        } catch (e) {
            console.warn(`⚠️ [Generate] Could not parse JSON, keeping raw response as content:`, (e as Error)?.message);
            article.konten = fullResponse;
        }

        // 6. Validate content
        let finalContent = (article.konten || "").toString().trim();
        if (finalContent.length < 100 || finalContent.includes("error\":")) {
            throw new Error("AI generated content is too short or contains errors.");
        }

        // Clean HTML
        finalContent = finalContent
            .replace(/\\n/g, "\n").replace(/\\"/g, '"')
            .replace(/^"/, "").replace(/"$/, "").trim();

        if (!finalContent.includes("<p>") && !finalContent.includes("<div")) {
            finalContent = finalContent
                .split("\n\n")
                .filter(p => p.trim())
                .map(p => p.startsWith("<pre") ? p : `<p>${p.replace(/\n/g, "<br/>")}</p>`)
                .join("");
        }

        // Append source citations to content
        if (article.sources.length > 0) {
            const citationsHtml = `<div class="article-sources"><h3>Sumber / Sources</h3><ul>${article.sources.map(s =>
                `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title}</a></li>`
            ).join("")}</ul></div>`;
            finalContent += citationsHtml;
        }

        let finalExcerpt = (article.excerpt || "").toString().replace(/\\"/g, '"').trim();
        if (finalExcerpt.length < 10) {
            finalExcerpt = finalContent.replace(/<[^>]*>/g, "").substring(0, 160).trim() + "...";
        }

        // 7. Database Ops
        let selectedCategoryIds: any[] = [];
        if (article.categoryNames.length > 0) {
            const matchedCategories = await Category.find({
                name: { $in: article.categoryNames.map((c) => new RegExp(`^${c}$`, "i")) }
            }).lean();
            selectedCategoryIds = matchedCategories.map((c: any) => c._id);
        }

        const genImage = generateImage ? (await processAndSaveImage(article.judul, authorId)) : null;
        const localImagePath = genImage?.path || "/img/logo.png";

        const baseSlug = slugify(article.judul, { lower: true, strict: true });

        const featuredImage: any = { url: localImagePath, alt: article.judul };

        const post = await Post.create({
            title: article.judul,
            slug: baseSlug,
            excerpt: finalExcerpt,
            content: finalContent,
            featuredImage,
            categories: selectedCategoryIds,
            status: "draft",
            isActive: true,
            author: authorId,
            tags: article.keywords,
            meta: { title: article.judul, description: finalExcerpt, keywords: article.keywords },
            structuredData: {
                type: "Article",
                headline: article.judul,
                image: [localImagePath],
                authorName: "AI Generated"
            },
            created: { at: new Date(), by: authorId },
            updated: { at: new Date(), by: authorId }
        });

        const totalMs = performance.now() - startTime;
        console.log(`✨ Generated: [${post.slug}] (${(totalMs / 60000).toFixed(1)}m)`);

        return {
            success: true,
            slug: post.slug,
            sources: article.sources.map(s => ({ title: s.title, url: s.url }))
        };

    } catch (error: any) {
        console.error("❌ Auto Article Failed:", error.message);
        throw error;
    }
}

/* ============================================================
   EXPORT: FIX BY AI (IMPROVE EXISTING CONTENT)
   ============================================================ */
export async function fixContentByAI(postId: string, instruction: string, type: "post" | "page" = "post") {
    const startTime = performance.now();
    try {
        await connectDB();

        const aiUrl = (await getSetting("ai_url")) || "";
        const aiApiKey = (await getSetting("ai_api_key")) || "";
        const aiModel = (await getSetting("ai_model")) || "";
        const searxngUrl = (await getSetting("searxng_url")) || "";
        const searxngApiKey = (await getSetting("searxng_api_key")) || "";

        if (!aiUrl || !aiModel) throw new Error("AI not configured.");

        // Fetch the existing content (post or page)
        let post: any;
        if (type === "page") {
            post = await Page.findById(postId).lean();
            post = post ? { ...post, categories: [] } : null;
        } else {
            post = await Post.findById(postId).populate("categories", "name").lean();
        }
        if (!post) throw new Error(type === "page" ? "Page not found." : "Post not found.");

        const currentCategories = await Category.find({ isActive: true }).select("name");
        const categoryNames = currentCategories.map(c => c.name).join(", ");

        // Optional: research with SearXNG for context
        let sourceContext = "";
        if (searxngUrl) {
            try {
                const sources = await searchWithSearXNG(post.title, searxngUrl, searxngApiKey);
                sourceContext = "\n\n## RELATED RESEARCH\n" + sources.map((s, i) =>
                    `[${i + 1}] ${s.title} (${s.url}): ${s.content}`
                ).join("\n");
            } catch {
                // Research is optional for fix — proceed without it
            }
        }

        const prompt = `You are an expert article editor. Improve the following article based on the user's instruction.

## CURRENT ARTICLE
Title: ${post.title}
Content: ${(post.content || "").replace(/<[^>]*>/g, "").substring(0, 3000)}
Excerpt: ${post.excerpt || ""}
Tags: ${(post.tags || []).join(", ")}
Category: ${post.categories?.map((c: any) => c.name).join(", ") || "None"}
${sourceContext}

## USER INSTRUCTION
${instruction}

## INSTRUCTIONS
- Apply the requested changes while keeping the article factual and well-structured
- If research sources are provided above, use them to verify and improve factual accuracy
- Output the COMPLETE improved article (not a diff)
- Maintain HTML formatting with <p>, <h2>, <h3>, <blockquote>, <ul>, <ol> tags
- Preserve any "Sumber / Sources" / references section with its clickable <a> links EXACTLY as-is at the end of the article for SEO. Do NOT convert links to plain text, do NOT remove or alter the href attributes
- Keep the article concise, maximum 800 words

## AVAILABLE CATEGORIES (pick one or more closest matches — an article may belong to several categories)
${categoryNames}

## OUTPUT FORMAT (JSON only)
{
  "title": "Improved title",
  "content": "Full improved article in HTML",
  "excerpt": "Improved excerpt (2-3 sentences)",
  "categoryNames": ["Category name(s) — array, 1 or more from the list above"],
  "keywords": ["keyword1", "keyword2", ...],
  "changes_summary": "Brief summary of what was changed and why"
}

Respond ONLY with valid JSON.`;

        console.log(`🤖 Fix by AI: "${instruction}"...`);
        const fullResponse = await callAI(prompt, { ai_url: aiUrl, ai_api_key: aiApiKey, ai_model: aiModel });

        if (!fullResponse || fullResponse.length < 200) {
            throw new Error("AI returned empty response.");
        }

        // Parse (robust: strips markdown fences & trailing prose)
        let result = { title: post.title, content: post.content, excerpt: post.excerpt, categoryNames: [] as string[], keywords: post.tags || [], changes_summary: "" };
        try {
            const parsed = extractJSON(fullResponse);
            result.title = parsed.title || result.title;
            result.content = parsed.content || result.content;
            result.excerpt = parsed.excerpt || result.excerpt;
            const rawCat = parsed.categoryNames ?? parsed.categoryName ?? [];
            result.categoryNames = Array.isArray(rawCat)
                ? rawCat.map((c: string) => c.toString().trim()).filter(Boolean)
                : String(rawCat).split(",").map((c: string) => c.trim()).filter(Boolean);
            result.keywords = parsed.keywords || result.keywords;
            result.changes_summary = parsed.changes_summary || "";
        } catch (e) {
            console.warn(`⚠️ [FixByAI] Could not parse JSON, keeping original content:`, (e as Error)?.message);
        }

        // Preserve the ORIGINAL sources/references section (SEO citations) with
        // its clickable links. The AI often strips <a> links or rewrites this
        // block, so we always restore the original verbatim.
        const sourcesRegex = /<div[^>]*class="[^"]*article-sources[^"]*"[\s\S]*?<\/div>/i;
        const sourcesMatch = (post.content || "").match(sourcesRegex);
        if (sourcesMatch && sourcesMatch[0]) {
            if (sourcesRegex.test(result.content)) {
                // AI kept a (possibly link-stripped) sources block -> replace with original
                result.content = result.content.replace(sourcesRegex, sourcesMatch[0]);
            } else {
                // AI dropped it entirely -> re-append the original
                result.content = result.content.trim() + "\n\n" + sourcesMatch[0];
            }
        }

        const totalMs = performance.now() - startTime;
        console.log(`✨ Fix completed in ${(totalMs / 1000).toFixed(1)}s`);

        return {
            success: true,
            original: {
                title: post.title,
                content: post.content,
                excerpt: post.excerpt || "",
                tags: post.tags || [],
                categoryName: post.categories?.map((c: any) => c.name).join(", ") || ""
            },
            suggested: {
                title: result.title,
                content: result.content,
                excerpt: result.excerpt,
                tags: result.keywords,
                categoryNames: result.categoryNames,
                changes_summary: result.changes_summary
            }
        };

    } catch (error: any) {
        console.error("❌ Fix by AI Failed:", error.message);
        throw error;
    }
}
