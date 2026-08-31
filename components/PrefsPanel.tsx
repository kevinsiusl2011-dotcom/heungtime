"use client";

import { CUISINE_OPTIONS, HOME_DISTRICTS } from "@/lib/labels";
import { useStore } from "@/lib/store";

export function PrefsPanel() {
  const { prefs, setPrefs } = useStore();

  return (
    <section className="glass rounded-3xl p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-mint">你的節奏</p>
      <p className="mt-1 text-xs text-muted">
        OpenRice 要你餓咗先搜。呢度預先鎖定人數、預算、尾班車，散場嗰秒不用再揀。
      </p>
      <label className="mt-3 block text-xs text-muted">
        預設人數
        <select
          className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2 text-sm text-ink"
          value={prefs.partySize}
          onChange={(e) => setPrefs({ partySize: Number(e.target.value) })}
        >
          {[2, 3, 4, 6, 8].map((n) => (
            <option key={n} value={n}>
              {n} 位
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-xs text-muted">
        預算上限
        <select
          className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2 text-sm text-ink"
          value={prefs.maxPrice}
          onChange={(e) =>
            setPrefs({ maxPrice: Number(e.target.value) as 1 | 2 | 3 | 4 })
          }
        >
          <option value={1}>$ 茶餐廳</option>
          <option value={2}>$$ </option>
          <option value={3}>$$$ </option>
          <option value={4}>$$$$ 不限</option>
        </select>
      </label>
      <label className="mt-3 block text-xs text-muted">
        通常出發地
        <select
          className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2 text-sm text-ink"
          value={prefs.homeDistrict}
          onChange={(e) => setPrefs({ homeDistrict: e.target.value })}
        >
          {HOME_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={prefs.needLastTrain}
          onChange={(e) => setPrefs({ needLastTrain: e.target.checked })}
        />
        一定要趕尾班車
      </label>
      <div className="mt-3 flex flex-wrap gap-1">
        {CUISINE_OPTIONS.map((c) => {
          const on = prefs.cuisines.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() =>
                setPrefs({
                  cuisines: on
                    ? prefs.cuisines.filter((x) => x !== c)
                    : [...prefs.cuisines, c],
                })
              }
              className={`rounded-full px-2 py-1 text-[11px] ${
                on ? "bg-gold text-bg" : "border border-line text-muted"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </section>
  );
}
