"use client";

import { type ReactNode } from "react";
import { SettingsContext, type AppSettings } from "@/lib/settings-context";

export default function SettingsProvider({
  settings,
  children,
}: {
  settings: AppSettings;
  children: ReactNode;
}) {
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}
