---
name: Risk Management & Position Sizing Engine
description: 台股部位控管與停損停利模型，確保生存與利潤極大化。
---

# 風險控管與部位模型 (Risk Management Model)

「會買股票只是徒弟，會賣才是師傅。」任何量化系統，如果沒有風險控管，遇到一次黑天鵝就會讓長年利潤歸零。本模型控制整個系統的「買進數量」與「賣出時機」。

## 1. 資金控管與部位計算 (Position Sizing)

量化交易絕對不憑感覺「這檔買 3 張、那檔買 5 張」，一切依據資金池波動率計算。

**核心原則：單根 K 棒/單筆交易最大虧損，不得超過總資金的 `2%` (2% Rule)**

*   **Step 1. 給定條件：**
    *   `Total_Capital` (總資金): 例如 1,000,000 元
    *   `Max_Risk_Per_Trade` = 1,000,000 * 0.02 = 20,000 元 (這筆交易最多只能賠 2 萬)
*   **Step 2. 決定停損價 (Stop Loss Price)：**
    *   *技術型停損*：例如進場價 `Entry = 100` 元，防守 20日均線 `Stop_Loss = 90` 元。
    *   *每股風險 (Risk_Per_Share)* = `Entry - Stop_Loss` = `10` 元。
*   **Step 3. 算出精確購買股數：**
    *   *Formula*: `Position_Size_Shares = Max_Risk_Per_Trade / Risk_Per_Share`
    *   `20,000 / 10 = 2,000 股 (也就是 2 張)`
    *   *結論*：程式會自動建議這筆交易「只能投入 20 萬元買 2 張」，如果這檔股票波動太大、停損空間要拉很遠，系統就會自動要求你買少一點。

## 2. 動態出場機制 (Dynamic Exit Mechanisms)

進場後，股票的每一天狀態都在變動。將以下邏輯強制注入所有回測與實盤策略中：

**A. 初始停損 (Hard Stop Loss)**
*   *Condition*: 跌破買進時設定的原始防守價位 (如進場點的下緣或是某根大量長紅K的低點)。
*   *Action*: 無條件市價停損，不可凹單。

**B. 移動停利 (Trailing Stop) - 讓利潤奔跑**
若股票如預期大漲，不能死抱不放，也不能太早賣。要隨著股價上漲，把停損/停利點往上移。
*   **ATR 移動停利法**：
    *   *Formula*: `Trailing_Stop_Price = Highest_Close_Since_Entry - (2 * ATR)`
    *   (註：ATR為平均真實區間，用以衡量個股波動度。即：股價自最高點回檔超過兩倍的日常波動率即停利出場。)
*   **均線移動停利法 (適合波段操作)**：
    *   *Condition*: 收盤價跌破 10 日均線 且 隔日無法站回。
    *   *Action*: 全數獲利了結。

**C. 時間停損 (Time Stop)**
*   *Condition*: 進場後超過 10 個交易日，股價漲幅不到 `3%` (即資金卡死、無效率)。
*   *Action*: 出場釋放資金，轉移到更有動能的標的。

## 3. 開發實作規範 (給 AI / 工程師的指示)
*   **介面整合 (UI)**：在系統中建置一頁 `Portfolio Dashboard`，模擬帶入虛擬起始資金 (如100萬)。當用戶在 `StrategyMonitor` 點擊一檔股票想測試買進時，跳出「風險計算機」，自動帶出建議買進的張數。
*   **回測邏輯 (Backtesting)**：在 `BacktestHeatmap` 模組中，必須嚴格實現這套 Stop Loss 機制。歷史回測的成績，是在加入了「跌破自動停損出場」後的真實績效，絕不能使用「買進後放著不管」的無限凹單回測結果。
