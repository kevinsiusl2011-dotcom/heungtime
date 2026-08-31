"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { IcsImport } from "@/components/IcsImport";
import { CUISINE_OPTIONS, HOME_DISTRICTS } from "@/lib/labels";
import { useStore } from "@/lib/store";

const fieldClass =
  "mt-1 w-full rounded-xl border border-line bg-field px-3 py-2";

export default function AccountPage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="px-5 py-16 text-center text-muted">載入帳戶…</p>}>
        <AccountInner />
      </Suspense>
    </AppShell>
  );
}

function AccountInner() {
  const { ready, profile, updateProfile, notify, google, coords, requestGeo, enableDropAlerts } =
    useStore();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [maxPrice, setMaxPrice] = useState<1 | 2 | 3 | 4>(3);
  const [homeDistrict, setHomeDistrict] = useState("中環");
  const [needLastTrain, setNeedLastTrain] = useState(true);
  const [cuisines, setCuisines] = useState<string[]>([]);

  useEffect(() => {
    if (!ready) return;
    setName(profile.name);
    setPhone(profile.phone);
    setEmail(profile.email);
    setPartySize(profile.prefs.partySize);
    setMaxPrice(profile.prefs.maxPrice);
    setHomeDistrict(profile.prefs.homeDistrict);
    setNeedLastTrain(profile.prefs.needLastTrain);
    setCuisines(profile.prefs.cuisines);
  }, [ready, profile]);

  useEffect(() => {
    const g = searchParams.get("google");
    if (g === "ok") notify("Google 日曆已連接，之後加入活動會嘗試寫入");
    if (g === "denied") notify("Google 授權已取消");
    if (g === "error") notify("Google 授權失敗");
    if (g === "missing") notify("尚未設定 Google OAuth，請用 ICS 訂閱");
  }, [searchParams, notify]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      onboarded: true,
      prefs: { partySize, maxPrice, homeDistrict, needLastTrain, cuisines },
    });
    notify("帳戶設定已儲存");
  }

  return (
    <main id="main" className="mx-auto max-w-xl px-5 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">帳戶</p>
      <h1 className="mt-2 font-[family-name:var(--font-serif-tc)] text-4xl">你的夜歸設定</h1>
      <p className="mt-3 text-sm text-muted">
        偏好存在此瀏覽器。訂座席位在伺服器扣減，避免兩人同時搶同一枱。
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          稱呼
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm">
          WhatsApp 電話
          <input className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="block text-sm">
          電郵（選填，用於行程副本）
          <input
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            常用人數
            <select
              className={fieldClass}
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
            預算上限
            <select
              className={fieldClass}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value) as 1 | 2 | 3 | 4)}
            >
              <option value={1}>$</option>
              <option value={2}>$$</option>
              <option value={3}>$$$</option>
              <option value={4}>$$$$</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          出發地區
          <select
            className={fieldClass}
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
        <p className="text-xs text-muted">
          {coords
            ? `已記住 GPS ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
            : "未開定位時用出發地區估算通勤"}
        </p>
        <button
          type="button"
          onClick={requestGeo}
          className="w-full rounded-full border border-line py-2 text-sm"
        >
          用而家位置計通勤
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={needLastTrain}
            onChange={(e) => setNeedLastTrain(e.target.checked)}
          />
          優先趕得切尾班車
        </label>
        <div>
          <p className="text-sm">口味</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  setCuisines((prev) =>
                    prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                  )
                }
                className={`rounded-full px-3 py-1 text-xs ${
                  cuisines.includes(c) ? "bg-gold text-bg" : "border border-line text-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="w-full rounded-full bg-gold py-3 font-medium text-bg">
          儲存
        </button>
      </form>

      <section className="mt-10 space-y-3 rounded-3xl border border-line p-5">
        <h2 className="font-[family-name:var(--font-serif-tc)] text-xl">日曆與提醒</h2>
        <IcsImport />
        <button
          type="button"
          onClick={() => void enableDropAlerts()}
          className="w-full rounded-full border border-line py-2 text-sm"
        >
          開啟搶飛瀏覽器通知
        </button>
        {google.configured ? (
          <a href="/api/google/auth" className="block rounded-full border border-line py-2 text-center text-sm">
            {google.connected ? "重新連接 Google 日曆" : "連接 Google 日曆（加入活動時寫入）"}
          </a>
        ) : (
          <p className="text-xs text-muted">未設定 GOOGLE_CLIENT_ID。可先用 ICS 訂閱，見 .env.example。</p>
        )}
      </section>
    </main>
  );
}
