"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RESTAURANTS, restaurantById } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { Booking, CpaEntry } from "@/lib/types";

export default function MerchantsPage() {
  const { stats, bookings, addLead } = useStore();
  const totalSpend = stats.reduce((s, x) => s + x.spend, 0);
  const totalBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "attended").length;
  const totalImpressions = stats.reduce((s, x) => s + x.impressions, 0);
  const avgConv =
    totalImpressions === 0 ? 0 : stats.reduce((s, x) => s + x.bookings, 0) / totalImpressions;

  const [name, setName] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [district, setDistrict] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  function onApply(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !restaurant.trim() || !phone.trim()) return;
    void addLead({
      name: name.trim(),
      restaurant: restaurant.trim(),
      district: district.trim(),
      phone: phone.trim(),
      note: note.trim(),
    });
    setName("");
    setRestaurant("");
    setDistrict("");
    setPhone("");
    setNote("");
  }

  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">B2B · 散場廣告位</p>
        <h1 className="mt-2 display text-4xl">
          免費流量，變成入座
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted">
          用戶把活動寫進日曆時，意圖已經鎖定：時間、地點、人數、要食。
          享時把這意圖賣給步行圈內的餐廳——按確認入座收 CPA，不是按曝光。C 端永遠免費。
          排序以步行、空位、口味與尾班車為主，合作標籤可見，但不買斷頭位。
          曝光數字來自此瀏覽器；實際 CPA 以商戶 PIN 後台核銷入座為準。
        </p>

        <MerchantDesk />

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label="意圖曝光" value={String(totalImpressions)} hint="寫入日曆／Agent 推薦" />
          <Stat label="已確認訂座" value={String(totalBookings)} hint="本機確認／即時留位" />
          <Stat
            label="廣告費"
            value={`HK$${totalSpend.toLocaleString()}`}
            hint="CPA × 已入座（核銷）"
          />
          <Stat
            label="平均轉化"
            value={`${Math.round(avgConv * 100)}%`}
            hint="訂座／曝光"
          />
        </div>

        <section className="mt-10 overflow-x-auto rounded-3xl border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gold-soft text-ink">
              <tr>
                <th className="px-4 py-3 font-medium">商戶</th>
                <th className="px-4 py-3 font-medium">區域</th>
                <th className="px-4 py-3 font-medium">曝光</th>
                <th className="px-4 py-3 font-medium">點擊</th>
                <th className="px-4 py-3 font-medium">訂座</th>
                <th className="px-4 py-3 font-medium">轉化</th>
                <th className="px-4 py-3 font-medium">CPA</th>
                <th className="px-4 py-3 font-medium">廣告費</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => {
                const r = restaurantById(row.restaurantId);
                if (!r) return null;
                return (
                  <tr key={row.restaurantId} className="border-t border-line">
                    <td className="px-4 py-3">
                      {r.name}
                      {r.sponsored && <span className="ml-2 text-xs text-gold">合作</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{r.district}</td>
                    <td className="px-4 py-3">{row.impressions}</td>
                    <td className="px-4 py-3">{row.clicks}</td>
                    <td className="px-4 py-3">{row.bookings}</td>
                    <td className="px-4 py-3">{Math.round(row.conversion * 100)}%</td>
                    <td className="px-4 py-3 text-muted">HK${r.advertiserCpa}</td>
                    <td className="px-4 py-3 text-gold">HK${row.spend}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <Package
            title="紅館散場圈"
            body="15 分鐘步行、22:30–23:30 夜場留位。適合粵菜、居酒屋、茶餐廳。"
            price="CPA HK$18–48"
          />
          <Package
            title="賽前套餐"
            body="旺角大球場／啟德開波前 18:00 入座。酒吧高腳枱可買英超直播檔。"
            price="CPA HK$28–34"
          />
          <Package
            title="西九／會展窗"
            body="展覽散場與 Art Week 午餐。步行圈內、趕得切柯士甸／會展站。"
            price="CPA HK$22–58"
          />
        </section>

        <section className="mt-10 grid gap-8 md:grid-cols-2">
          <article className="glass rounded-3xl p-6">
            <h2 className="display text-2xl">申請合作</h2>
            <p className="mt-2 text-sm text-muted">留下聯絡，我們以 WhatsApp 確認步行圈與空位 API。</p>
            <form onSubmit={onApply} className="mt-4 space-y-3">
              <input
                className="w-full rounded-xl border border-line bg-field px-3 py-2 text-sm"
                placeholder="聯絡人"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                className="w-full rounded-xl border border-line bg-field px-3 py-2 text-sm"
                placeholder="餐廳名稱"
                value={restaurant}
                onChange={(e) => setRestaurant(e.target.value)}
                required
              />
              <input
                className="w-full rounded-xl border border-line bg-field px-3 py-2 text-sm"
                placeholder="地區"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-line bg-field px-3 py-2 text-sm"
                placeholder="WhatsApp"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <textarea
                className="w-full rounded-xl border border-line bg-field px-3 py-2 text-sm"
                placeholder="場地步行圈／夜場留位說明"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button type="submit" className="w-full rounded-xl bg-gold py-3 text-sm font-black text-bg">
                提交申請
              </button>
            </form>
          </article>
          <article className="rounded-3xl bg-gold/10 p-6">
            <h2 className="display text-2xl">計費原則</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
              <li>只為「確認入座」付費，待確認狀態不收費。</li>
              <li>合作餐廳只多 1 分排序權重，不能買斷第一位。</li>
              <li>C 端用戶看不到 CPA 金額，只看到「合作留位」。</li>
              <li>現有合作餐廳 {RESTAURANTS.filter((r) => r.sponsored).length} 間，CPA HK$16–96。</li>
            </ul>
          </article>
        </section>
      </main>
    </AppShell>
  );
}

function MerchantDesk() {
  const { catalogRev } = useStore();
  const [restaurantId, setRestaurantId] = useState(RESTAURANTS[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ledger, setLedger] = useState<CpaEntry[]>([]);
  const [billed, setBilled] = useState(0);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch("/api/merchant/dashboard");
    if (res.status === 401) {
      setName("");
      return;
    }
    const data = (await res.json()) as {
      ok?: boolean;
      name?: string;
      bookings?: Booking[];
      ledger?: CpaEntry[];
      billed?: number;
    };
    if (data.ok) {
      setName(data.name ?? "");
      setBookings(data.bookings ?? []);
      setLedger(data.ledger ?? []);
      setBilled(data.billed ?? 0);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/merchant/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, pin }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; name?: string };
    if (!res.ok || !data.ok) {
      setError(data.error ?? "登入失敗");
      return;
    }
    setPin("");
    await refresh();
  }

  async function mark(code: string, status: "confirmed" | "attended") {
    const res = await fetch("/api/book/attend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationCode: code, status }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setError(data.error ?? "更新狀態失敗");
      return;
    }
    setError("");
    await refresh();
  }

  return (
    <section className="mt-10 rounded-3xl border border-line p-6">
      <h2 className="display text-2xl">商戶核銷後台</h2>
      <p className="mt-2 text-sm text-muted">
        用餐廳 PIN 登入後可確認訂座、標記入座。請在伺服器設定 MERCHANT_PINS；本機未設定時試用 PIN 為 4821。
      </p>
      {!name ? (
        <form onSubmit={onLogin} className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]">
          <select
            key={catalogRev}
            className="rounded-xl border border-line bg-field px-3 py-2 text-sm"
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
          >
            {RESTAURANTS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border border-line bg-field px-3 py-2 text-sm"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            inputMode="numeric"
          />
          <button className="rounded-xl bg-gold px-4 py-2 text-sm font-black text-bg">登入</button>
          {error && <p className="text-sm text-pink md:col-span-3">{error}</p>}
        </form>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">{name}</p>
            <p className="text-sm text-gold">已入座 CPA HK${billed.toLocaleString()}</p>
            <button
              className="rounded-full border border-line px-3 py-1 text-sm"
              onClick={() => void fetch("/api/merchant/login", { method: "DELETE" }).then(() => setName(""))}
            >
              登出
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="py-2">編號</th>
                  <th>客人</th>
                  <th>時段</th>
                  <th>狀態</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-line">
                    <td className="py-2 text-gold">{b.confirmationCode}</td>
                    <td>
                      {b.guestName} · {b.partySize} 位
                    </td>
                    <td>{b.slot}</td>
                    <td>{b.status}</td>
                    <td className="py-2">
                      {b.status !== "cancelled" && b.status !== "attended" && (
                        <div className="flex gap-2">
                          {b.status === "pending" && (
                            <button
                              className="rounded-full border border-line px-3 py-1"
                              onClick={() => void mark(b.confirmationCode, "confirmed")}
                            >
                              確認
                            </button>
                          )}
                          <button
                            className="rounded-full bg-mint px-3 py-1 text-bg"
                            onClick={() => void mark(b.confirmationCode, "attended")}
                          >
                            入座
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ledger.length > 0 && (
            <p className="text-xs text-muted">{ledger.length} 筆已入帳</p>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="glass rounded-3xl p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="display mt-2 text-4xl text-gold">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </article>
  );
}

function Package({ title, body, price }: { title: string; body: string; price: string }) {
  return (
    <article className="rounded-3xl border border-line p-6">
      <h3 className="display text-xl">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      <p className="mt-4 text-sm text-gold">{price}</p>
    </article>
  );
}
