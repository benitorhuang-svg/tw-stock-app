# 模組 5：UI 版面與動線規劃 (UI Layout Architecture)

> 最後更新：2026-02-25 · 元件總數：97 (11A + 59M + 27O) + 2 Layouts + 8 Pages + 13 Engines

定義全站各類設備（桌面端、行動端）的整體版面佈局、導航動線與空間配置，確保「高級金融終端 (Premium Financial Terminal)」的體驗一致性與高效率操作。

## 核心功能

- **全局佈局與導航**：Sidebar, Topbar, Bottom Tab 跨裝置響應式切換。
- **頁面空間配置**：圖表區、面板區、清單區的 Grid / Flex 視窗管理模型。
- **動線與狀態管理**：彈出視窗 (Modal)、側滑面板 (Slide-over)、載入過場 (Skeleton/Transitions)。
- **原子化設計 (Atomic Design)**：11 Atoms → 59 Molecules → 27 Organisms → 2 Templates → 8 Pages。
- **客戶端引擎分離**：13 個獨立 Engine Script 驅動頁面互動，UI/業務邏輯完全分離。
- **效能架構**：SQLite 優化、API 快取、SW v4 分層快取、非阻塞字體、Vite chunk splitting。
- **SSR/SSG 雙模**：透過 `STATIC_BUILD=true` 環境變數切換建置模式，支援 GitHub Pages 部署。

## 包含的規格文件

- [001-system-ui-architecture.md](./001-system-ui-architecture.md)：**核心文件** — 完整元件登記 (Atomic Design Registry)、視覺 Tokens、效能架構、客戶端引擎、SSR/SSG 雙模設計
- [002-tab-overview.md](./002-tab-overview.md)：【總覽】匯聚當日報價、微型走勢與 AI 一分鐘總結
- [003-tab-database.md](./003-tab-database.md)：【數據觀測】以類似 phpMyAdmin 的樹狀結構檢驗 SQLite 資料庫完整性
- [004-tab-technical.md](./004-tab-technical.md)：【技術面】整合性主/副圖表引擎（K線/量/均線/MACD/KD/波浪）
- [005-tab-chips.md](./005-tab-chips.md)：【籌碼面】三大法人與融資券進出複合走勢儀表板
- [006-tab-fundamentals.md](./006-tab-fundamentals.md)：【基本面與估值】本益比河流圖、營收動能直條圖與健康矩陣
- [007-tab-alerts.md](./007-tab-alerts.md)：【AI報告與警示】智慧總結全文報告，連動一鍵設定停損停利警號
- [008-market-heatmap-calendar.md](./008-market-heatmap-calendar.md)：【市場熱力日曆 (戳戳樂)】Dashboard 核心時間導航，Ratio 著色 + 歷史數據聯動
