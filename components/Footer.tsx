import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="display text-lg">享時 Ease</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            香港活動寫進你的日曆，散場後按步行、空位與尾班車一鍵訂座。C 端免費，商戶按確認入座付費。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm text-muted">
          <div className="flex flex-col gap-2">
            <Link href="/live">智能日曆</Link>
            <Link href="/discover">發現活動</Link>
            <Link href="/bookings">我的訂座</Link>
            <Link href="/account">帳戶設定</Link>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/merchants">商戶合作</Link>
            <Link href="/faq">常見問題</Link>
            <Link href="/privacy">私隱政策</Link>
            <Link href="/terms">使用條款</Link>
          </div>
        </div>
      </div>
      <p className="border-t border-line px-5 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} 享時 Ease · 偏好存於裝置，訂座席位存於伺服器
      </p>
    </footer>
  );
}
