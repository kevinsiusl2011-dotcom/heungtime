# 享時 HeungTime

香港活動智能日曆。把演唱會搶飛、商場限時、演藝展覽與球賽接到你的行事曆；散場後按步行、空位與尾班車，經 WhatsApp 一鍵訂座。

C 端免費。商戶按確認入座付 CPA。資料預設存在你的裝置。

## 本機啟動

```bash
npm install
npm run dev
```

開啟 [http://localhost:3289](http://localhost:3289)

| 路徑 | 說明 |
| --- | --- |
| `/live` | 智能日曆、Agent、夜歸計劃 |
| `/discover` | 活動發現與搜尋 |
| `/events/[id]` | 活動詳情 |
| `/bookings` | 訂座與確認編號 |
| `/account` | 人數、口味、尾班車設定 |
| `/merchants` | 商戶成效與合作申請 |
| `/api/ics/all` | 可匯入 Google Calendar 的 ICS |

## 產品原則

- 排序以步行、席位、口味、預算、尾班車為主；合作標籤可見，但不買斷頭位。
- 即時留位商戶發送即確認；其他訂座為待商戶回覆。
- 搶飛活動帶 15 分鐘提前提醒（ICS VALARM）。
