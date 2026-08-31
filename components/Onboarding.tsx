"use client";

import { FormEvent, useState } from "react";
import { CUISINE_OPTIONS, HOME_DISTRICTS } from "@/lib/labels";
import { useStore } from "@/lib/store";
import { Modal } from "./Modal";

export function Onboarding() {
  const { ready, profile, updateProfile } = useStore();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [partySize, setPartySize] = useState(profile.prefs.partySize);
  const [homeDistrict, setHomeDistrict] = useState(profile.prefs.homeDistrict);
  const [needLastTrain, setNeedLastTrain] = useState(profile.prefs.needLastTrain);
  const [cuisines, setCuisines] = useState<string[]>(profile.prefs.cuisines);

  if (!ready || profile.onboarded) return null;

  function toggleCuisine(c: string) {
    setCuisines((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      onboarded: true,
      prefs: { partySize, homeDistrict, needLastTrain, cuisines },
    });
  }

  return (
    <Modal onClose={() => updateProfile({ onboarded: true })} labelledBy="onboard-title">
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">開始使用</p>
        <h2 id="onboard-title" className="font-[family-name:var(--font-serif-tc)] text-2xl">
          你的夜歸設定
        </h2>
        <p className="text-sm text-muted">
          用來排餐廳、計尾班車同預填訂座。資料只存在你的裝置，可隨時在帳戶更改。
        </p>
        <label className="block text-sm">
          稱呼
          <input
            className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如 Ah Keung"
          />
        </label>
        <label className="block text-sm">
          WhatsApp 電話
          <input
            className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="8529xxxxxxx"
            inputMode="tel"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            常用人數
            <select
              className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2"
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n} 位
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            出發地區
            <select
              className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2"
              value={homeDistrict}
              onChange={(e) => setHomeDistrict(e.target.value)}
            >
              {HOME_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={needLastTrain}
            onChange={(e) => setNeedLastTrain(e.target.checked)}
          />
          優先趕得切尾班車
        </label>
        <div>
          <p className="text-sm">口味（可多選）</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCuisine(c)}
                className={`rounded-full px-3 py-1 text-xs ${
                  cuisines.includes(c) ? "bg-gold text-bg" : "border border-line text-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => updateProfile({ onboarded: true })}
            className="flex-1 rounded-full border border-line py-3 text-sm"
          >
            稍後
          </button>
          <button type="submit" className="flex-1 rounded-full bg-gold py-3 text-sm font-medium text-bg">
            開始用享時
          </button>
        </div>
      </form>
    </Modal>
  );
}
