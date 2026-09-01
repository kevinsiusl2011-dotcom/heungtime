"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

export function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="relative grid h-9 w-9 rotate-[-8deg] place-items-center rounded-xl bg-gold text-bg shadow-[4px_4px_0_0_#ff3d8a]">
        <span className="text-sm font-black">時</span>
      </span>
      <span className={`display ${text}`}>
        享時
        <span className="ml-1.5 font-sans text-[0.55em] font-bold tracking-widest text-mint">
          LIVE
        </span>
      </span>
    </Link>
  );
}

const links = [
  { href: "/live", label: "智能日曆" },
  { href: "/discover", label: "發現活動" },
  { href: "/bookings", label: "我的訂座" },
  { href: "/merchants", label: "商戶" },
];

export function Nav({ solid = false }: { solid?: boolean }) {
  const pathname = usePathname();
  return (
    <header
      className={`sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl ${solid ? "" : ""}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Brand />
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "font-bold text-gold" : "hover:text-ink"}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/account" className="hidden rounded-xl border border-line px-4 py-2 text-sm md:inline">
            帳戶
          </Link>
          <Link
            href="/live"
            className="rounded-xl bg-gold px-4 py-2 text-sm font-black text-bg hover:brightness-110"
          >
            今晚出發
          </Link>
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto px-5 pb-3 text-sm text-muted md:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap ${pathname === l.href ? "font-bold text-gold" : "hover:text-ink"}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
