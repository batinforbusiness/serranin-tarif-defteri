"use client";

import { useEffect } from "react";

export const THEME_STORAGE_KEY = "serra-theme";
export const VEGAN_STORAGE_KEY = "serra-vegan-mode";
export const PREFERENCES_EVENT = "serra-preferences-change";

export type SerraTheme = "light" | "dark";

function applyPreferences() {
  const theme = (window.localStorage.getItem(THEME_STORAGE_KEY) as SerraTheme | null) ?? "light";
  const veganMode = window.localStorage.getItem(VEGAN_STORAGE_KEY) === "true";

  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.vegan = veganMode ? "true" : "false";
}

export function ThemeClient() {
  useEffect(() => {
    applyPreferences();

    const handleStorage = () => applyPreferences();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(PREFERENCES_EVENT, handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(PREFERENCES_EVENT, handleStorage);
    };
  }, []);

  return null;
}
