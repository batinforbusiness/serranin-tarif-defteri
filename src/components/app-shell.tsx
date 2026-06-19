"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, Home, ListChecks, Sparkles, Settings } from "lucide-react";
import type { ReactNode } from "react";

const tabs = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/assistant", label: "Asistan", icon: Sparkles },
  { href: "/recipes", label: "Tarifler", icon: BookOpen },
  { href: "/discover", label: "Keşfet", icon: Compass },
  { href: "/shopping-list", label: "Liste", icon: ListChecks },
  { href: "/settings", label: "Ayar", icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="sticky top-0 z-20 border-b border-melon/10 bg-porcelain/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-cocoa">
            <span className="logo-glow inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-premium">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/serra-logo.jpg" alt="Serra'nın Tarif Defteri" className="h-full w-full object-cover" />
            </span>
            <span className="brand-script text-xl font-black leading-none">Serra&apos;nın Tarif Defteri</span>
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-melon/10 bg-porcelain/88 px-3 pt-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-6 gap-1 rounded-[1.6rem]">
          {tabs.map((tab) => {
            const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black transition ${
                  active ? "bg-gradient-to-br from-melon to-butter text-white shadow-premium" : "text-cocoa/50"
                }`}
              >
                <Icon size={20} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
