import { Schema, model, models } from "mongoose";

const PageViewSchema = new Schema(
    {
        url: { type: String, required: true, index: true },
        path: { type: String, required: true, index: true },
        referrer: { type: String, default: null },
        userAgent: { type: String, default: null },
        sessionId: { type: String, required: true, index: true },
        timestamp: { type: Date, default: Date.now, index: true },
    },
    {
        timestamps: false,
        collection: "analyticsPageViews",
    }
);

PageViewSchema.index({ timestamp: -1 });
PageViewSchema.index({ path: 1, timestamp: -1 });

const PageView = models.PageView || model("PageView", PageViewSchema);

export default PageView;
