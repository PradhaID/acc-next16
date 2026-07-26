import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import Sidebar from "@/components/Sidebar";
import RoleGuard from "@/components/RoleGuard";

export default async function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    redirect("/account/signin");
  }

  const payload = await verifyToken(token);

  if (!payload) {
    redirect("/account/signin");
  }

  const db = await getDb();
  let userQueryId: any = payload.userId;
  try {
    if (ObjectId.isValid(payload.userId)) {
      userQueryId = new ObjectId(payload.userId);
    }
  } catch {}
  
  const userDoc = await db.collection("systemUsers").findOne(
    {
      $or: [
        { _id: payload.userId },
        { _id: userQueryId }
      ]
    },
    { projection: { image: 1 } }
  );

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950">
      <RoleGuard roleUrls={payload.roleUrls || []} />
      <Sidebar
        user={{
          username: payload.username,
          fullName: payload.fullName,
          email: payload.email,
          image: userDoc?.image || null,
          roleUrls: payload.roleUrls || [],
        }}
      />
      <main className="flex-1 p-6 pt-20 md:p-8 md:pt-8 lg:p-10">
        {children}
      </main>
    </div>
  );
}
