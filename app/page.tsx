import Link from "next/link";
import {
  CalendarDays,
  MessageCircle,
  Shield,
  Store,
  Ticket,
  TrainFront,
  Utensils,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CompareGrid } from "@/components/CompareGrid";
import { Ticker } from "@/components/Ticker";

const steps = [
  {
    icon: Ticket,
    title: "訂閱本地節奏",
    body: "演唱會、搶飛日子、港超、商場限時、西九檔期，一次訂閱，自動入曆。",
    tilt: "-rotate-1",
  },
  {
    icon: CalendarDays,
    title: "接到你正在用的日曆",
    body: "香港人已經用日曆管時間。我們不另做一個 App 取代它，而是寫進 Google Calendar。",
    tilt: "rotate-1",
  },
  {
    icon: Utensils,
    title: "散場即搵食",
    body: "加入活動後，按步行分鐘、剩餘席位、口味與預算，排出附近 3 間有位餐廳。",
    tilt: "-rotate-1",
  },
  {
    icon: TrainFront,
    title: "趕得切尾班車",
    body: "每間餐廳標明是否趕得切該場地港鐵尾班車。夜歸不再估時間。",
    tilt: "rotate-1",
  },
];

const stamps = ["演唱會", "搶飛", "港超", "商場夜", "西九", "宵夜"];

export default function LandingPage() {
  return (
    <AppShell solid={false}>
      <Ticker />
      <main id="main" className="mx-auto max-w-6xl px-5 pb-8">
        <section className="grid gap-12 py-14 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-pink/40 bg-pink/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-pink">
              <span className="live-dot" />
              香港夜生活 · 即時入曆
            </p>
            <h1 className="display mt-5 text-5xl leading-[1.05] md:text-7xl">
              今晚去邊、
              <br />
              <span className="text-gold">食乜、趕唔趕車</span>
              <br />
              寫入日曆就搞掂。
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              節奏快就唔好再翻三個 App。享時把演唱會、搶飛、球賽同商場限時接到你的 Google Calendar，散場嗰刻已經排好有位餐廳同尾班車。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {stamps.map((s, i) => (
                <span
                  key={s}
                  className={`stamp ${i % 2 ? "text-mint" : "text-pink"} ${i % 3 === 0 ? "rotate-2" : "-rotate-2"}`}
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/live"
                className="rounded-xl bg-gold px-6 py-3.5 text-sm font-black text-bg shadow-[6px_6px_0_0_#ff3d8a] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_#ff3d8a]"
              >
                開始用享時
              </Link>
              <Link
                href="/merchants"
                className="rounded-xl border border-line px-6 py-3.5 text-sm font-bold hover:border-gold"
              >
                商戶買散場廣告位
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">C 端免費 · 資料存於你的裝置 · 商戶只為確認入座付費</p>
          </div>
          <HeroCard />
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {steps.map((s) => (
            <article key={s.title} className={`glass card-pop rounded-2xl p-5 ${s.tilt}`}>
              <s.icon className="text-gold" size={22} />
              <h3 className="display mt-4 text-xl">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{s.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-16 grid gap-8 md:grid-cols-2">
          <article className="rounded-2xl border border-line p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint">不只球賽</p>
            <h2 className="display mt-3 text-3xl">香港活動一條時間線</h2>
            <ul className="mt-6 space-y-3 text-muted">
              <li>國際賽事／港超：賽程入曆，開波前後接酒吧枱位。</li>
              <li>演唱會與搶飛：開售前清出空白檔，散場後接訂座。</li>
              <li>商場限時：海港城、K11、ifc、時代廣場會員夜。</li>
              <li>演藝展覽：M+、戲曲中心、會展 Art Week。</li>
            </ul>
          </article>
          <article className="rounded-2xl bg-pink p-8 text-white shadow-[8px_8px_0_0_#d6ff3a]">
            <Store />
            <h2 className="display mt-3 text-3xl">日曆即廣告位</h2>
            <p className="mt-4 leading-7 text-white/85">
              用戶把活動加入日曆的那一秒，意圖最準——時間、地點、人數、要食。
              排序以步行、空位、口味與尾班車為主，合作標籤可見，但不買斷頭位。
              商戶按確認入座付 CPA，沒有空點擊帳單。
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm font-bold text-gold">
              <Zap size={16} /> 意圖流量，不是橫額曝光。
            </p>
          </article>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          <article className="glass card-pop rounded-2xl p-6">
            <MessageCircle className="text-mint" size={22} />
            <h3 className="display mt-3 text-xl">WhatsApp 原生</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              香港餐廳用 WhatsApp 接訂。享時預填散場時間與人數，一鍵傳到商戶，確認編號寫回日曆。
            </p>
          </article>
          <article className="glass card-pop rounded-2xl p-6">
            <Shield className="text-mint" size={22} />
            <h3 className="display mt-3 text-xl">私隱先</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              日程、訂座與偏好預設存在你的瀏覽器。沒有強制註冊，也沒有把日曆賣給第三方廣告網絡。
            </p>
          </article>
          <article className="glass card-pop rounded-2xl p-6">
            <TrainFront className="text-mint" size={22} />
            <h3 className="display mt-3 text-xl">為香港夜歸而設</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              場地港鐵站、尾班車、步行分鐘寫進每張推薦。趕車的人不會被排去開到 1 點但離車站 20 分鐘的店。
            </p>
          </article>
        </section>

        <CompareGrid />
      </main>
    </AppShell>
  );
}

function HeroCard() {
  return (
    <div className="relative">
      <div className="absolute -right-2 -top-3 rotate-6 rounded-lg bg-gold px-3 py-1 text-xs font-black text-bg">
        TONIGHT
      </div>
      <div className="glass neon-ring rounded-2xl p-6">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-pink">
          <span className="live-dot" />
          日曆描述 · 夜歸計劃
        </p>
        <h3 className="display mt-3 text-2xl md:text-3xl">陳奕迅 FEAR AND DREAMS</h3>
        <p className="mt-1 text-sm text-muted">9月12日 週六 20:00 · 紅磡香港體育館</p>
        <div className="mt-5 space-y-2 rounded-xl bg-field p-4 text-sm leading-7">
          <p className="font-bold text-gold">散場 22:30 · 紅磡站尾班車 00:32</p>
          <p>按步行、空位、趕車排序：</p>
          <p>1. 太興（紅磡站）｜5 分鐘｜趕得切</p>
          <p>2. 翠園・粵菜（黃埔）｜8 分鐘｜合作留位</p>
          <p>3. 海旁居酒屋（紅磡）｜10 分鐘｜23:15 仍有位</p>
          <p className="font-bold text-mint">WhatsApp 一鍵訂座，確認編號寫回日曆</p>
        </div>
      </div>
    </div>
  );
}
