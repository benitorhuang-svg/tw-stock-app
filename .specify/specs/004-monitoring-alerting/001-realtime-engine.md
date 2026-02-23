# 001 — 背景輪詢與即時引擊 (Realtime Engine & Cron)

> 當這套量化系統在使用者開著 `002-tab-overview.md (總覽分頁)` 盯盤時，需要一個心跳機製來不斷將「最新的 Tick 或五檔」推送給前端。這就是 `M4: 監控引擎` 的第一號任務。

## 1. 架構：盤中即時流道 (Intraday Data Pipeline)

### 1.1 資料取得端 (Polling Service)

- 台灣股市開盤時間 (09:00 - 13:30)。
- `cron_service.ts`: 在盤中必須每隔 $X$ 毫秒（如 5 秒），透過 Server-side 去呼叫 TWSE 的即時 API 叢集 (`mis.twse.com.tw/stock/api/getStockInfo.jsp`)。
- 這個輪詢不會寫入 SQLite (以免效能浪費)，它只維護在一個 In-Memory Map 中 (`Map<Symbol, CurrentTick>`)。

### 1.2 資料推送端 (SSE / WebSocket)

- 由於 Astro 支援 API endpoint，我們要在 `/api/live.ts` 開放一個 **Server-Sent Events (SSE)** 流。
- 前端 (Client-side Web Component) 在載入後開啟 `EventSource` 訂閱這個端點。
- 這樣不管前端停在哪個頁籤，只要 Server 抓到了新價格，就會主動拋回 `{ symbol: 2330, price: 605, time: 10:20 }`。

### 1.3 斷線與重連 (Resilience)

- `EventSource` 具備自動重連機制。
- 若 Server 端察覺超過一分鐘抓不到 TWSE 報價 (例如假日、盤後、API 被擋)，Server 會由 SSE 送出一個 `{"status": "OFFLINE"}` 事件，前端收到後立刻在畫面右上角亮起紅色的 Offline 警示徽章，並停止動畫更新。

## 2. 背景定期清掃 (Data Sweeper)

- 在每天盤後 (如 14:30)，排程器觸發 `001-data-ingestion` 裡面的 `build-sqlite-db.js`。
- 這個機制讓我們的「特徵工程 SQLite」每天都是最新的。
- 一旦這顆 DB 重建完畢，Server 可以發送推播事件 `{ "db_update": "v14.0", "need_refresh": true }` 給前端。前台若是使用 WASM (`sql.js`) 的連線，就會重新 fetch 這顆新 DB 的 binary 到 IndexedDB。
