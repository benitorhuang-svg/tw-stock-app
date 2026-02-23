# 001 — Quantum Terminal Layout & Design System

> 本文件定義了「量子終端 (Quantum Terminal)」的視覺規範。我們追求的不是傳統網頁，而是一個具備極致光影、深邃層次感與高密度資訊吞吐能力的「指揮中心」。

## 一、宏觀佈局模型 (Macro Layout: The Command Center)

系統採用「固定佈局、局部滾動」的視窗模型，確保核心數據永遠處於使用者的第一視線。

- **Container**: `width: 100vw; height: 100dvh; overflow: hidden; background: hsl(240, 10%, 2%)`.
- **Sidebar (Nav)**: 寬度 `260px`（桌面端），側邊帶有極細的發光邊界 (`border-r border-white/5`)。
- **Workspace**: 採用網格系統，模組與模組之間保留 `gap-6` 的呼吸空間。
- **Mobile Adaptive**: 在手機端自動隱藏側邊欄，改為底部導航或是漢堡選單，確保 `p-4` 的觸控間距。

## 二、量子視覺規範 (Visual Tokens)

### 1. 核心色彩 (HSL System)

| 語意        | HSL 變量            | 用途                     |
| :---------- | :------------------ | :----------------------- |
| **Base**    | `240, 10%, 4%`      | 全站背景底層             |
| **Surface** | `240, 6%, 10%`      | 卡片與面板背景           |
| **Accent**  | `217, 91%, 60%`     | 主動作、按鈕、掃描線     |
| **Bullish** | `142, 71%, 45%`     | 上漲、正面指標、系統正常 |
| **Bearish** | `346, 77%, 50%`     | 下跌、負面指標、警告系統 |
| **Border**  | `0, 0%, 100%, 0.05` | 玻璃邊界、細分線         |

### 2. 玻璃層次 (Glass Elevation)

- **Deep Glass**: `bg-white/[0.02] backdrop-blur-3xl` (用於主背景區塊)。
- **Elevated Glass**: `bg-white/[0.05] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]` (用於彈窗、懸浮控制項)。
- **Hover Shine**: 懸浮時邊界不應變色，而是產生一個半徑 `100px` 的 `radial-gradient` 背光。

### 3. 字體與排版 (Modern Typos)

- **Primary**: `Geist Sans`, `Inter`, `system-ui`.
- **Monaspace**: `JetBrains Mono` (用於所有數值顯示)。
- **Sizing**: 標籤一律使用 `uppercase tracking-[0.15em] font-black text-[10px]` 的嚴肅風格。

## 三、重構與清理 (Aesthetic Integrity)

1. **Delete the Ugly**: 任何帶有「過時陰影」、「預設藍色連結」、「不明確的內距」的舊組件，應在大規模重構中直接移除。
2. **Unified Rendering**: 所有的 `StockCard` 必須統一使用 HSL 變量，嚴禁在元件中寫死十六進位色彩。
3. **Motion First**: 優雅的轉場不只是裝飾，而是引導使用者視線的 UX 工具。進入頁面時，模組應以 `20ms` 的間隔由下而上依序浮現。
