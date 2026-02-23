# 模組 5：UI 版面與動線規劃 (UI Layout Architecture)

定義全站各類設備（桌面端、行動端）的整體版面佈局、導航動線與空間配置，確保「高級金融終端 (Premium Financial Terminal)」的體驗一致性與高效率操作。

## 核心功能

- **全局佈局與導航**：Sidebar, Topbar, Bottom Tab 跨裝置響應式切換。
- **頁面空間配置**：圖表區、面板區、清單區的 Grid / Flex 視窗管理模型。
- **動線與狀態管理**：彈出視窗 (Modal)、側滑面板 (Slide-over)、載入過場 (Skeleton/Transitions)。

## 包含的規格文件

- [001-system-ui-architecture.md](./001-system-ui-architecture.md)：全站宏觀佈局、頁面動線指南、數據視覺化邏輯與強制重構守則 (The System Policy)
- [002-tab-overview.md](./002-tab-overview.md)：【總覽】匯聚當日報價、微型走勢與 AI 一分鐘總結
- [003-tab-database.md](./003-tab-database.md)：【數據觀測】以類似 phpMyAdmin 的樹狀結構檢驗 SQLite 資料庫完整性
- [004-tab-technical.md](./004-tab-technical.md)：【技術面】整合性主/副圖表引擎（K線/量/均線/MACD/KD/波浪）
- [005-tab-chips.md](./005-tab-chips.md)：【籌碼面】三大法人與融資券進出複合走勢儀表板
- [006-tab-fundamentals.md](./006-tab-fundamentals.md)：【基本面與估值】本益比河流圖、營收動能直條圖與健康矩陣
- [007-tab-alerts.md](./007-tab-alerts.md)：【AI報告與警示】智慧總結全文報告，連動一鍵設定停損停利警號
