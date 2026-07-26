import { Schema, model, models } from "mongoose";

/* =====================
   SCHEMA
===================== */
const PageSchema = new Schema(
    {
        parent: {
            type: Schema.Types.ObjectId,
            ref: "Page",
            default: null,
            index: true,
        },
        title: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, index: true },
        locale: { type: String, enum: ["en_US", "id_ID"], default: "id_ID", index: true },

        excerpt: { type: String, default: null },
        content: { type: String, required: true },

        menuOrder: { type: Number, default: 0, index: true },
        meta: {
            title: String,
            description: String,
            keywords: [String],
            canonicalUrl: String,
        },
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

        menuGroup: {
            type: String,
            enum: ["main", "secondary", "third"],
            default: "main",
            index: true,
        },

        isActive: { type: Boolean, default: true, index: true },

        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        created: {
            at: { type: Date, default: Date.now },
            by: { type: Schema.Types.ObjectId, ref: "User", default: null },
        },

        updated: {
            at: { type: Date, default: Date.now },
            by: { type: Schema.Types.ObjectId, ref: "User", default: null },
        },

        published: {
            at: { type: Date, default: null },
            by: { type: Schema.Types.ObjectId, ref: "User", default: null },
        },

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
        collection: "contentPages",
    }
);

PageSchema.index({ parent: 1, menuOrder: 1 });
PageSchema.index({ title: 'text', excerpt: 'text' }); // Text search untuk dashboard
PageSchema.index({ isActive: 1, status: 1, parent: 1 }); // Compound index untuk list view hierarchy
// Pengecekan model agar tidak terjadi Error "OverwriteModelError" di Next.js
const Page = models.Page || model("Page", PageSchema);

export default Page;