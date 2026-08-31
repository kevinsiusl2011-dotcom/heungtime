"use client";

import { useRef } from "react";
import { useStore } from "@/lib/store";

export function IcsImport({ compact = false }: { compact?: boolean }) {
  const { importIcs, notify } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const n = importIcs(text);
    notify(n ? `已匯入 ${n} 個行程（與現有重複的會略過）` : "檔案沒有可匯入的行程");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <label className={compact ? "block text-xs text-mint" : "block text-sm"}>
      {compact ? "匯入你現有的 ICS" : "匯入 ICS（Google／Apple 匯出）"}
      <input
        ref={inputRef}
        type="file"
        accept=".ics,text/calendar"
        className={compact ? "mt-1 block w-full text-xs" : "mt-1 block w-full text-sm"}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </label>
  );
}
