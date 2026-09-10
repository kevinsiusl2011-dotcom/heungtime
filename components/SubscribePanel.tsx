"use client";

import { useState } from "react";
import { appleWebcalUrl, googleCalendarSubscribeUrl, icsSubscribeUrl } from "@/lib/calendar";
import { FEED_LAST_SYNCED, FEED_REFRESH_HOURS } from "@/lib/data";
import { formatDateTime } from "@/lib/calendar";

export function SubscribePanel({ feed = "all" }: { feed?: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fallbackOrigin = "https://heungtime.hk";
  const url = icsSubscribeUrl(origin || fallbackOrigin, feed);
  const webcal = appleWebcalUrl(url);
  const gcalSubscribe = googleCalendarSubscribeUrl(url);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="glass rounded-3xl p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">訂閱入你而家嘅日曆</p>
      <p className="mt-2 text-sm leading-6 text-muted">
        用訂閱網址，唔好下載檔案。賽程改期會更新同一個活動（UID 不變）。Apple／Outlook 約{" "}
        {FEED_REFRESH_HOURS} 小時內刷新；Google 要「從網址新增日曆」先會持續拉新。
      </p>
      <p className="mt-2 text-[11px] text-mint">
        資料同步 {formatDateTime(FEED_LAST_SYNCED)} · 改期唔會變成重複活動
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <a
          href={gcalSubscribe}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-gold py-2 text-center text-sm font-black text-bg"
        >
          訂閱到 Google 日曆（持續更新）
        </a>
        <button
          onClick={copy}
          className="rounded-full border border-line py-2 text-sm"
        >
          {copied ? "已複製訂閱網址" : "複製訂閱 URL（Google「從網址新增」）"}
        </button>
        <a href={webcal} className="rounded-full border border-line py-2 text-center text-sm">
          Apple Calendar（webcal）
        </a>
        <a href={`/api/ics/${feed}?download=1`} className="text-center text-xs text-muted">
          下載靜態 ICS（一次性；唔會跟住改期）
        </a>
      </div>
    </section>
  );
}
