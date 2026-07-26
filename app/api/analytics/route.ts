import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import connectDB from "@/lib/db";
import PageView from "@/models/analytics/PageView";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        const session = token ? await verifyToken(token) : null;
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get("days") || "30");
        const timezone = session.timezone || "UTC";
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const matchStage = { timestamp: { $gte: startDate } };

        const [
            totalViews,
            uniqueSessions,
            returningVisitors,
            topPages,
            dailyViews,
            topReferrers,
            hourlyDistribution,
        ] = await Promise.all([
            PageView.countDocuments(matchStage),

            PageView.distinct("sessionId", matchStage).then(sessions => sessions.length),

            (async () => {
                const sessions = await PageView.aggregate([
                    { $match: matchStage },
                    { $group: { _id: "$sessionId", views: { $sum: 1 } } },
                    { $match: { views: { $gt: 1 } } },
                ]);
                return sessions.length;
            })(),

            PageView.aggregate([
                { $match: matchStage },
                { $group: { _id: "$path", views: { $sum: 1 } } },
                { $sort: { views: -1 } },
                { $limit: 10 },
            ]),

            PageView.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
                        },
                        views: { $sum: 1 },
                        sessions: { $addToSet: "$sessionId" },
                    },
                },
                { $sort: { _id: 1 } },
                { $project: { date: "$_id", views: 1, sessions: { $size: "$sessions" } } },
            ]),

            (async () => {
                const referrers = await PageView.aggregate([
                    { $match: { ...matchStage, referrer: { $exists: true, $nin: [null, ""] } } },
                    { $group: { _id: "$referrer", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 },
                ]);
                return referrers;
            })(),

            PageView.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: { $hour: { date: "$timestamp", timezone } },
                        views: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        const avgViewsPerSession = uniqueSessions > 0
            ? (totalViews / uniqueSessions).toFixed(2)
            : "0";

        return NextResponse.json({
            success: true,
            data: {
                totalViews,
                uniqueSessions,
                returningVisitors,
                avgViewsPerSession: parseFloat(avgViewsPerSession),
                topPages: topPages.map(p => ({ path: p._id, views: p.views })),
                dailyViews: dailyViews.map(d => ({
                    date: d.date,
                    views: d.views,
                    sessions: d.sessions,
                })),
                topReferrers: topReferrers.map(r => ({ referrer: r._id, count: r.count })),
                hourlyDistribution: hourlyDistribution.map(h => ({
                    hour: h._id,
                    views: h.views,
                })),
            },
        });
    } catch (error) {
        console.error("Analytics fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
