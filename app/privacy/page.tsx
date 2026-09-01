import { AppShell } from "@/components/AppShell";

export const metadata = { title: "私隱政策" };

export default function PrivacyPage() {
  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-3xl px-5 py-10 leading-7 text-muted">
        <h1 className="display text-4xl text-ink">私隱政策</h1>
        <p className="mt-2 text-sm">最後更新：2026 年 9 月 1 日</p>
        <p className="mt-6">
          享時 Ease（「我們」）把香港活動接到你的個人日程。我們採取資料最小化原則。
        </p>
        <h2 className="mt-8 text-xl text-ink">我們收集什麼</h2>
        <p className="mt-3">
          稱呼、WhatsApp 電話、電郵（選填）、人數、口味、出發地區、是否需趕尾班車、你加入的活動與訂座紀錄。
        </p>
        <h2 className="mt-8 text-xl text-ink">儲存在哪裡</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>偏好、日曆與本機訂座副本預設存在你的瀏覽器（localStorage）。</li>
          <li>
            訂座席位、確認編號、商戶合作申請、CPA 入座帳冊存在我們的伺服器資料庫（本機 SQLite；部署環境按
            DATABASE_PATH 設定）。這是為了避免兩人同時搶同一枱，以及讓商戶核銷入座。
          </li>
          <li>
            若你建立同步碼，日曆與偏好會加密傳輸後以該碼索引備份，方便換機還原。誰持有同步碼即可讀取該備份。
          </li>
          <li>
            若你連接 Google 日曆，我們只保存 OAuth 存取／更新權杖，用來在你指示下寫入你選擇的活動。權杖存在伺服器並以 httpOnly
            Cookie 對應工作階段。
          </li>
          <li>
            若已設定 WhatsApp Cloud API，訂座內容會發到你所選餐廳的 WhatsApp 號碼。否則只產生 wa.me
            連結，由你在裝置上傳送。
          </li>
        </ul>
        <h2 className="mt-8 text-xl text-ink">我們如何使用</h2>
        <p className="mt-3">
          僅用於為你排序餐廳、計算通勤與尾班車、預填訂座訊息、扣減／釋放席位、向你選擇的商戶發送或協助發送
          WhatsApp 訂座，以及在商戶確認入座後計算 CPA。商戶後台只顯示與該餐廳相關的訂座與入座數字。
        </p>
        <h2 className="mt-8 text-xl text-ink">我們不會做的事</h2>
        <p className="mt-3">
          不會把你的日曆內容出售予第三方廣告網絡，不會在未獲你指示下向商戶發送訂座，亦不會以橫額廣告追蹤你瀏覽其他網站。
        </p>
        <h2 className="mt-8 text-xl text-ink">你的選擇</h2>
        <p className="mt-3">
          可隨時在帳戶更改偏好、取消訂座、或用同步碼還原／覆蓋備份。清除瀏覽器網站資料會刪除本機紀錄，但已寫入伺服器的訂座與席位紀錄仍會保留至取消或過期。如你透過
          WhatsApp 聯絡商戶，該對話受 WhatsApp 及其私隱政策約束。
        </p>
        <h2 className="mt-8 text-xl text-ink">聯絡</h2>
        <p className="mt-3">私隱查詢：privacy@heungtime.hk</p>
      </main>
    </AppShell>
  );
}
