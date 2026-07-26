import { Schema, model, models } from "mongoose";
import User from "@/models/system/User";

/* =====================
   SCHEMA
===================== */
const PostSchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, index: true },
        locale: { type: String, enum: ["en_US", "id_ID"], default: "id_ID", index: true },

        excerpt: { type: String, default: null },
        content: { type: String, required: true },

        meta: {
            title: String,
            description: String,
            keywords: [String],
            canonicalUrl: String,
        },

        categories: [
            {
                type: Schema.Types.ObjectId,
                ref: "Category", // Cukup gunakan string, tidak perlu impor filenya
                index: true,
            },
        ],

        tags: [String],

        featuredImage: {
            url: String,
            alt: String,
            // Sized social-share variants (just the upload path, e.g.
            // /uploads/2026/07/og-xxx.png); the app_url prefix is added at render time.
            social: {
                og: { type: String, default: "" },
                twitter: { type: String, default: "" },
            },
        },

        status: {
            type: String,
            enum: ["draft", "published", "archived"],
            default: "draft",
            index: true,
        },

        isActive: { type: Boolean, default: true, index: true },

        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            model: User,
            default: null,
        },

        created: {
            at: { type: Date, default: Date.now },
            by: { type: Schema.Types.ObjectId, ref: "User", model: User, default: null },
        },

        updated: {
            at: { type: Date, default: Date.now },
            by: { type: Schema.Types.ObjectId, ref: "User", model: User, default: null },
        },

        published: {
            at: { type: Date, default: null },
            by: { type: Schema.Types.ObjectId, ref: "User", model: User, default: null },
        },

        // Perhatian: Menggunakan field bernama 'schema' bisa menyebabkan konflik 
        // internal Mongoose karena 'schema' adalah reserved word. 
        // Disarankan ganti nama menjadi 'structuredData' atau sejenisnya.
        structuredData: {
            type: { type: String, default: "Article" },
            headline: String,
            image: [String],
            datePublished: Date,
            dateModified: Date,
            authorName: String,
        },
    },
    {
        timestamps: false,
        collection: "contentPosts",
    }
);

// Pengecekan model agar tidak terjadi Error "OverwriteModelError" di Next.js
const Post = models.Post || model("Post", PostSchema);

export default Post;