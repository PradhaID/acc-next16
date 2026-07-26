import { Schema, model, models } from "mongoose";

const CategorySchema = new Schema(
    {
        parent: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            default: null,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        locale: {
            type: String,
            enum: ["en_US", "id_ID"],
            default: "id_ID",
            index: true,
        },

        description: {
            type: String,
            default: null,
        },

        /* =====================
           SEO & META DATA
        ===================== */
        meta: {
            title: { type: String, default: null }, // Title tag khusus SEO (jika beda dengan name)
            description: { type: String, default: null }, // Meta description
            keywords: [String],
        },

        // Data untuk JSON-LD (Schema.org)
        structuredData: {
            type: { type: String, default: "CollectionPage" },
            image: { type: String, default: null }, // Thumbnail kategori
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        /* =====================
           AUDIT TRAIL
        ===================== */
        created: {
            at: { type: Date, default: Date.now },
            by: { type: Schema.Types.ObjectId, ref: "User", default: null },
        },

        updated: {
            at: { type: Date, default: Date.now },
            by: { type: Schema.Types.ObjectId, ref: "User", default: null },
        },
    },
    {
        timestamps: false,
        collection: "contentCategories",
    }
);

/* Optimasi Indexing */
CategorySchema.index({ name: 1, parent: 1 });

const Category = models.Category || model("Category", CategorySchema);

export default Category;