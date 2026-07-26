import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const SKIP_EXTENSIONS = /\.(js|css|png|jpe?g|gif|svg|ico|woff2?|ttf|eot|map|webp|avif|mp4|webm|json|xml|txt)$/i;

export async function POST(request: Request) {
  try {
    const { url, referrer } = await request.json();

    if (!url || SKIP_EXTENSIONS.test(url)) {
      return NextResponse.json({ ok: true });
    }

    const db = await getDb();
    await db.collection("systemRedirectLogs").updateOne(
      { url },
      {
        $setOnInsert: {
          url,
          created: { at: new Date() },
        },
        $set: {
          referrer: referrer || null,
          lastSeen: new Date(),
        },
        $inc: { totalHits: 1 },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
