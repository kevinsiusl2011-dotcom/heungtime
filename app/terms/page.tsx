import { AppShell } from "@/components/AppShell";

export const metadata = { title: "使用條款" };

export default function TermsPage() {
  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-3xl px-5 py-10 leading-7 text-muted">
        <h1 className="display text-4xl text-ink">使用條款</h1>
        <p className="mt-2 text-sm">最後更新：2026 年 8 月 31 日</p>
        <p className="mt-6">
          使用享時 HeungTime 即表示你同意以下條款。本服務為香港活動日曆與訂座轉介，C 端免費。
        </p>
        <h2 className="mt-8 text-xl text-ink">服務範圍</h2>
        <p className="mt-3">
          活動時間、空位、尾班車與步行分鐘為規劃用途，實際車次、餐廳營業與票務以主辦方、港鐵及商戶當日公布為準。搶飛不保證購得門票。
        </p>
        <h2 className="mt-8 text-xl text-ink">訂座</h2>
        <p className="mt-3">
          WhatsApp 訂座可由你用 wa.me 發送，或在已設定 Cloud API 時由伺服器代發。即時留位商戶在系統內顯示確認，仍以商戶回覆／入座核銷為最終有效。取消費用如有，由商戶自行說明。
        </p>
        <h2 className="mt-8 text-xl text-ink">商戶</h2>
        <p className="mt-3">
          商戶按確認入座支付 CPA（系統以「已入座」核銷入帳）。待確認狀態不收費。合作標籤不得買斷排序第一位。虛報空位可被下架。
        </p>
        <h2 className="mt-8 text-xl text-ink">責任限制</h2>
        <p className="mt-3">
          在法律允許範圍內，我們不就交通延誤、商戶拒單、門票售罄或第三方平台中斷承擔間接損失。
        </p>
        <h2 className="mt-8 text-xl text-ink">聯絡</h2>
        <p className="mt-3">legal@heungtime.hk</p>
      </main>
    </AppShell>
  );
}
