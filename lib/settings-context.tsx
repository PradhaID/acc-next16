"use client";

import { createContext, useContext } from "react";

export interface AppSettings {
  app_name: string;
  app_url: string;
  app_title: string;
  app_description: string;
  app_slogan: string;
  app_keywords: string[];
  app_tags: string[];
  enable_signup: boolean;
  fb_app_id: string;
  enable_public_api: boolean;
  enable_email_verification: boolean;
  enable_whatsapp_otp: boolean;
  analytics_track_all: boolean;
  waha_url: string;
  waha_token: string;
  waha_instance: string;
  ai_url: string;
  ai_api_key: string;
  ai_model: string;
  searxng_url: string;
  searxng_api_key: string;
  gemini_api_key: string;
}

const defaultSettings: AppSettings = {
  app_name: "boilerplate-next16",
  app_url: "http://localhost:3000",
  app_title: "boilerplate-next16",
  app_description: "",
  app_slogan: "",
  app_keywords: [],
  app_tags: [],
  enable_signup: true,
  fb_app_id: "",
  enable_public_api: false,
  enable_email_verification: true,
  enable_whatsapp_otp: false,
  analytics_track_all: true,
  waha_url: "",
  waha_token: "",
  waha_instance: "",
  ai_url: "",
  ai_api_key: "",
  ai_model: "",
  searxng_url: "",
  searxng_api_key: "",
  gemini_api_key: "",
};

export const SettingsContext = createContext<AppSettings>(defaultSettings);

export function useSettings(): AppSettings {
  return useContext(SettingsContext);
}

export { defaultSettings };
