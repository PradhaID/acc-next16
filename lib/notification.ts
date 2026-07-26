import { getDb } from "./mongodb";
import { ObjectId } from "mongodb";

type NotificationType = "INFO" | "WARN" | "SUCCESS" | "ERROR";

/**
 * Role granted to users who should receive system ERROR/WARN broadcast alerts.
 * Keep this ID in sync with the seeded role in lib/seed.ts.
 */
export const RECEIVE_SYSTEM_ALERTS_ROLE = "67000000000000000000000f";

interface CreateNotificationOptions {
  userId: string;
  type?: NotificationType;
  title: string;
  message?: string;
  link?: string;
}

export async function createNotification(options: CreateNotificationOptions): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("systemNotifications").insertOne({
      userId: options.userId,
      type: options.type || "INFO",
      title: options.title,
      message: options.message,
      link: options.link,
      read: false,
      created: { at: new Date() },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const db = await getDb();
    return db.collection("systemNotifications").countDocuments({ userId, read: false });
  } catch {
    return 0;
  }
}

export async function getNotifications(userId: string, limit = 20): Promise<any[]> {
  try {
    const db = await getDb();
    return db.collection("systemNotifications")
      .find({ userId })
      .sort({ "created.at": -1 })
      .limit(limit)
      .toArray();
  } catch {
    return [];
  }
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("systemNotifications").updateOne(
      { _id: new ObjectId(notificationId), userId },
      { $set: { read: true } }
    );
  } catch {}
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("systemNotifications").updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );
  } catch {}
}

/**
 * Broadcast a notification to every user whose group is granted the given role.
 * Uses the same group→role join model as authentication so recipients always
 * reflect the current RBAC assignment.
 */
export async function broadcastToRole(
  roleId: string,
  notification: { type?: NotificationType; title: string; message?: string; link?: string }
): Promise<void> {
  try {
    const db = await getDb();
    const joins = await db
      .collection("systemGroupHasRole")
      .find({ roleId: new ObjectId(roleId) })
      .toArray();

    const groupIds = [...new Set(joins.map((j) => j.groupId).filter(Boolean))] as ObjectId[];
    if (groupIds.length === 0) return;

    const users = await db
      .collection("systemUsers")
      .find({ groupId: { $in: groupIds } }, { projection: { _id: 1 } })
      .toArray();

    if (users.length === 0) return;

    const now = new Date();
    const docs = users.map((u) => ({
      userId: u._id.toString(),
      type: notification.type || "INFO",
      title: notification.title,
      message: notification.message,
      link: notification.link,
      read: false,
      created: { at: now },
    }));

    await db.collection("systemNotifications").insertMany(docs);
  } catch (error) {
    console.error("Failed to broadcast notification:", error);
  }
}
