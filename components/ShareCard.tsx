"use client";

import { useMemo, useState } from "react";
import { Share2, Copy, Check, Sparkles, Gift } from "lucide-react";
import { useStore } from "@/lib/store";
import { DAYDREAM_REFERRAL_URL } from "@/lib/data";
import { Modal } from "./Modal";

export function ShareCard({
  eventId,
  restaurantId,
  title,
  subtitle,
}: {
  eventId?: string;
  restaurantId?: string;
  title?: string;
  subtitle?: string;
}) {
  const { profile } = useStore();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://heungtime.hk";
    const url = new URL(`${origin}/live`);
    if (eventId) url.searchParams.set("event", eventId);
    if (restaurantId) url.searchParams.set("book", restaurantId);
    if (profile.referralCode) url.searchParams.set("ref", profile.referralCode);
    return url.toString();
  }, [eventId, restaurantId, profile.referralCode]);

  const waText = useMemo(() => {
    const head = title ? `《${title}》` : "享時 Ease · 香港活動智能日曆";
    const body =
      subtitle ??
      "我喺享時幫你預留咗散場餐廳位，直接入去睇吓，仲可以問大師今日運勢 🍀";
    const daydream = profile.referralCode
      ? `${DAYDREAM_REFERRAL_URL}?utm_source=heungtime&utm_campaign=whatsapp-share&ref=${profile.referralCode}`
      : `${DAYDREAM_REFERRAL_URL}?utm_source=heungtime&utm_campaign=whatsapp-share`;
    return encodeURIComponent(
      `${head}\n${body}\n\n🎡 享時行程：${shareUrl}\n\n🍀 順便睇埋今日命理：${daydream}`,
    );
  }, [title, subtitle, shareUrl, profile.referralCode]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:border-pink hover:text-pink"
      >
        <Share2 size={14} />
        分享俾朋友
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} labelledBy="share-title">
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-pink">邀請連結</p>
                <h3 id="share-title" className="mt-1 display text-lg">
                  打卡分享行程
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-ink"
                aria-label="關閉"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl border border-pink/30 bg-gradient-to-br from-pink-50 via-gold-50 to-mint-50 p-4 dark:from-pink-950/30 dark:via-gold-950/20 dark:to-mint-950/20">
              <div className="flex items-center gap-2 text-pink">
                <Gift size={16} />
                <p className="text-xs font-bold uppercase tracking-widest">
                  你嘅邀請碼：{profile.referralCode || "HT-GUEST"}
                </p>
              </div>
              <p className="mt-2 text-sm text-ink leading-6">
                朋友經你連結加入享時，會自動帶你嘅推薦標籤；未來商戶合作優惠，你哋兩邊都有著數。
              </p>
              {profile.referredCount > 0 && (
                <p className="mt-2 text-xs font-semibold text-mint">
                  已經成功邀請 {profile.referredCount} 位朋友 🎉
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-muted mb-1.5">行程連結</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded-xl border border-line bg-field px-3 py-2 text-xs"
                />
                <button
                  onClick={onCopy}
                  className="inline-flex items-center gap-1 rounded-xl bg-gold px-3 py-2 text-xs font-black text-bg"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "已複製" : "複製"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/?text=${waText}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-mint py-3 text-center text-sm font-black text-bg"
              >
                WhatsApp 傳送
              </a>
              <button
                onClick={async () => {
                  if (typeof navigator === "undefined" || !navigator.share) return;
                  try {
                    await navigator.share({
                      title: title ?? "享時 Ease 行程",
                      text: subtitle ?? "睇完活動，問吓大師今日運勢 🍀",
                      url: shareUrl,
                    });
                  } catch {
                    /* ignore */
                  }
                }}
                className="rounded-xl border border-line py-3 text-sm font-semibold"
              >
                <Sparkles size={14} className="mr-1 inline" />
                系統分享
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
