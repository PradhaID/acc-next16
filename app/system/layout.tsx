import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

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

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      <Sidebar
        user={{
          username: payload.username,
          fullName: payload.fullName,
          email: payload.email,
          roleUrls: payload.roleUrls || [],
        }}
      />
      <main className="flex-1 p-6 pt-20 md:p-8 md:pt-8 lg:p-10">
        {children}
      </main>
    </div>
  );
}
