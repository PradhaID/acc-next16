import { headers } from "next/headers";
import { forbidden } from "next/navigation";
import { getRequiredRoleUrl } from "@/lib/role-check";

export default async function RoleGuard({ roleUrls }: { roleUrls: string[] }) {
  const headersList = await headers();
  const pathname = headersList.get("next-url") || "/";

  const requiredUrl = getRequiredRoleUrl(pathname);
  if (requiredUrl) {
    const allowed = roleUrls.some(
      (url) => url === requiredUrl || url.startsWith(requiredUrl + "/")
    );
    if (!allowed) {
      forbidden();
    }
  }

  return null;
}
