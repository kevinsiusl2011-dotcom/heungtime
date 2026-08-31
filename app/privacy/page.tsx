import { AppShell } from "@/components/AppShell";

export const metadata = { title: "私隱政策" };

export default function PrivacyPage() {
  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-3xl px-5 py-10 leading-7 text-muted">
        <h1 className="font-[family-name:var(--font-serif-tc)] text-4xl text-ink">私隱政策</h1>
        <p className="mt-2 text-sm">最後更新：2026 年 8 月 31 日</p>
        <p className="mt-6">
          享時 HeungTime（「我們」）把香港活動接到你的個人日程。我們採取資料最小化原則。
        </p>
        <h2 className="mt-8 text-xl text-ink">我們收集什麼</h2>
        <p className="mt-3">
          稱呼、WhatsApp 電話、電郵（選填）、人數、口味、出發地區、是否需趕尾班車、你加入的活動與訂座紀錄。這些資料預設只存在你的裝置（瀏覽器 localStorage）。
        </p>
        <h2 className="mt-8 text-xl text-ink">我們如何使用</h2>
        <p className="mt-3">
          僅用於為你排序餐廳、計算通勤與尾班車、預填訂座訊息，以及向你選擇的商戶發送 WhatsApp 訂座。商戶後台只顯示經你操作產生的曝光、點擊與入座數字。
        </p>
        <h2 className="mt-8 text-xl text-ink">我們不會做的事</h2>
        <p className="mt-3">
          不會把你的日曆內容出售予第三方廣告網絡，不會在未獲你指示下向商戶發送訂座，亦不會以橫額廣告追蹤你瀏覽其他網站。
        </p>
        <h2 className="mt-8 text-xl text-ink">你的選擇</h2>
        <p className="mt-3">
          可隨時在帳戶更改或清空偏好。清除瀏覽器網站資料即刪除本機紀錄。如你透過 WhatsApp 聯絡商戶，該對話受 WhatsApp 及其私隱政策約束。
        </p>
        <h2 className="mt-8 text-xl text-ink">聯絡</h2>
        <p className="mt-3">私隱查詢：privacy@heungtime.hk</p>
      </main>
    </AppShell>
  );
}
