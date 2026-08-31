"use client";

import { Mail, X } from "lucide-react";
import { emailCopy } from "@/lib/agent";
import type { LocalEvent, RankedRestaurant } from "@/lib/types";

export function EmailPreview({
  event,
  restaurants,
  onClose,
}: {
  event: LocalEvent;
  restaurants: RankedRestaurant[];
  onClose: () => void;
}) {
  const copy = emailCopy(event, restaurants);
  const mailto = `mailto:?subject=${encodeURIComponent(copy.subject)}&body=${encodeURIComponent(copy.body)}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4" onClick={onClose}>
      <div
        className="glass w-full max-w-lg rounded-3xl p-6"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-gold">
            <Mail size={18} />
            <p className="text-xs uppercase tracking-[0.2em]">夜歸行程電郵</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="關閉">
            <X size={18} />
          </button>
        </div>
        <h3 className="mt-3 font-[family-name:var(--font-serif-tc)] text-xl">{copy.subject}</h3>
        <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-field p-4 text-sm leading-6 text-muted">
          {copy.body}
        </pre>
        <a
          href={mailto}
          className="mt-4 block rounded-full bg-gold py-3 text-center font-medium text-bg"
        >
          用預設電郵開啟
        </a>
      </div>
    </div>
  );
}
