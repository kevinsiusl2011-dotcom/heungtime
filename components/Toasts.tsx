"use client";

import { useStore } from "@/lib/store";

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          className="pointer-events-auto rounded-2xl border border-line bg-bg/95 px-4 py-3 text-left text-sm shadow-lg"
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}
