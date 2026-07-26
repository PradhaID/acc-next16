import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import SettingsProvider from "@/components/SettingsProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/types";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import MetaPixel from "@/components/public/MetaPixel";
import Ga4Analytics from "@/components/public/Ga4Analytics";
import { getContentLanguage } from "@/lib/data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const name = s.app_name || "boilerplate-next16";
  const url = s.app_url || "http://localhost:3000";
  const desc = s.app_description || "A modern SaaS boilerplate built with Next.js 16, Tailwind CSS v4, MongoDB, and RBAC.";

  const keywords = [
    ...(Array.isArray(s.app_keywords) ? s.app_keywords : []),
    ...(Array.isArray(s.app_tags) ? s.app_tags : []),
  ];

  return {
    title: {
      default: name,
      template: `%s | ${name}`,
    },
    description: desc,
    keywords: keywords.length ? keywords : undefined,
    metadataBase: new URL(url),
    applicationName: name,
    alternates: {
      canonical: url,
    },
    icons: {
      icon: [
        { url: "/img/favicon/favicon.svg", type: "image/svg+xml" },
        { url: "/img/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/img/favicon/favicon.ico", type: "image/x-icon" },
      ],
      apple: [{ url: "/img/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    manifest: "/img/favicon/site.webmanifest",
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: name,
      title: name,
      description: desc,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description: desc,
      images: ["/twitter-image"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  const locale = isLocale(session?.language) ? session!.language : DEFAULT_LOCALE;

  const s = await getSettings();
  console.log("RootLayout settings keys:", Object.keys(s), "app_name value:", s.app_name);
  const settings = {
    app_name: s.app_name || "boilerplate-next16",
    app_url: s.app_url || "http://localhost:3000",
    app_title: s.app_title || "boilerplate-next16",
    app_description: s.app_description || "",
    app_slogan: s.app_slogan || "",
    app_keywords: Array.isArray(s.app_keywords) ? s.app_keywords : [],
    app_tags: Array.isArray(s.app_tags) ? s.app_tags : [],
    default_locale: s.default_locale || "id_ID",
    enable_signup: s.enable_signup !== false,
    fb_app_id: s.fb_app_id || "",
    enable_public_api: s.enable_public_api === true,
    enable_email_verification: s.enable_email_verification !== false,
    enable_whatsapp_otp: s.enable_whatsapp_otp === true,
    analytics_track_all: s.analytics_track_all !== false,
    waha_url: s.waha_url || "",
    waha_token: s.waha_token || "",
    waha_instance: s.waha_instance || "",
    ai_url: s.ai_url || "",
    ai_api_key: s.ai_api_key || "",
    ai_model: s.ai_model || "",
    searxng_url: s.searxng_url || "",
    searxng_api_key: s.searxng_api_key || "",
    gemini_api_key: s.gemini_api_key || "",
    meta_pixel_id: s.meta_pixel_id || "",
    meta_pixel_test_event_code: s.meta_pixel_test_event_code || "",
    ga4_measurement_id: s.ga4_measurement_id || "",
  };

  // Follow the post/page language on public content routes; default to en_US.
  let contentLang = "en_US";
  try {
    const h = await headers();
    const pathname = h.get("x-invoke-path") || h.get("x-pathname") || "";
    if (pathname) {
      contentLang = await getContentLanguage(pathname);
    }
  } catch {
    contentLang = "en_US";
  }
  const htmlLangAttr = contentLang.replace("_", "-");

  return (
    <html
      lang={htmlLangAttr}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Ga4Analytics measurementId={settings.ga4_measurement_id || ""} />
        <MetaPixel pixelId={settings.meta_pixel_id || ""} testEventCode={settings.meta_pixel_test_event_code || ""} />
        {settings.fb_app_id ? (
          <meta property="fb:app_id" content={String(settings.fb_app_id)} />
        ) : null}
      </head>
      <body className="min-h-full flex flex-col">
        <AnalyticsTracker />
        <SettingsProvider settings={settings}>
          <ThemeProvider>
            <LanguageProvider initialLocale={locale}>
              {children}
            </LanguageProvider>
          </ThemeProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
