import { AppShell } from "@/components/AppShell";

export const metadata = { title: "常見問題" };

export default function FaqPage() {
  const items = [
    {
      q: "享時會取代 Google Calendar 嗎？",
      a: "不會。我們把活動與訂座寫進你正在用的行事曆，並提供 ICS 訂閱與 Google Calendar 範本。",
    },
    {
      q: "餐廳排序會不會被廣告買斷？",
      a: "不會。排序以步行分鐘、剩餘席位、口味、預算與尾班車安全為主。合作餐廳只多 1 分權重，並清楚標示「合作留位」。",
    },
    {
      q: "WhatsApp 訂座如何運作？",
      a: "系統預填散場時間、人數與確認編號，你一鍵傳到商戶 WhatsApp。已接即時留位的商戶發送即確認；其他為待回覆。",
    },
    {
      q: "我的日曆資料去咗邊？",
      a: "預設存在你的瀏覽器。沒有強制註冊，也沒有把行程賣給第三方廣告網絡。詳見私隱政策。",
    },
    {
      q: "尾班車時間準不準？",
      a: "以各場地就近港鐵站的常規尾班車為基準，並預留步行與候車緩衝。實際車次請以港鐵當日公布為準。",
    },
  ];

  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-[family-name:var(--font-serif-tc)] text-4xl">常見問題</h1>
        <div className="mt-8 space-y-6">
          {items.map((item) => (
            <article key={item.q} className="border-b border-line pb-6">
              <h2 className="text-lg">{item.q}</h2>
              <p className="mt-2 leading-7 text-muted">{item.a}</p>
            </article>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
