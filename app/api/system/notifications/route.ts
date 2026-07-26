import { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from "@/lib/notification";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await getNotifications(session.userId);
  const unreadCount = await getUnreadCount(session.userId);

  const formatted = notifications.map((n: any) => ({
    _id: n._id.toString(),
    type: n.type,
    title: n.title,
    message: n.message || null,
    link: n.link || null,
    read: n.read,
    time: n.created?.at,
  }));

  return Response.json({ data: formatted, unreadCount });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { notificationId } = await request.json();
  if (notificationId) {
    await markNotificationRead(session.userId, notificationId);
  } else {
    await markAllNotificationsRead(session.userId);
  }

  return Response.json({ success: true });
}
