import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return Response.json({ error: "url required" }, { status: 400 });
  if (!url.startsWith("http://") && !url.startsWith("https://"))
    return Response.json({ error: "Invalid url" }, { status: 400 });

  const download = request.nextUrl.searchParams.get("download") === "1";

  try {
    const res = await fetch(url);
    const headers = new Headers(res.headers);
    headers.set("Content-Disposition", download ? "attachment" : "inline");

    return new Response(res.body, {
      status: res.status,
      headers,
    });
  } catch {
    return Response.json({ error: "Failed to fetch" }, { status: 502 });
  }
}
