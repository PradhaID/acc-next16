import { Schema, model, models } from "mongoose";

const AdItemSchema = new Schema({
    imageUrl: { type: String, required: true },
    linkUrl: { type: String, default: null },
    altText: { type: String, default: null },
});

const AdsSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        position: {
            type: String,
            required: true,
            enum: [
                "HOME_BELOW_FEATURED",
                "HOME_SIDEBAR",
                "HOME_SIDEBAR_2",
                "HOME_FEED_1",
                "HOME_FEED_2",
                "HOME_FEED_3",
                "HOME_POPUP",
                "POST_PAGE_ABOVE_CONTENT",
                "POST_PAGE_SIDEBAR",
                "POST_PAGE_ABOVE_TAGS",
            ],
            index: true,
        },

        type: {
            type: String,
            required: true,
            enum: ["SINGLE", "CAROUSEL", "ADSENSE"],
            default: "SINGLE",
        },

        adsenseCode: {
            type: String,
            default: null,
        },

        items: [AdItemSchema],

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        isFirstTimeOnly: {
            type: Boolean,
            default: false,
        },

        startDate: {
            type: Date,
            default: null,
        },

        endDate: {
            type: Date,
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
    },
    {
        timestamps: false,
        collection: "contentAds",
    }
);

const Ads = models.Ads || model("Ads", AdsSchema);

export default Ads;
