# 002 — 警示觸發與推播中樞 (Alert Emitter Core)

> 若 M4 的 第一部分 (`001-realtime-engine`) 負責「取得資料」，那本文件 (`002-alert-emitter`) 就負責**「發布消息 (Event Emitter)」**。這是一個橫跨 Node.js 後端到瀏覽器前端 Toast 組件的神經傳導系統。

## 1. 架構：事件發報機制 (`src/lib/alert-emitter.ts`)

我們不再把 `if(price > limit) alert()` 寫死在 React/Astro 組件中。所有的警示邏輯都應該註冊在統一的 Event Bus 上。

### 1.1 資料訂閱者模型 (Pub/Sub)
- **Publisher (發布者)**：
  來自 `001-realtime-engine` 的 SSE (Server-Sent Events) 串流。它負責無差別推送全市場最新的 `Tick`。
- **Subscriber (訂閱者 / 條件開關)**：
  這就是由使用者在 M5 UI 介面（或 AI 推薦面板）中建立的「觸發規則 (Trigger Rules)」。存放於 LocalStorage 或使用者的專屬 SQLite 表格 `user_alerts` 裡。

### 1.2 規則評估器 (Rule Evaluator)
在 Client-side 存在一顆輕量級的 Worker 執行緒。每當收到一筆新的 `Tick` 報價：
```typescript
interface AlertRule {
  id: string;
  symbol: string;
  field: 'price' | 'volume' | 'change_pct';
  condition: '<' | '>' | 'CROSSES';
  threshold: number;
}

// Tick 進來時的攔截點：
function evaluateTick(tick: TickData, rules: AlertRule[]) {
  const activeRules = rules.filter(r => r.symbol === tick.symbol);
  activeRules.forEach(rule => {
      if (rule.field === 'price' && rule.condition === '>' && tick.price > rule.threshold) {
          triggerToast(rule, tick);
          disableRule(rule.id); // 觸發後預設關閉，防止洗版
      }
  });
}
```

## 2. 視覺推播層 (Toast System Integration)

當 `triggerToast` 被呼叫時，它必須呼叫統一定義的 UI 推播元件。這個元件**必須具備 Z-Index 50 (最高層級)**。

### 2.1 高端視覺回饋 (Premium Notifications)
我們拋棄瀏覽器原生的 `alert()` 或粗糙的彈窗。
- **Component**: `CustomToast.tsx`
- **動畫**: 從螢幕右上角滑入 (`slide-in-right`)，並伴隨著玻璃擬態的背景模糊 (`backdrop-blur-md`)。
- **語意色彩**:
  - `目標達成 (Take Profit)`: 發光綠色邊框加上鈴鐺圖示。
  - `停損觸發 (Stop Loss)`: 發光紅色邊框加上警告圖示。
  - `系統通知 (System)`: 藍色柔光邊框（如：資料庫已更新完畢）。

### 2.2 作業系統原生推播 (Web Push API)
對於真正的交易者，即使將瀏覽器最小化，也希望收到通知。
本系統必須向瀏覽器請求 `Notification.requestPermission()` 授權。
一旦授權通過，Toast 觸發的同時，會呼叫 `new Notification(title, options)`，讓警示在 Windows/Mac 原生的右下角通知中心彈出。

## 3. 持久化與同步 (Persistence)
如果使用者清除了瀏覽器 LocalStorage，他好不容易設定的 20 條警示條件將會消失。
- **解決方案**：如果是單機版本，`user_alerts` 條件必須被寫入 Client 端的那顆 `sql.js / IndexedDB` 中。這能保證重整頁面甚至重開瀏覽器後，守護進程一啟動就能重新掛載所有的訂閱器 (Subscribers)。
