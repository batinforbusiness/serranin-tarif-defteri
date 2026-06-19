"use client";

import { useEffect, useState } from "react";
import { Leaf, LogOut, Moon, Sun } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-provider";
import { PREFERENCES_EVENT, THEME_STORAGE_KEY, VEGAN_STORAGE_KEY, type SerraTheme } from "@/components/theme-client";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const COUPLE_MODE_KEY = "serra-couple-mode";
const TASTE_PROFILE_KEY = "serra-taste-profile";
const tasteOptions = ["Acı sever", "Peynirli sever", "Pratik ister", "Fit ister", "Tatlı sever", "Sebze ağırlıklı"];

export default function SettingsPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<SerraTheme>("light");
  const [veganMode, setVeganMode] = useState(false);
  const [coupleMode, setCoupleMode] = useState(false);
  const [tasteProfile, setTasteProfile] = useState<string[]>([]);

  useEffect(() => {
    setTheme((window.localStorage.getItem(THEME_STORAGE_KEY) as SerraTheme | null) ?? "light");
    setVeganMode(window.localStorage.getItem(VEGAN_STORAGE_KEY) === "true");
    setCoupleMode(window.localStorage.getItem(COUPLE_MODE_KEY) === "true");
    setTasteProfile(JSON.parse(window.localStorage.getItem(TASTE_PROFILE_KEY) || "[]") as string[]);
  }, []);

  function updateTheme(nextTheme: SerraTheme) {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event(PREFERENCES_EVENT));
  }

  function updateVeganMode(nextValue: boolean) {
    setVeganMode(nextValue);
    window.localStorage.setItem(VEGAN_STORAGE_KEY, String(nextValue));
    document.documentElement.dataset.vegan = nextValue ? "true" : "false";
    window.dispatchEvent(new Event(PREFERENCES_EVENT));
  }

  function updateCoupleMode(nextValue: boolean) {
    setCoupleMode(nextValue);
    window.localStorage.setItem(COUPLE_MODE_KEY, String(nextValue));
  }

  function toggleTaste(taste: string) {
    const next = tasteProfile.includes(taste) ? tasteProfile.filter((item) => item !== taste) : [...tasteProfile, taste];
    setTasteProfile(next);
    window.localStorage.setItem(TASTE_PROFILE_KEY, JSON.stringify(next));
  }

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    window.location.href = "/";
  }

  return (
    <AuthGate>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5">
        <div>
          <h1 className="text-3xl font-semibold">Ayarlar</h1>
          <p className="mt-1 text-sm text-cocoa/65">Hesap, görünüm ve tarif tercihleri.</p>
        </div>

        <div className="soft-card rounded-3xl p-5">
          <h2 className="text-lg font-semibold">Kullanıcı</h2>
          <p className="mt-2 text-sm text-cocoa/65">{user?.email}</p>
        </div>

        <div className="soft-card rounded-3xl p-5">
          <h2 className="text-lg font-semibold">Tema</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
                theme === "light" ? "bg-cream-100 text-rosewood" : "bg-white text-cocoa/55"
              }`}
              onClick={() => updateTheme("light")}
            >
              <Sun size={17} />
              Açık
            </button>
            <button
              className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
                theme === "dark" ? "bg-cocoa text-white" : "bg-white text-cocoa/55"
              }`}
              onClick={() => updateTheme("dark")}
            >
              <Moon size={17} />
              Karanlık
            </button>
          </div>
        </div>

        <div className="soft-card rounded-3xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Vegan mod</h2>
              <p className="mt-2 text-sm leading-6 text-cocoa/65">
                Açılınca tarif defterinde sadece vegan uyumlu görünen tarifler listelenir. Sonraki adımda vegan öneri ve
                haftalık menüye bağlanabilir.
              </p>
            </div>
            <button
              className={`flex h-12 w-20 items-center rounded-full p-1 transition ${
                veganMode ? "justify-end bg-sage" : "justify-start bg-cream-100"
              }`}
              onClick={() => updateVeganMode(!veganMode)}
              aria-label="Vegan modu değiştir"
            >
              <span
                className={`grid h-10 w-10 place-items-center rounded-full shadow-soft ${
                  veganMode ? "bg-white text-sage" : "bg-white text-cocoa/45"
                }`}
              >
                <Leaf size={18} />
              </span>
            </button>
          </div>
          {veganMode ? (
            <p className="mt-4 rounded-2xl bg-mint px-4 py-3 text-sm font-black text-sage">
              Vegan mod açık: defter daha yeşil, tarifler daha bitkisel.
            </p>
          ) : null}
        </div>

        <div className="soft-card rounded-3xl p-5">
          <h2 className="text-lg font-semibold">Damak zevki</h2>
          <p className="mt-2 text-sm leading-6 text-cocoa/65">
            Asistan ileride önerileri bu profile göre daha kişisel hazırlayacak.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {tasteOptions.map((taste) => {
              const active = tasteProfile.includes(taste);
              return (
                <button
                  key={taste}
                  className={`rounded-full px-3 py-2 text-xs font-black ${
                    active ? "bg-butter text-cocoa" : "bg-cream-100 text-cocoa/55"
                  }`}
                  onClick={() => toggleTaste(taste)}
                >
                  {taste}
                </button>
              );
            })}
          </div>
        </div>

        <div className="soft-card rounded-3xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Ortak defter modu</h2>
              <p className="mt-2 text-sm leading-6 text-cocoa/65">
                Çift/aile kullanımı için hazırlık modu. Şimdilik cihazda açık kalır, sonraki sürümde davet linkine bağlanır.
              </p>
            </div>
            <button
              className={`flex h-12 w-20 items-center rounded-full p-1 transition ${
                coupleMode ? "justify-end bg-melon" : "justify-start bg-cream-100"
              }`}
              onClick={() => updateCoupleMode(!coupleMode)}
              aria-label="Ortak defter modunu değiştir"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-soft text-cocoa/55">♥</span>
            </button>
          </div>
        </div>

        <button
          className="flex items-center justify-center gap-2 rounded-2xl bg-cocoa px-5 py-4 font-semibold text-white"
          onClick={() => void signOut()}
        >
          <LogOut size={18} />
          Çıkış yap
        </button>
      </section>
    </AuthGate>
  );
}
