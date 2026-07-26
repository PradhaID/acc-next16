import { ObjectId } from "mongodb";

export interface SystemSetting {
  _id: ObjectId;
  key: string;
  value: string | boolean | number | string[];
  group: string;
  label: string;
  type: "text" | "textarea" | "boolean" | "number" | "array";
  updatedAt: Date;
}

export const DEFAULT_SETTINGS: Omit<SystemSetting, "_id" | "updatedAt">[] = [
  // App Info
  { key: "app_name", value: "Boilerplate", group: "app", label: "App Name", type: "text" },
  { key: "app_url", value: "http://localhost:3000", group: "app", label: "App URL", type: "text" },
  { key: "app_title", value: "Boilerplate", group: "app", label: "App Title", type: "text" },
  { key: "app_description", value: "A modern SaaS boilerplate built with Next.js 16, Tailwind CSS v4, MongoDB, and RBAC.", group: "app", label: "App Description", type: "textarea" },
  { key: "app_slogan", value: "The Ultimate Starter for your Next Big Idea", group: "app", label: "Slogan", type: "text" },
  { key: "app_keywords", value: ["nextjs", "tailwind", "mongodb", "saas", "boilerplate", "rbac"], group: "app", label: "Keywords", type: "array" },
  { key: "app_tags", value: ["nextjs", "react", "typescript", "tailwindcss", "mongodb"], group: "app", label: "Tags", type: "array" },
  { key: "default_locale", value: "id_ID", group: "app", label: "Default Language", type: "text" },

  // Features
  { key: "enable_signup", value: true, group: "features", label: "Enable Sign Up", type: "boolean" },
  { key: "fb_app_id", value: "", group: "features", label: "Facebook App ID", type: "text" },
  { key: "enable_public_api", value: false, group: "features", label: "Enable Public API", type: "boolean" },
  { key: "enable_email_verification", value: true, group: "features", label: "Require Email Verification", type: "boolean" },
  { key: "enable_whatsapp_otp", value: false, group: "features", label: "Enable WhatsApp OTP", type: "boolean" },
  { key: "analytics_track_all", value: true, group: "features", label: "Track All Pages in Analytics", type: "boolean" },
  { key: "meta_pixel_id", value: "", group: "features", label: "Meta Pixel ID", type: "text" },
  { key: "meta_pixel_test_event_code", value: "", group: "features", label: "Meta Pixel Test Event Code", type: "text" },
  { key: "ga4_measurement_id", value: "", group: "features", label: "GA4 Measurement ID", type: "text" },

  // WhatsApp (WAHA)
  { key: "waha_url", value: "", group: "waha", label: "WAHA API URL", type: "text" },
  { key: "waha_token", value: "", group: "waha", label: "WAHA API Token", type: "text" },
  { key: "waha_instance", value: "", group: "waha", label: "WAHA Instance Name", type: "text" },

  // AI
  { key: "ai_url", value: "", group: "ai", label: "AI API URL", type: "text" },
  { key: "ai_api_key", value: "", group: "ai", label: "AI API Key", type: "text" },
  { key: "ai_model", value: "", group: "ai", label: "AI Model", type: "text" },
  { key: "searxng_url", value: "", group: "ai", label: "SearXNG URL", type: "text" },
  { key: "searxng_api_key", value: "", group: "ai", label: "SearXNG API Key", type: "text" },
  { key: "gemini_api_key", value: "", group: "ai", label: "Gemini API Key", type: "text" },
];
