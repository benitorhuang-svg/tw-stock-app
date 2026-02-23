# 000 — 模組 4：推播與排程系統 (Notification & Cron)

> M5 已經接管了所有的視覺佈局與版面 UI。因此，原本充斥著組件規格的 `M4` 現在回歸為專職的 **「背景守護程序 (Background Daemon) 與通知發動引擎」**。

## 職責與架構翻轉 (Paradigm Shift)

| 傳統 UI 與通知綁定 (已淘汰)                                 | M4 背後引擎化 (The New Era)                                           |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| 每個頁面寫大量的 `setTimeout` 或 `setInterval` 手動抓報價。 | 由 `Cron Scheduler` 統一輪詢 SQLite / API 並用 WebSocket 推播。       |
| Toast 與 Error 視覺散落在每個按鈕裡面。                     | 改為事件驅動 (Event-driven) 觸發通知。                                |
| `004` 規格負責定義按鈕長怎樣。                              | 專注於即時資料的流動與條件警示的觸發 `(if MA cross then FireAlert)`。 |

## 包含的規格文件

- `001-realtime-engine.md`：如何將 `TWSE` 盤中資訊即時送到有開啟的首頁 (WebSocket/SSE 規劃)。
- `002-alert-emitter.md`：如何整合 `M3 選股器` 跑出結果後，發送符合人類閱讀的 Toast / Push Notifications。
