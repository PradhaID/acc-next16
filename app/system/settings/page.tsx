import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import SettingsClient from "@/components/system/SettingsClient";

export default async function SettingsPage() {
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
    <div className="p-6">
      <SettingsClient />
    </div>
  );
}
