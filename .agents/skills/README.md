---
name: TW-Stock Quant Master Index
description: 台股量化交易系統的核心策略總覽與元件關係說明。
---

# TW-Stock Quant Strategy Master Index (量化策略總覽)

本文件是所有策略模型（Skills）的最高指導原則，定義了各個分析模型在交易系統中的角色、順序與搭配方式。在開發與使用 TW-Stock 平台時，應將此架構視為核心商業邏輯。

## 系統架構與策略生命週期 (Strategy Lifecycle)

一套完整的量化交易系統不是單一條件，而是一條「漏斗式」的流水線（Pipeline）。我們的策略模型依序扮演以下角色：

### 1. 系統性環境判定大閘門 (Environment Check)
*   **使用模型**：`market_breadth_analysis` (市場寬度與情緒評估)
*   **用途**：決定「現在是不是適合投資的氣候」。
*   **機制**：如果市場正在雪崩（例如：超過 80% 股票跌破季線），系統將發出警報，所有個股買進訊號將被自動忽略或降低權重，這層保護可以避免逆勢操作。

### 2. 建立長期觀察名單 (Watchlist Generation)
*   **使用模型**：`fundamental_analysis` (基本面法醫與價值模型)
*   **用途**：從台股 1700 多檔中，尋找「就算不幸套牢，長期也能靠配息或基本面回本」的體質優良公司。
*   **機制**：每月（營收公布）或每季（財報公布）執行一次，汰弱留強，產出包含 50~100 檔股票的「長線觀察池（Pool）」。

### 3. 短線買進觸發器 (Entry Trigger)
*   **使用模型**：`technical_analysis` (技術動能與籌碼模型) / `day_trading_momentum` (當沖動能模型)
*   **用途**：決定「今天或明天開盤要不要買」。
*   **機制**：每天盤後針對「長期觀察名單」進行計算。一旦某檔好股票出現「外資大買、突破月線、MACD 翻紅」的訊號，系統即觸發強烈的 `BuySignal`。

### 4. 資金控管與出場防護網 (Exit & Sizing)
*   **使用模型**：`risk_management` (風險控管與部位計算)
*   **用途**：決定「要買多少張」以及「什麼時候認錯賣出」。
*   **機制**：在任何買進交易執行前，必須經過此模型計算「最大可承受虧損」。買入後，若觸發移動停損條件，無論基本面多好，由程式自動執行無情平倉。

---

## 模型整合實作指引 (Implementation Guide)

在專案（如 `StrategyFilterMatrix.svelte` 或 `BacktestHeatmap`）中實作時，這四個模組應該彼此協作，傳遞資料：

1.  **資料流 (Data Flow)**：
    `Market Data` -> `Breadth Filter` -> `Fundamental Screener` -> `Technical Scorer` -> `Risk Manager` -> `Final Trade Signal`

2.  **儀表板設計**：
    前端 UI 應該反映這種層次。例如，儀表板最上方顯示「市場寬度燈號 (Market Condition)」，左側為「基本面過濾清單 (Watchlist)」，中間為「今日技術面觸發名單 (Actionable Tickets)」，右下方顯示「可用資金與建議部位 (Position Sizing)」。
