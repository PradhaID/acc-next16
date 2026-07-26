import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import RedirectManager from "@/components/system/RedirectManager";
import { getDictionary, translate } from "@/lib/i18n";

export default async function RedirectsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    redirect("/account/signin");
  }

  const payload = await verifyToken(token);

  if (!payload) {
    redirect("/account/signin");
  }

  const dict = getDictionary(payload.language);
  const t = (p: string) => translate(dict, p);

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
          {t("redirects.title")}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {t("redirects.subtitle")}
        </p>
      </div>

      <RedirectManager />
    </div>
  );
}
