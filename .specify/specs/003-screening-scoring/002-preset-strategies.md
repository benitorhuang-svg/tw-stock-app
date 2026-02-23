# 002 — 預設選股池與 SQL 轉譯集 (Preset Strategies)

> 雖然 `001-query-builder` 提供了讓使用者極度自由選股的能力，但 80% 的散戶其實只想要直接點擊「現成的高勝率策略」。本文件負責定義這套終端機內建的 **預設選股策略 (Preset Strategies)**，並規範它們如何完美映射到原生的 `SQLite` 查詢，達成零延遲的全盤掃描。

## 1. 預設策略架構庫 (`src/lib/strategies.ts`)

每一項預設策略都由三部分構成：

1. **Frontend Metadata** (名稱、描述、適合的市場情境)。
2. **Criteria JSON** (相容於 Query Builder 的條件樹)。
3. **Hardcoded SQL Query (Fast Path)** (如果這是極高頻使用的策略，直接寫死最優化的 SQL 以跳過 Query Builder)。

## 2. 核心內建策略清單 (Core Preset Specs)

### 2.1 價值投資防護網 (The Value Moat)

- **目標**：尋找被市場低估、殖利率保護、大戶不離棄的避風港。
- **SQL 條件邏輯**：
    ```sql
    SELECT s.symbol, s.name, v.pe_ratio, v.div_yield
    FROM stocks s
    JOIN valuation_features v ON s.symbol = v.symbol
    JOIN chip_features c ON s.symbol = c.symbol
    WHERE v.date = (SELECT MAX(date) FROM valuation_features)
      AND v.pe_ratio BETWEEN 5 AND 12        -- 本益比低廉
      AND v.div_yield > 4.5                  -- 殖利率 > 4.5%
      AND c.trust_net_20d > 0                -- 投信近20日淨買超
    ORDER BY v.div_yield DESC
    LIMIT 50;
    ```

### 2.2 動能噴發先鋒 (Momentum Breakout)

- **目標**：尋找正在起漲點、爆量且技術指標剛翻黃金交叉的飆股。
- **SQL 條件邏輯**：
    ```sql
    SELECT t.symbol, t.close, t.volume
    FROM tech_features t
    WHERE t.date = (SELECT MAX(date) FROM tech_features)
      AND t.volume > (t.ma20_volume * 1.5)   -- 今日成交量爆大量 (>月均量1.5倍)
      AND t.close > t.ma60                   -- 確保處於季線之上的多頭格局
      AND t.macd_hist > 0                    -- MACD 柱狀體為紅
      AND t.macd_hist_prev <= 0              -- 重點：昨日為綠/平，今日剛翻轉 (CROSSOVER)
    ORDER BY (t.close - t.open)/t.open DESC
    ```

### 2.3 大戶偷偷吸籌碼 (Smart Money Divergence)

- **目標**：實踐 M5 籌碼面提到的「背離」邏輯：股價還在跌，但外資/投信已經在狂買。
- **SQL 條件邏輯**：
    ```sql
    SELECT s.symbol, t.change_pct_5d, c.foreign_net_5d
    FROM stocks s
    JOIN tech_features t ON s.symbol = t.symbol
    JOIN chip_features c ON s.symbol = c.symbol
    WHERE t.change_pct_5d < -2      -- 近5日股價為跌
      AND c.foreign_net_5d > 1000   -- 但外資近5日已經狂買超過千張
    ```

## 3. 視圖抽離策略 (Materialized Views)

當系統擴展到所有台股加上權證與 ETF 時，即使是有索引的 `JOIN` 也可能會耗時超過 50ms。為了保證 UX 體驗：
在 M1 ETL 階段 (每天下午 3 點)，資料庫重建腳本必須在 SQLite 執行 `CREATE VIEW AS ...` 將這三個最常用的預設策略**固化為 View**。
這樣首頁在加載「動能噴發先鋒榜」時，只需 `SELECT * FROM view_momentum_breakout LIMIT 10`，耗時 `< 1ms`。
