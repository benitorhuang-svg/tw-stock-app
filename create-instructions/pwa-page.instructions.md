---
description: 'Use when creating, modifying, or debugging PWA pages in the TW-stock Quantum Terminal. Covers Astro 5 page creation, Atomic Design component hierarchy, Quantum Terminal visual tokens, SQLite data integration, Service Worker caching, responsive layout, and client-side engine scripting.'
applyTo: 'src/pages/**,src/components/**,src/layouts/**,src/scripts/**,public/sw.js,public/manifest.json'
---

# TW Stock PWA Page 建構指引 (PWA Page Creation Instructions)

> 本指引萃取自 `.specify/` 規格庫，作為建立新 PWA 頁面時的完整開發準則。

---

## 一、專案架構概覽

### 技術棧

| 類別         | 技術               | 版本     |
| ------------ | ------------------ | -------- |
| Framework    | Astro              | ^5.16.15 |
| SSR Adapter  | @astrojs/node      | ^9.5.2   |
| UI Framework | Svelte 5           | ^5.53.3  |
| Styling      | TailwindCSS v4     | ^4.2.0   |
| Client DB    | sql.js (WASM)      | ^1.13.0  |
| Server DB    | better-sqlite3     | ^12.6.2  |
| Charts       | ChartGPU           | ^0.1.6   |
| PWA          | @vite-pwa/astro    | ^1.2.0   |
| Testing      | Vitest + happy-dom | ^4.0.18  |
| Build Target | ES2022             | —        |

### 五層模組架構

```
M1: 資料採集層 → scripts/, public/data/
M2: 特徵工程與分析引擎 → src/lib/ (risk-engine, ai-distiller)
M3: 選股濾鏡與查詢引擎 → src/lib/ (query-builder, strategies)
M4: 監控推播與警示 → src/lib/ (alert-emitter), src/api/sse/
M5: UI 版面與動線 → src/pages/, src/components/, src/layouts/, src/scripts/
```

### SSR/SSG 雙模建置

- `STATIC_BUILD=true` → 靜態輸出到 GitHub Pages (`/tw-stock-app` base path)
- 預設 → SSR 模式 (`@astrojs/node` adapter, `output: 'server'`)
- API routes (`src/pages/api/`) 僅在 SSR 模式可用

---

## 二、頁面建立規範

### 目錄結構

```
src/
├── pages/                    # 路由頁面 (8 個)
│   ├── index.astro           # / → Dashboard
│   ├── screener.astro        # /screener → 選股器
│   ├── live.astro            # /live → 即時監控
│   ├── database.astro        # /database → 數據探索器
│   ├── institutional.astro   # /institutional → 法人籌碼
│   ├── watchlist.astro       # /watchlist → 自選股
│   └── stocks/
│       ├── index.astro       # /stocks → 搜尋引擎
│       └── [symbol].astro    # /stocks/:id → 個股5分頁
├── layouts/
│   ├── MainTerminal.astro    # 全站主佈局 (Sidebar + Topbar + Workspace)
│   └── BaseHead.astro        # <head> 區塊 (PWA, 字體, SEO meta)
├── components/
│   ├── atoms/                # 11 個最小不可分割元素
│   ├── molecules/            # 59 個 Atoms 功能組合
│   └── organisms/            # 27 個複雜業務區塊
├── scripts/                  # 13 個客戶端引擎
├── lib/                      # 核心業務邏輯
├── styles/                   # 全域樣式 (terminal.css)
└── utils/                    # 通用輔助工具
```

### 新頁面標準模板

```astro
---
// src/pages/[new-page].astro
import MainTerminal from '../layouts/MainTerminal.astro';
import PageHero from '../components/molecules/PageHero.astro';
// 按需引入其他 Organisms / Molecules

// SSR 資料取得 (Server-side)
const data = await fetchDataFromSqlite();
---

<MainTerminal title="頁面標題" description="SEO 描述">
    <PageHero title="頁面標題" subtitle="副標題" />

    <!-- 頁面主體 -->
    <div class="grid grid-cols-12 gap-6 p-4 h-[calc(100dvh-72px)] overflow-hidden">
        <!-- 使用 Atomic Design 元件組合 -->
    </div>
</MainTerminal>

<script src="../scripts/[new-page]-engine.ts"></script>
```

### 每個新頁面必須

1. 使用 `MainTerminal.astro` 作為 Layout wrapper
2. 建立對應的 `src/scripts/[page]-engine.ts` 客戶端引擎
3. 實作 Skeleton 載入狀態 (Zero CLS)
4. 所有資料映射使用可選鏈 (`?.`) 與 Default Fallback
5. 確保 `100dvh` 固定視窗，無全頁捲動

---

## 三、Quantum Terminal 視覺設計系統

### 核心色彩 (HSL System)

```css
/* 基底 */
--color-base: hsl(240, 10%, 4%); /* 全站背景 */
--color-surface: hsl(240, 6%, 10%); /* 卡片/面板 */

/* 語意色 */
--color-accent: hsl(217, 91%, 60%); /* 主動作/掃描線 */
--color-bullish: hsl(142, 71%, 45%); /* 上漲/正面 */
--color-bearish: hsl(346, 77%, 50%); /* 下跌/警告 */

/* 邊界 */
--color-border: hsla(0, 0%, 100%, 0.05); /* 玻璃邊界 */
```

**嚴禁使用飽和度過高的純色。**

### 玻璃層次 (Glass Elevation)

```
Layer 0 (Void):     純黑底層 + 微弱雜訊質感
Layer 1 (Frosted):  backdrop-blur-3xl bg-white/[0.03] border-white/5
Layer 2 (Elevated): shadow-[0_0_40px_rgba(0,0,0,0.5)] border-white/10
Hover Shine:        半徑 100px 的 radial-gradient 背光 (非邊界變色)
```

### 字體規範

```
UI/Headings:  Inter, system-ui (Non-blocking preload)
Numbers:      JetBrains Mono (嚴格對齊數值)
Labels:       uppercase tracking-[0.15em] font-black text-[10px]
```

### 動畫曲線

全站統一 `cubic-bezier(0.16, 1, 0.3, 1)` (Expo-Out)，使用 View Transitions 或 Framer Motion。

---

## 四、Atomic Design 元件階層

### 組合規則

```
Atoms (最小單元) → 不含業務邏輯
  ↓ 組合成
Molecules (功能單元) → 封裝單一可重用邏輯
  ↓ 組合成
Organisms (業務區塊) → 多 Molecules 組合的複雜功能
  ↓ 放入
Templates/Layouts → 固定佈局骨架
  ↓ 注入資料
Pages → 最終呈現
```

### 現有元件清單 (總數 97)

- **Atoms** (11): Badge, CyberButton, ErrorBoundary, FAQItem, NavTab, PageLimitSelect, RegistryItem, SearchInput, Skeleton, StrategyIcon, SyncHourglass
- **Molecules** (59): StatCard, StockCard, MarketBreadth, MoverRow, IntradayChart, OrderBook, PriceLabels, IndicatorMacd, IndicatorRsi, ValuationRiverChart, 等
- **Organisms** (27): StockScreener, DatabaseExplorer, TabBar, CyberCalendar, MoversMatrix, LiveDataTable, StrategicHUD, 等
- **Layouts** (2): MainTerminal, BaseHead
- **Pages** (8): index, screener, live, database, institutional, watchlist, stocks/index, stocks/[symbol]

### 新增元件命名規範

| 項目            | 規範                 | 範例               |
| --------------- | -------------------- | ------------------ |
| Astro 元件      | PascalCase           | `StockCard.astro`  |
| TypeScript 檔案 | kebab-case           | `stock-service.ts` |
| 測試檔案        | `{filename}.test.ts` | `analysis.test.ts` |
| 變數/函式       | camelCase            | `getTopGainers()`  |
| 類型/介面       | PascalCase           | `StockFullData`    |
| 常數            | UPPER_SNAKE_CASE     | `MAX_RETRY`        |

---

## 五、資料存取層 (SQLite Local-First)

### 雙引擎架構

```typescript
// sqlite-service.ts 自動判斷環境
if (typeof window === 'undefined') {
    // Server: better-sqlite3 (同步, <10ms)
} else {
    // Client: sql.js WASM + IndexedDB (非同步, <50ms)
}
```

### 資料庫 Schema (核心表)

```sql
stocks            — symbol, name, market (字典表)
tech_features     — OHLCV + MA/MACD/KD/RSI (技術面)
chip_features     — 三大法人淨買超 + 融資券 (籌碼面)
valuation_features — PE/PB/殖利率 + 營收/毛利率 (基本面)
ai_reports        — AI 生成報告快取 (date-keyed)
```

### SQLite 效能調校

```sql
PRAGMA journal_mode = WAL;
PRAGMA mmap_size = 3221225472;    -- 3GB mmap
PRAGMA temp_store = MEMORY;
PRAGMA synchronous = OFF;
```

- 使用 Prepared Statement Cache
- 建立複合索引支撐 O(1) 查詢
- Server 端 `readonly: true` 防止意外寫入

### 頁面資料取得模式

```astro
---
// SSR: 直接從 better-sqlite3 讀取
import { getDb } from '../utils/db';
const db = getDb();
const stocks = db.prepare('SELECT * FROM stocks LIMIT 100').all();
---

<!-- 將資料傳入元件 -->
<StockCard data={stocks[0]} />

<!-- Client-side: sql.js 透過 engine script 處理 -->
<script src="../scripts/page-engine.ts"></script>
```

---

## 六、PWA 配置

### manifest.json 核心設定

```json
{
    "name": "TW Stock App",
    "short_name": "TW Stock",
    "display": "standalone",
    "background_color": "#0f0f1a",
    "theme_color": "#00d4aa",
    "orientation": "portrait-primary",
    "lang": "zh-TW",
    "categories": ["finance", "utilities"],
    "start_url": "./",
    "scope": "."
}
```

### Service Worker v4 分層快取策略

| 資源類型                | 策略                   | 說明                 |
| ----------------------- | ---------------------- | -------------------- |
| HTML/Navigation         | Network-First          | 防止過期 UI          |
| 靜態資源 (JS/CSS/fonts) | Cache-First            | 版本化 hash 保鮮     |
| 資料 JSON/DB            | Stale-While-Revalidate | 先顯示快取再背景更新 |
| API GET                 | Network-First          | 短 TTL               |
| SSE 端點                | Skip (不快取)          | 即時串流             |

### @vite-pwa/astro 整合

```javascript
// astro.config.mjs
AstroPWA({
    registerType: 'autoUpdate',
    workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,db,wasm}'],
        maximumFileSizeToCacheInBytes: 300000000, // 300MB (含 SQLite DB)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
            {
                urlPattern: /\/data\/.*\.(json|db|csv)/i,
                handler: 'StaleWhileRevalidate',
                options: {
                    cacheName: 'stock-data-cache',
                    expiration: { maxEntries: 50, maxAgeSeconds: 604800 },
                },
            },
        ],
    },
});
```

### 離線支援要點

- Client DB 優先存取順序: IndexedDB 快取 → Server API → LocalStorage 備份 → 內嵌靜態資料
- 每 30 秒自動備份 sql.js DB 到 IndexedDB
- `beforeunload` 緊急備份到 localStorage
- 每個非同步組件必須有精確高度的 Skeleton (Zero CLS)

---

## 七、客戶端引擎 (Engine Scripts)

### 引擎分離原則

每個頁面由獨立的 Engine Script 驅動互動，UI 與業務邏輯徹底分離：

| 引擎                       | 對應頁面      | 核心職責                         |
| -------------------------- | ------------- | -------------------------------- |
| `global-engine.ts`         | 全站          | 主題切換、PWA 註冊、效能模式偵測 |
| `dashboard-engine.ts`      | `/`           | SSE 同步 HUD、歷史數據切換       |
| `live-engine.ts`           | `/live`       | 15s 輪詢、即時表格渲染、DOM Diff |
| `database-engine.ts`       | `/database`   | 表格載入、搜尋、分頁             |
| `stock-screener-engine.ts` | `/screener`   | 篩選 API 呼叫                    |
| `stocks-symbol-engine.ts`  | `/stocks/:id` | Tab 切換、圖表初始化             |

### 新引擎建立範本

```typescript
// src/scripts/[page]-engine.ts
document.addEventListener('astro:page-load', () => {
    // 1. DOM 查詢與事件綁定
    const container = document.querySelector('[data-page="xxx"]');
    if (!container) return;

    // 2. 初始化資料載入 (含 Skeleton → 實際內容)
    initData();

    // 3. 綁定互動事件
    bindEvents();

    // 4. 清理函式 (防止 SPA 導覽事件堆疊)
    return () => {
        /* cleanup listeners */
    };
});
```

---

## 八、響應式設計 (Mobile-First)

### 中斷點

| 級別            | 寬度        | 佈局策略                               |
| --------------- | ----------- | -------------------------------------- |
| Mobile          | < 768px     | 單欄垂直、隱藏 Sparklines、`p-4 gap-4` |
| Tablet (md)     | 768-1024px  | 雙欄 Grid 2、顯示部分指標              |
| Desktop (lg)    | 1024-1280px | 側邊導航列、完整資料表                 |
| UltraWide (xl+) | > 1280px    | 三欄式 (Nav + Main + Detail)           |

### 佈局規範

```css
/* Viewport */
height: 100dvh; /* 防止手機網址列跳動 */
overflow: hidden; /* 固定佈局, 局部滾動 */

/* Sidebar */
width: 260px; /* 桌面端 */
display: none; /* 手機端隱藏, 改為底部導航 */

/* Workspace Grid */
gap: 1.5rem; /* gap-6 呼吸空間 */

/* 觸控間距 */
padding: 1rem; /* Mobile: p-4 */
padding: 0.75rem; /* Desktop: p-3 (Terminal-Density) */
```

---

## 九、效能標準

### 核心指標

- **LCP** < 0.8s
- **FPS** 穩定 60 (WebGL Layer)
- **Zero CLS**: 所有非同步元件有精確高度 Skeleton
- **Fail-Safe UI**: 禁止出現 `undefined` 字樣

### 建置最佳化

```javascript
// Vite chunk splitting
manualChunks(id) {
  if (id.includes('sql.js'))              return 'vendor-sqljs';
  if (id.includes('chartgpu'))            return 'vendor-chart';
  if (id.includes('technicalindicators')) return 'vendor-indicators';
  if (id.includes('node_modules'))        return 'vendor';
}
```

- ES2022 target
- CSS code splitting
- 非阻塞字體 preload (`<link rel="preload" as="style">` + script-based 升級)
- API Cache-Control: 30s POST / 60s GET screener

---

## 十、即時資料與 SSE

### 即時報價推送

```
Server (cron 5s 輪詢 TWSE API)
  → In-Memory Map<Symbol, CurrentTick>
  → SSE /api/sse/live
  → Client EventSource 訂閱
```

### 斷線處理

- Server 超過 1 分鐘無報價 → 送出 `{"status": "OFFLINE"}`
- 前端顯示 Offline 徽章、停止動畫更新
- EventSource 內建自動重連

### Toast 推播

- Z-Index 50 最高層級
- 右上角滑入 (`slide-in-right`) + 玻璃擬態 (`backdrop-blur-md`)
- 語意色: 綠 (達標) / 紅 (停損) / 藍 (系統通知)
- 支援瀏覽器原生 `Notification API` 推播

---

## 十一、測試規範

### 測試環境

- Vitest v4 + happy-dom
- 新功能先寫失敗測試 (Red → Green → Refactor)
- `lib/` 覆蓋率目標 ≥ 80%
- 測試命名: `{filename}.test.ts`

### 執行

```bash
npm test              # 執行測試
npm run test:coverage # 覆蓋率報告
```

---

## 十二、安全規範

### SQL 注入防禦

- **絕對禁止**字串拼接 SQL: `WHERE ${field} > ${value}`
- 強制使用 Prepared Statement `?` 佔位符
- 所有 `field` / `domain` 必須通過 Zod Schema 白名單驗證
- 無效欄位 → `400 Invalid Field` 拒絕執行

### API 邊界

- Server 端 DB 以 `readonly: true` 開啟
- SSE 端點不經過 Service Worker 快取
- Client 端操作限於 IndexedDB 與 sql.js

---

## 十三、部署流程

### GitHub Pages (靜態)

```bash
STATIC_BUILD=true npm run build
# 產出: dist/client/
# CI: .github/workflows/deploy-pwa.yml
```

### SSR 模式 (本地/生產)

```bash
npm run build
node dist/server/entry.mjs
# Port: 3000
```

### 數據刷新

```bash
npm run fetch:all    # 抓取所有外部資料
npm run build-db     # 重建 SQLite DB
npm run refresh-db   # fetch + build 一鍵完成
```

---

## 十四、開發 Checklist

建立新 PWA 頁面時，依序確認：

- [ ] 頁面使用 `MainTerminal.astro` 佈局
- [ ] 建立對應 `src/scripts/[page]-engine.ts`
- [ ] 元件遵循 Atomic Design 階層 (Atom → Molecule → Organism)
- [ ] 遵循 Quantum Terminal 視覺 Tokens (HSL Palette + Glass Elevation)
- [ ] 實作 Skeleton 載入狀態 (所有非同步區塊)
- [ ] 資料取得使用 `sqlite-service.ts` 統一界面
- [ ] SQL 查詢使用 Prepared Statement (防注入)
- [ ] 響應式: Mobile-First (`100dvh`, Grid breakpoints)
- [ ] 效能: LCP < 0.8s, Zero CLS, Fail-Safe UI
- [ ] 測試: 核心邏輯有對應 `.test.ts`
- [ ] PWA: manifest.json 含新頁面 shortcuts (如需要)
- [ ] 規格: 頁面功能已登記於 `.specify/specs/` 中 (規格至上原則)
