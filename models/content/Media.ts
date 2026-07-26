import { Schema, model, models } from "mongoose";

const MediaSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: null,
        },
        mimeType: {
            type: String,
            required: true,
            trim: true,
        },
        extension: {
            type: String,
            required: true,
            trim: true,
        },
        size: {
            type: Number,
            required: true,
            trim: true,
        },
        dimensions: {
            type: String,
            default: null,
        },
        path: {
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
        tags: {
            type: [String],
            default: null,
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
        deleted: {
            at: { type: Date, default: null },
            by: { type: Schema.Types.ObjectId, ref: "User", default: null },
        },
    },
    {
        timestamps: false,
        collection: "contentMedia",
    }
);

/* Optimasi Indexing */
MediaSchema.index({ name: 1 });

const Media = models.Media || model("Media", MediaSchema);

export default Media;