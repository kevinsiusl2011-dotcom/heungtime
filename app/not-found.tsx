import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function NotFound() {
  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-xl px-5 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">404</p>
        <h1 className="mt-3 display text-4xl">呢頁唔存在</h1>
        <p className="mt-3 text-muted">活動可能已過檔，或連結打錯。返回日曆或發現頁再搵。</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/live" className="rounded-full bg-gold px-5 py-2 text-bg">
            智能日曆
          </Link>
          <Link href="/discover" className="rounded-full border border-line px-5 py-2">
            發現活動
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
