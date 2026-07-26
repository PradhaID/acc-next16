import { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import SystemLogsClient from "@/components/system/SystemLogsClient";
import { getDictionary, translate } from "@/lib/i18n";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Audit Trail",
};

export default async function SystemLogsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;
  const dict = getDictionary(payload?.language);
  const t = (p: string) => translate(dict, p);

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader
        title={t("logs.title")}
        subtitle={t("logs.subtitle")}
      />

      <SystemLogsClient />
    </div>
  );
}
