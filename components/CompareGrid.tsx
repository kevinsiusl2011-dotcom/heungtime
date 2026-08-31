const rows = [
  {
    capability: "寫進你正在用的日曆",
    us: "訂閱 ICS，Google／Apple／Outlook",
    sportime: "只得賽事；年費牆",
    timable: "另做 App，儲存清單常壞",
    openrice: "無日曆",
    klook: "一次性訂單",
    tickets: "偶爾匯出，入曆就完",
  },
  {
    capability: "香港演唱會／搶飛／商場／西九",
    us: "同一條時間線",
    sportime: "無",
    timable: "發現為主",
    openrice: "無",
    klook: "觀光票為主",
    tickets: "只得自己賣嘅場",
  },
  {
    capability: "搶飛專注檔（唔代出票）",
    us: "開售前清檔 + 鬧鐘",
    sportime: "無",
    timable: "撲飛資訊，唔擋時間",
    openrice: "無",
    klook: "無",
    tickets: "系統高峰崩潰",
  },
  {
    capability: "通勤／尾班車",
    us: "中環→紅館 25 分 + 尾班車",
    sportime: "無",
    timable: "無",
    openrice: "無日程語境",
    klook: "無",
    tickets: "無",
  },
  {
    capability: "散場有位餐廳",
    us: "寫入描述／Email，一鍵訂",
    sportime: "最多直播連結",
    timable: "無",
    openrice: "餓咗先搜，同場次割裂",
    klook: "套票，唔係散場宵夜",
    tickets: "無",
  },
  {
    capability: "排序是否買廣告位",
    us: "步行＋空位＋尾班車；合作只係標籤",
    sportime: "無餐廳",
    timable: "編輯推介",
    openrice: "贊助常壓有機",
    klook: "佣金導向",
    tickets: "廣告／真票難分",
  },
  {
    capability: "C 端收費",
    us: "永遠免費",
    sportime: "約 US$47／年",
    timable: "免費但體驗不穩",
    openrice: "免費 + 贊助排序",
    klook: "對客抽佣",
    tickets: "票價外服務費",
  },
  {
    capability: "商戶計費",
    us: "CPA，入座先收，空點擊 $0",
    sportime: "無 B2B 本地餐飲",
    timable: "曝光為主",
    openrice: "訂座＋廣告混合",
    klook: "佣金",
    tickets: "票務抽成",
  },
];

export function CompareGrid() {
  return (
    <section id="compare" className="mt-20">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">對手坑，逐個填</p>
      <h2 className="display mt-3 text-3xl md:text-4xl">
        唔做另一個活動 App，
        <br />
        亦唔做另一個 OpenRice。
      </h2>
      <p className="mt-4 max-w-2xl leading-7 text-muted">
        Sportime／SportsCal 只覆蓋球賽仲要收費；Timable 發現完就斷；OpenRice
        要你另行開 App 搵食；Cityline／URBTIX 搶飛當日崩潰。享時接上你已有的日曆，只在意圖最高嗰秒行動。
      </p>
      <div className="mt-8 overflow-x-auto rounded-3xl border border-line">
        <table className="min-w-[860px] w-full text-left text-sm">
          <thead className="bg-gold-soft text-ink">
            <tr>
              <th className="px-4 py-3 font-medium">能力</th>
              <th className="px-4 py-3 font-medium text-gold">享時</th>
              <th className="px-4 py-3 font-medium">Sportime</th>
              <th className="px-4 py-3 font-medium">Timable</th>
              <th className="px-4 py-3 font-medium">OpenRice</th>
              <th className="px-4 py-3 font-medium">Klook</th>
              <th className="px-4 py-3 font-medium">Cityline／URBTIX</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.capability} className="border-t border-line">
                <td className="px-4 py-3">{row.capability}</td>
                <td className="px-4 py-3 text-mint">{row.us}</td>
                <td className="px-4 py-3 text-muted">{row.sportime}</td>
                <td className="px-4 py-3 text-muted">{row.timable}</td>
                <td className="px-4 py-3 text-muted">{row.openrice}</td>
                <td className="px-4 py-3 text-muted">{row.klook}</td>
                <td className="px-4 py-3 text-muted">{row.tickets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
