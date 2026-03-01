---
name: alert_notification
description: 台股即時警示與推播通知模型，定義觸發條件格式、通知管道、去重規則與 SSE/Web Worker 整合架構。
---

# 警示與推播通知模型 (Alert & Notification Model)

量化系統不能只產出報告，必須在「該行動的當下」即時通知使用者。本模型定義條件觸發、通知推送與抑制重複的完整架構。

---

## 系統架構 (Architecture)

```
┌────────────────────────────┐
│  資料來源                   │
│  • /api/sse/stream (盤中)  │
│  • ETL 盤後計算 (盤後)      │
└──────────┬─────────────────┘
           │ 即時資料 / 盤後快照
           ▼
┌────────────────────────────┐
│  Web Worker (Alert Engine)  │ ← 在瀏覽器背景執行
│  • 載入 user_alerts 條件    │
│  • 逐筆比對 SSE tick        │
│  • 產出 matched_alerts      │
└──────────┬─────────────────┘
           │ AlertEvent
           ▼
┌────────────────────────────┐
│  zustand store (前端狀態)   │
│  • alert_queue: Alert[]    │
│  • dedup_map: Set<string>  │
│  • snooze_list: string[]   │
└──────────┬─────────────────┘
           │
           ▼
┌────────────────────────────┐
│  通知管道                   │
│  • Browser Notification    │
│  • UI Toast (in-app)       │
│  • 音效提示 (optional)     │
└────────────────────────────┘
```

---

## 資料庫 / 狀態對照表 (Data Mapping)

| 模型需求 | 資料來源 | 說明 |
|----------|---------|------|
| 即時報價 | `GET /api/sse/stream` (SSE) | 盤中 Tick 推送: `lastPrice`, `volume`, `change_pct` |
| 盤後快照 | `latest_prices` | 每日收盤後的最新行情 + 技術指標 + 法人 |
| 技術指標 | `daily_indicators` | MA/RSI/MACD/KD — 盤後觸發條件 |
| 法人籌碼 | `chips`, `institutional_snapshot` | 三大法人買賣超 |
| 大盤環境 | `market_breadth_history` | 市場寬度燈號變化 |
| 使用者自訂條件 | `user_alerts` (Client-side Memory) | localStorage 或 IndexedDB 儲存 |

> **注意**：`user_alerts` 不存在伺服器端 DB，完全在瀏覽器本地管理，保證隱私。

---

## 1. 警示條件格式 (Alert Condition Schema)

### 1A. 條件結構定義

```typescript
interface UserAlert {
  id: string;                     // UUID
  name: string;                   // 使用者自訂名稱
  enabled: boolean;               // 是否啟用
  createdAt: string;              // ISO 8601
  
  // 觸發條件
  conditions: AlertCondition[];   // AND 邏輯 (所有條件都滿足才觸發)
  
  // 通知設定
  notification: {
    channels: ('browser' | 'toast' | 'sound')[];
    cooldownMinutes: number;      // 觸發後多少分鐘內不重複通知 (預設 30)
    maxPerDay: number;            // 每日最多通知次數 (預設 5)
  };
}

interface AlertCondition {
  field: string;                  // 要監控的欄位
  operator: '>' | '<' | '>=' | '<=' | '==' | 'cross_above' | 'cross_below';
  value: number | string;         // 門檻值
  symbol?: string;                // 指定個股 (空 = 全市場掃描)
}
```

### 1B. 預設警示模板 (Built-in Templates)

| 模板名稱 | 條件 | 觸發場景 | 關聯模型 |
|----------|------|---------|---------|
| 外資大買 | `foreign_inv > 1000` | 外資單日買超 > 1000 張 | institutional_forensic |
| 突破月線 | `close cross_above ma20` | 收盤突破 20 日均線 | technical_analysis |
| RSI 過熱 | `rsi14 > 80` | RSI 進入超買區 | technical_analysis |
| 市場翻紅燈 | `ma60_breadth < 30` | 大盤環境轉空頭 | market_breadth_analysis |
| 市場超賣藍燈 | `ma20_breadth < 10` | 極度超賣，可能抄底 | market_breadth_analysis |
| 融券暴增 | `short_net > 500` | 融券單日增加 > 500 張 | institutional_forensic |
| 漲停通知 | `change_pct >= 9.5` | 接近或觸及漲停 | day_trading_momentum |
| 停損觸發 | `close < stop_loss_price` | 持股跌破停損線 | risk_management |
| ATR 波動暴增 | `atr14 > atr14_20d_avg * 2` | 波動率急劇放大 | risk_management |

---

## 2. 盤中即時引擎 (Intraday Real-Time Engine)

### 2A. SSE 訂閱與 Web Worker 整合

```typescript
// Main Thread: 啟動 Web Worker
const alertWorker = new Worker('/scripts/alert-worker.js');

// 載入使用者條件
const userAlerts = JSON.parse(localStorage.getItem('user_alerts') || '[]');
alertWorker.postMessage({ type: 'LOAD_ALERTS', alerts: userAlerts });

// 接收匹配結果
alertWorker.onmessage = (e) => {
  if (e.data.type === 'ALERT_TRIGGERED') {
    const alert = e.data.alert;
    showNotification(alert);
    addToAlertQueue(alert);
  }
};
```

### 2B. Web Worker 內部邏輯

```typescript
// alert-worker.js (Web Worker)
let alerts: UserAlert[] = [];
let lastTriggered: Map<string, number> = new Map(); // alertId → timestamp

// SSE 連線
const sse = new EventSource('/api/sse/stream');
sse.onmessage = (event) => {
  const tick = JSON.parse(event.data);
  
  for (const alert of alerts) {
    if (!alert.enabled) continue;
    
    // 冷卻時間檢查
    const lastTime = lastTriggered.get(alert.id) ?? 0;
    if (Date.now() - lastTime < alert.notification.cooldownMinutes * 60000) continue;
    
    // 條件比對
    const matched = alert.conditions.every(cond => {
      if (cond.symbol && cond.symbol !== tick.symbol) return false;
      return evaluateCondition(tick, cond);
    });
    
    if (matched) {
      lastTriggered.set(alert.id, Date.now());
      self.postMessage({
        type: 'ALERT_TRIGGERED',
        alert: { ...alert, triggeredAt: new Date().toISOString(), matchedSymbol: tick.symbol }
      });
    }
  }
};

self.onmessage = (e) => {
  if (e.data.type === 'LOAD_ALERTS') alerts = e.data.alerts;
};
```

---

## 3. 盤後批次掃描 (Post-Market Batch Scanner)

盤後 ETL 完成後，針對所有持股與觀察名單執行條件掃描：

```sql
-- 盤後觸發: 技術面突破
SELECT lp.symbol, st.name, lp.close, lp.ma20, lp.ma60, lp.rsi,
       lp.foreign_inv, lp.invest_trust
FROM latest_prices lp
JOIN stocks st ON lp.symbol = st.symbol
WHERE (
  -- 突破月線
  (lp.close > lp.ma20 AND lp.close - lp.ma20 < lp.ma20 * 0.02)
  -- 或 RSI 進入強勢區
  OR lp.rsi BETWEEN 60 AND 65
  -- 或外資大買
  OR lp.foreign_inv > 1000
);

-- 盤後觸發: 大盤環境變化
SELECT date, ma20_breadth, ma60_breadth,
       CASE WHEN ma20_breadth < 10 THEN '🔵 BLUE (極度超賣)'
            WHEN ma60_breadth < 30 THEN '🔴 RED (系統性空頭)'
            WHEN ma20_breadth > 85 THEN '🟡 YELLOW (過熱)'
            ELSE NULL
       END AS regime_alert
FROM market_breadth_history
WHERE date = (SELECT MAX(date) FROM market_breadth_history)
  AND (ma20_breadth < 10 OR ma60_breadth < 30 OR ma20_breadth > 85);
```

---

## 4. 去重與抑制規則 (Deduplication & Suppression)

| 規則 | 說明 | 實作 |
|------|------|------|
| **冷卻時間 (Cooldown)** | 同一條件觸發後 N 分鐘內不重複 | `lastTriggered` Map + timestamp 比對 |
| **每日上限 (Daily Cap)** | 每條警示每日最多觸發 N 次 | `dailyCount` Map，每日 00:00 重置 |
| **批次合併 (Batching)** | 同一時間多檔觸發相同條件 → 合併為 1 則 | `"外資大買: 2330, 2454, 3034 等 5 檔"` |
| **暫停 (Snooze)** | 使用者可暫停特定警示 | `snooze_list` in zustand store |
| **市場休市** | 非交易時段 (盤後/假日) 不觸發盤中條件 | 檢查時間 09:00~13:30 |

### 去重鍵生成

```typescript
// 使用 alertId + symbol + 日期 作為去重鍵
function deduplicationKey(alertId: string, symbol: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${alertId}:${symbol}:${today}`;
}
```

---

## 5. 通知管道 (Notification Channels)

### 5A. Browser Notification API

```typescript
async function showBrowserNotification(alert: TriggeredAlert) {
  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
  }
  
  new Notification(`📊 ${alert.name}`, {
    body: `${alert.matchedSymbol} 觸發條件: ${alert.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(', ')}`,
    icon: '/icons/icon-192x192.png',
    tag: deduplicationKey(alert.id, alert.matchedSymbol), // 防止重複通知
    requireInteraction: false,
  });
}
```

### 5B. In-App Toast

```typescript
// 透過 zustand store 推入 UI Toast 佇列
useAlertStore.getState().pushToast({
  id: crypto.randomUUID(),
  type: 'alert',
  title: alert.name,
  message: `${alert.matchedSymbol}: ${alert.conditions[0].field} ${alert.conditions[0].operator} ${alert.conditions[0].value}`,
  timestamp: Date.now(),
  severity: alert.conditions.some(c => c.field === 'ma60_breadth') ? 'critical' : 'info',
});
```

---

## 6. API 端點對照

| 功能 | API 路由 | 用途 |
|------|---------|------|
| 即時報價串流 | `GET /api/sse/stream` | 盤中即時 Tick → Web Worker 比對 |
| 最新行情 | `GET /api/market/latest` | 盤後批次掃描的資料來源 |
| 大盤寬度 | `GET /api/market/breadth-timeseries` | 環境燈號變化偵測 |
| 法人連買 | `GET /api/market/institutional-streak` | 法人行為警示 |

---

## 7. 與其他模型整合

| 來源模型 | 觸發條件類型 | 範例 |
|----------|-------------|------|
| `market_breadth_analysis` | 大盤燈號變化 | 🔴RED → 全面減碼警報 |
| `technical_analysis` | 突破/跌破均線、RSI 過熱 | 突破 MA20 + 量能放大 |
| `institutional_forensic` | 法人大買/大賣、券資比異常 | 外資連買 5 日 |
| `day_trading_momentum` | 盤中漲停、跳空缺口 | 開盤 Gap > 3% |
| `risk_management` | 停損/停利觸發 | 跌破 ATR trailing stop |
| `valuation_river` | 估值進入極端區 | PE 跌至 P10 以下 |
| `backtest_engine` | 回測信號即時觸發 | 策略條件在今日達標 |

---

## 8. 開發實作規範 (給 AI / 工程師的指示)

*   **隱私優先**：`user_alerts` 完全存於客戶端 (localStorage/IndexedDB)，伺服器不存不傳。
*   **PWA 整合**：Browser Notification 需在 PWA manifest 正確設定，搭配 Service Worker (`sw.js`) 處理離線通知。
*   **效能**：Web Worker 比對邏輯應在 < 1ms 完成單筆 Tick 處理；條件數 < 100 條時不應有效能瓶頸。
*   **可靠性**：SSE 斷線時 Web Worker 應自動重連 (exponential backoff)，並在重連後回補缺失資料。
*   **UI 呈現**：Alert Toast 應在畫面右上角堆疊，最多同時顯示 3 則，5 秒後自動消失。Critical 級別常駐直到使用者點擊。
