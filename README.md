# TW Stock App - 台灣股票分析平台

> 🚀 基於 Astro 5 + better-sqlite3 的高性能本地優先台股分析終端機

🔗 **Live Demo:** [https://benitorhuang-svg.github.io/tw-stock-app/](https://benitorhuang-svg.github.io/tw-stock-app/)

[![Deploy PWA](https://github.com/benitorhuang-svg/tw-stock-app/actions/workflows/deploy-pwa.yml/badge.svg)](https://github.com/benitorhuang-svg/tw-stock-app/actions/workflows/deploy-pwa.yml)
[![Auto Update Data](https://github.com/benitorhuang-svg/tw-stock-app/actions/workflows/update-data.yml/badge.svg)](https://github.com/benitorhuang-svg/tw-stock-app/actions/workflows/update-data.yml)

---

## 📱 頁面導覽

| 頁面              | 網址               | 說明                                                  |
| ----------------- | ------------------ | ----------------------------------------------------- |
| 🏠 首頁 Dashboard | `/`                | 市場概況 HUD、漲跌排行、成交量領先、即時 SSE 同步     |
| 📊 股票總覽       | `/stocks`          | 搜尋篩選、排序、個股入口                              |
| 📈 個股分析       | `/stocks/[symbol]` | K 線圖、技術指標、基本面、法人籌碼、AI 報告（6 分頁） |
| 🎯 智慧選股       | `/screener`        | 策略預設 + 自訂篩選 + 即時回測熱力圖                  |
| 📡 即時盯盤       | `/live`            | TWSE SSE 即時行情、閃爍報價、篩選面板                 |
| 🏛️ 法人追蹤       | `/institutional`   | 三大法人連買/連賣天數排行、累積動能                   |
| ⭐ 自選股         | `/watchlist`       | 個人追蹤清單 + localStorage 持久化                    |
| 🗄️ 數據觀測       | `/database`        | SQLite 資料庫直接查詢、表格瀏覽、SQL 終端機           |

---

## 🏗️ 技術架構

```
Astro 5 (SSR / Node Adapter)
├── Frontend: Astro Components + TypeScript
├── Styling:  Tailwind CSS v4
├── Database: better-sqlite3 (Server) / sql.js WASM (Client)
├── API:      Astro API Routes + SSE (Server-Sent Events)
├── PWA:      Service Worker + Web App Manifest
└── CI/CD:    GitHub Actions (Auto Data Update + PWA Build)
```

---

## 📁 專案結構

```
tw-stock-app/
├── public/
│   ├── data/               # 股價 JSON / 籌碼 / 財報快照
│   ├── icons/              # PWA 圖示 (72~512px)
│   ├── manifest.json       # PWA Web App Manifest
│   ├── sw.js               # Service Worker (Network-First + Cache-First)
│   └── favicon.svg
├── src/
│   ├── pages/              # 8 頁面 + 17 API 端點
│   │   └── api/            # REST + SSE 端點
│   ├── components/
│   │   ├── atoms/          # 11 原子元件 (按鈕、標籤、輸入)
│   │   ├── molecules/      # 59 分子元件 (圖表、卡片、面板)
│   │   └── organisms/      # 27 有機元件 (完整功能區塊)
│   ├── scripts/            # 13 客戶端引擎
│   ├── lib/                # 48 工具模組 + 測試
│   ├── data/               # 6 資料模組
│   ├── types/              # 集中式型別定義
│   ├── utils/              # 格式化、技術指標
│   ├── layouts/            # MainTerminal + BaseHead
│   └── styles/             # global.css
├── scripts/                # 22 資料抓取 / ETL / 工具腳本
├── .github/workflows/      # CI/CD (資料更新 + PWA 建置)
└── package.json
```

---

## 🔌 客戶端引擎 (Decoupled Engines)

| 引擎                  | 檔案                       | 負責頁面                                     |
| --------------------- | -------------------------- | -------------------------------------------- |
| Global Engine         | `global-engine.ts`         | 全域 — 主題切換、PWA 註冊、效能模式、Glow FX |
| Dashboard Engine      | `dashboard-engine.ts`      | `/` — SSE 即時同步、HUD 更新                 |
| Database Engine       | `database-engine.ts`       | `/database` — SQL 查詢、表格渲染             |
| Live Engine           | `live-engine.ts`           | `/live` — 即時行情、閃爍、篩選               |
| Live Filter Engine    | `live-filter-engine.ts`    | `/live` — 篩選面板邏輯                       |
| Screener Engine       | `screener-engine.ts`       | `/screener` — 策略篩選 + 滑桿                |
| Stock Screener Engine | `stock-screener-engine.ts` | `/screener` — 結果表格 + CSV 匯出 + SSE      |
| Institutional Engine  | `institutional-engine.ts`  | `/institutional` — 法人連買排行              |
| Refresh Engine        | `refresh-engine.ts`        | 全域 — 資料庫重新整理終端機                  |
| Watchlist Engine      | `watchlist-engine.ts`      | `/watchlist` — 自選股管理                    |
| Stocks Index Engine   | `stocks-index-engine.ts`   | `/stocks` — 股票列表搜尋排序                 |
| Stocks Symbol Engine  | `stocks-symbol-engine.ts`  | `/stocks/[symbol]` — 分頁切換                |
| Cyber Calendar Engine | `cyber-calendar-engine.ts` | 月曆日期選擇器                               |

---

## 📊 個股分析 — 6 分頁

| 分頁        | 元件                | 功能                                          |
| ----------- | ------------------- | --------------------------------------------- |
| 📈 技術面   | `TabTechnical`      | K 線圖 + MA5/10/20/60 + 布林通道 + RSI + MACD |
| 📊 基本面   | `TabFundamentals`   | 估值河流圖 + 營收動能 + 財務體檢雷達          |
| 🏛️ 籌碼面   | `TabChips`          | 三大法人 + 融資融券 + 大戶持股                |
| 🤖 AI 報告  | `TabAlerts`         | 情緒指數儀表 + AI 分析報告 + 策略建議         |
| 📊 總覽     | `TabOverview`       | 核心指標矩陣 + 快速洞察                       |
| 📈 技術線圖 | `StockChartSection` | 完整互動式圖表區                              |

---

## 🔧 資料管線

### 自動化 (GitHub Actions)

| 工作流程          | 排程                  | 說明                                     |
| ----------------- | --------------------- | ---------------------------------------- |
| `update-data.yml` | 週一～五 16:30 (台北) | 抓取最新股價 / 籌碼 / 財報 → 建置 SQLite |
| `deploy-pwa.yml`  | Push to main          | 生成 PWA 圖示 → 建置 Astro → 上傳產物    |

### 手動腳本

```bash
npm run fetch:list         # 抓取股票清單
npm run fetch:revenue      # 抓取月營收
npm run fetch:stats        # 抓取月統計
npm run fetch:financials   # 抓取季報
npm run fetch:chips        # 抓取籌碼
npm run fetch:all          # 以上全部執行
npm run build-db           # ETL → 建置 SQLite 資料庫
npm run refresh-db         # fetch:all + build-db 一鍵完成
```

---

## 📲 PWA 功能

- ✅ **可安裝** — 桌面 / 手機均可安裝為獨立 App
- ✅ **Service Worker** — Network-First (HTML) + Cache-First (靜態資源)
- ✅ **離線支援** — 快取已瀏覽頁面與資料
- ✅ **自動更新** — 偵測新版本並提示更新
- ✅ **Apple 支援** — apple-touch-icon + meta tags
- ✅ **圖示生成** — `scripts/generate-pwa-icons.mjs` 自動生成 8 種尺寸

---

## 📦 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 下載/生成數據 (首次)
npm run fetch:all
npm run build-db

# 3. 生成 PWA 圖示
node scripts/generate-pwa-icons.mjs

# 4. 開發模式
npm run dev          # → http://localhost:3000

# 5. 建置
npm run build

# 6. 測試
npm test
npm run test:coverage
```

> ⚠️ **注意**：`public/data/` 中的 JSON 資料檔較大，首次 clone 後需執行資料抓取步驟。

---

## 🧪 技術分析指標

| 指標   | 模組                         | 說明                 |
| ------ | ---------------------------- | -------------------- |
| MA     | `utils/technical-indicators` | SMA 5/10/20/60 均線  |
| RSI    | `utils/technical-indicators` | 14 日相對強弱指標    |
| MACD   | `utils/technical-indicators` | 趨勢動能 (12, 26, 9) |
| KD     | `utils/technical-indicators` | 隨機指標             |
| BBands | `utils/technical-indicators` | 布林通道 (20, 2σ)    |

---

## ✨ UX 特色

| 功能                    | 說明                                       |
| ----------------------- | ------------------------------------------ |
| **Quantum Terminal UI** | 深色科技風介面、透明玻璃卡片、霓虹光暈效果 |
| **Interactive Glow**    | 滑鼠追蹤光暈 `.glow-interactive`           |
| **Skeleton Loading**    | 載入中骨架動畫                             |
| **Toast 通知**          | 全域通知系統                               |
| **主題切換**            | 深色 / 淺色模式                            |
| **效能模式**            | 自動偵測低效能裝置、減少動畫               |
| **SSE 即時更新**        | Server-Sent Events 推播行情                |
| **響應式設計**          | 桌面 + 手機 + 平板自適應                   |
| **Atomic Design**       | 原子 → 分子 → 有機體元件架構               |

---

## 📤 匯出功能

| 功能      | 說明                             |
| --------- | -------------------------------- |
| CSV 匯出  | 選股結果一鍵匯出 CSV (UTF-8 BOM) |
| JSON 備份 | 自選股 / 策略完整備份            |
| 離線 HTML | 一鍵匯出完整離線 HTML 報告       |

---

## ♿ 無障礙

- Skip Link (跳到主要內容)
- ARIA 標籤與角色
- 焦點管理 + 鍵盤導航
- 高對比色彩設計
- `prefers-reduced-motion` 支援

---

## 📄 授權

MIT License

---

_最後更新：2026-02-25_
