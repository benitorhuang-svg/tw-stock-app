# 008 — Market Heatmap Calendar (市場戳戳樂)

> 日期: 2026-02-24 | 原子化設計: CyberCalendar Atom + MarketBreadth Molecule

## 1. 功能定位

「市場熱力日曆 (Market Heatmap Calendar)」是首頁 Dashboard 的時間導航核心。透過日曆上每一天的顏色，使用者可以一眼辨識市場多空，並點選任何歷史日期來載入該日的完整市場快照。

## 2. 視覺規格：戳戳樂 (Poking Game) 風格

每個日期呈現為 3D 浮雕方塊，帶有 `border-b-4` 底部陰影模擬物理按鈕的點擊感。

### 2.1 顏色邏輯

| 狀態                   | 條件          | 背景色                 | 說明                     |
| ---------------------- | ------------- | ---------------------- | ------------------------ |
| **沒開市**             | 無 ratio 數據 | `bg-[#1e40af]/50` 藍色 | 週末或假日               |
| **有開市 (偏多/平盤)** | ratio ≥ 1.0   | `bg-[#ef4444]` 紅色    | 漲多跌少，或漲跌家數持平 |
| **有開市 (偏空)**      | ratio < 1.0   | `bg-[#22c55e]` 綠色    | 跌多漲少                 |

### 2.2 特殊狀態（疊加標示）

| 狀態                  | 樣式                 | 說明                         |
| --------------------- | -------------------- | ---------------------------- |
| **Selected (選取中)** | `ring-4 ring-white`  | 白色發光外框，保留背景熱力色 |
| **Today (今日)**      | `border-b-[#fbbf24]` | 底部琥珀色指示線             |

### 2.3 互動動效

- Hover: 縮放 110%, 上浮 -1.5px, 加重陰影
- 玻璃光澤: 每個方塊帶有 `from-white/10` 的斜向漸層覆蓋
- Ratio 提示: 滑鼠懸停時，右下角會以 `6px` 顯示該日 ratio 數值

## 3. 數據管線 (Data Pipeline)

### 3.1 月份 Ratio 載入

```
CyberCalendar (open)
  → fetch `/api/market/monthly-ratios?year=YYYY&month=M`
  → 回傳 { ratios: { [day]: ratio } }
  → 每個日期方塊即時著色
```

- **快取策略**: 以 `YYYY-MM` 為 key 的本地快取，避免重複請求
- **載入態**: 先顯示 35 個 `animate-pulse` 灰色骨架，API 回傳後替換

### 3.2 日期選擇 → 全頁面同步

```
使用者點選日期 (Day Click)
  → input.dispatchEvent('change')
  → index.astro 攔截
  → fetch `/api/market/history?date=YYYY-MM-DD`
  → 更新所有 Dashboard Widget
```

更新的內容包括：

| Widget         | 更新方式                                            |
| -------------- | --------------------------------------------------- |
| 成交量 (VOL)   | `#market-volume` textContent                        |
| 平均漲跌 (VEL) | `#market-change` textContent + class 顏色           |
| Breadth Bar    | `#breadth-bar-up/down/flat` width%                  |
| 漲跌家數       | `#breadth-up/down/flat` + `#breadth-range-up/down`  |
| RATIO 色塊     | `#breadth-ratio` + `#breadth-ratio-container` class |
| 跌幅排行       | `[data-panel="losers"]` innerHTML 重建              |
| 漲幅排行       | `[data-panel="gainers"]` innerHTML 重建             |
| 成交熱門       | `[data-panel="volume-leaders"]` innerHTML 重建      |

### 3.3 無資料處理 (404 Fallback)

當選取的日期無交易資料時（假日/未來日期）：

- 成交量顯示 `—`
- 平均漲跌顯示 `休市`
- Breadth Bar 歸零
- RATIO 顯示 `N/A` (灰色)
- 排行榜顯示 `暫無資料`

## 4. API 端點規格

### GET `/api/market/history?date=YYYY-MM-DD`

**Response (200)**:

```json
{
  "date": "2026-01-23",
  "summary": {
    "up": 620, "down": 300, "flat": 80,
    "total": 1000, "totalVolume": 5000000,
    "avgChange": 0.35, "ratio": 2.07
  },
  "gainers": [{ "symbol": "2330", "name": "台積電", "price": 850, "changePercent": 3.5, "volume": 50000 }],
  "losers": [...],
  "volumeLeaders": [...]
}
```

**Response (404)**: `{ "error": "No data found for this date.", "availableDates": [...] }`

### GET `/api/market/monthly-ratios?year=YYYY&month=M`

**Response (200)**:

```json
{
  "year": 2026, "month": 1,
  "ratios": { "2": 1.85, "3": 0.72, "5": 1.12, ... },
  "tradingDays": 22
}
```

## 5. 原子化設計 (Atomic Design) 架構

```
Atom:     CyberCalendar.astro       — 日期選擇器 + 熱力著色
Molecule: MarketBreadth.astro       — Breadth Bar + 左右錨點家數
Organism: Market Status Card        — VOL + VEL + Breadth + Ratio (index.astro 內)
Organism: MoversPanel.astro         — 漲跌幅排行列表
Organism: StockCard.astro           — 成交熱門卡片
Page:     index.astro               — 組合所有組件 + SSE/Temporal 腳本
```

## 6. 元件 Props 規劃

### `CyberCalendar.astro`

- Props: `id?: string, value?: string, class?: string`
- 事件: `change` (透過隱藏 input dispatch)

### `MarketBreadth.astro`

- Props: `up: number, down: number, flat: number, total: number, class?: string`
- 內部 IDs: `breadth-bar-up/down/flat`, `breadth-range-up/down`

## 7. 檔案清單

```
src/
├── components/
│   ├── atoms/
│   │   └── CyberCalendar.astro        # 市場熱力日曆原子
│   └── organisms/
│       ├── MarketBreadth.astro         # Breadth 進度條分子
│       ├── MoversPanel.astro           # 漲跌排行 Organism
│       └── StockCard.astro             # 成交量卡片 Organism
├── pages/
│   ├── index.astro                     # Dashboard 頁面（組合 + 腳本）
│   └── api/market/
│       ├── history.ts                  # 歷史日期市場快照 API
│       └── monthly-ratios.ts           # 月份 Ratio 查詢 API
└── lib/db/
    └── sqlite-service.ts              # SQLite 查詢封裝
```
