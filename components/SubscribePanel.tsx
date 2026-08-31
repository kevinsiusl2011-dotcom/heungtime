"use client";

import { useState } from "react";
import { appleWebcalUrl, icsSubscribeUrl } from "@/lib/calendar";
import { FEED_LAST_SYNCED, FEED_REFRESH_HOURS } from "@/lib/data";
import { formatDateTime } from "@/lib/calendar";

export function SubscribePanel({ feed = "all" }: { feed?: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = origin ? icsSubscribeUrl(origin, feed) : `/api/ics/${feed}`;
  const webcal = appleWebcalUrl(url.startsWith("http") ? url : `https://heungtime.hk/api/ics/${feed}`);

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
        唔另做 App。貼網址到 Google／Apple／Outlook，賽程改期 {FEED_REFRESH_HOURS}{" "}
        小時內刷新。描述已寫上散場有位——Timable 入曆就完，SportsCal 年費先有賽事。
      </p>
      <p className="mt-2 text-[11px] text-mint">
        資料同步 {formatDateTime(FEED_LAST_SYNCED)} · UID 穩定，改期唔會變成重複活動
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <button
          onClick={copy}
          className="rounded-full border border-line py-2 text-sm"
        >
          {copied ? "已複製訂閱網址" : "複製訂閱 URL（Google 用「從網址新增」）"}
        </button>
        <a href={webcal} className="rounded-full border border-line py-2 text-center text-sm">
          Apple Calendar（webcal）
        </a>
        <a href={`/api/ics/${feed}?download=1`} className="text-center text-xs text-mint">
          下載靜態 ICS（備援；訂閱先會自動更新）
        </a>
      </div>
    </section>
  );
}
