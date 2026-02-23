# 000 — 模組 2：高階分析引擎 (Advanced Analytics Engine)

> 本模組建立在 `M1: Data Ingestion (資料庫)` 的地基之上。既然常規技術指標 (MA, MACD, RSI) 與籌碼特徵 (外資買賣超) 都已在 SQLite 層級被「預先算好且結構化」，本分析引擎 (`M2`) 的職責將全數昇華為 **「無法被預先結構化的高階金融數學 (High-Level Financial Math)」** 與 **「為大型語言模型 (LLM) 提供精煉數據的代理層 (AI Persona Proxy)」**。

## 職責與架構翻轉 (Paradigm Shift)

| 傳統作法 (已淘汰)                         | 全新 M2 架構 (The New Era)                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 前端或 Server 即時運算 MACD 陣列迴圈。    | 直接從 `tech_features` table 撈已算好的 `macd_hist`。                                                           |
| JavaScript 執行龐大且緩慢的迴圈來畫均線。 | 只負責非常態分佈、多維度的投資組合分析 (Portfolio Risk)。                                                       |
| 指標計算與 UI 渲染高度耦合。              | 專注於將多筆資料**「提煉(Distillation)為單一的上下文(Context)」**，餵給 AI 報告介面 (`005/007-tab-alerts.md`)。 |

## 包含的規格文件

- `001-risk-and-portfolio.md`：投資組合層級的風險模型算法 (Beta, Sharpe Ratio)。
- `002-ai-context-distillation.md`：如何把十年的財報與籌碼數據，壓縮成給 LLM 推論的純文字特徵 (Context Generation API)。
