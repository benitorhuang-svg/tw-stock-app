---
name: institutional_forensic
description: 台股法人鑑識深度分析模型，整合八大籌碼資料表進行資金足跡全面透視。
---

# 法人鑑識情報模型 (Institutional Forensic Intelligence Model)

台股法人動向是最具預測力的短期指標。散戶看新聞，法人看部位。本模型整合系統中八大籌碼資料表，建立完整的「資金足跡鑑識 (Money Trail Forensics)」。

---

## 資料庫對照表 (Database Mapping)

本模型核心為 `institutional_snapshot` 快照表，已將八大籌碼表預合併為一列/每檔股票：

### 快照層 (零 JOIN 速查)

| 資料面向 | `institutional_snapshot` 欄位 | 來源原始表 |
|----------|------------------------------|-----------|
| 三大法人 | `foreign_inv`, `invest_trust`, `dealer` | `chips` |
| 融資融券 | `margin_bal`, `margin_net`, `short_bal`, `short_net` | `margin_short` |
| 股權分散 | `total_shareholders`, `large_holder_1000_ratio`, `small_holder_under_10_ratio` | `shareholder_distribution` |
| 八大官股 | `gov_net_buy`, `gov_net_amount` | `government_chips` |
| 主力分點 | `main_net_shares`, `main_concentration` | `major_broker_chips` |
| 董監持股 | `director_ratio`, `pawn_ratio`, `insider_change` | `director_holdings` |
| 借券賣出 | `lending_balance`, `short_selling_balance` | `security_lending` |
| 自營明細 | `prop_buy`, `hedge_buy` | `dealer_details` |

### 一鍵查詢: 個股完整籌碼面貌

```sql
SELECT s.symbol, st.name, st.sector,
       -- 三大法人
       s.foreign_inv, s.invest_trust, s.dealer,
       -- 融資融券
       s.margin_bal, s.margin_net, s.short_bal, s.short_net,
       -- 股權分散
       s.total_shareholders, s.large_holder_1000_ratio, s.small_holder_under_10_ratio,
       -- 官股
       s.gov_net_buy,
       -- 主力
       s.main_net_shares, s.main_concentration,
       -- 董監
       s.director_ratio, s.pawn_ratio, s.insider_change,
       -- 借券
       s.lending_balance, s.short_selling_balance,
       -- 自營商明細
       s.prop_buy, s.hedge_buy
FROM institutional_snapshot s
JOIN stocks st ON s.symbol = st.symbol
WHERE s.symbol = '2330';
```

---

## 1. 三大法人深度追蹤 (Three Institution Deep Track)

### 1A. 外資連續買超偵測

```sql
-- 外資連續買超天數 (已有 API: /api/market/institutional-streak)
WITH consecutive AS (
  SELECT symbol, date, foreign_inv,
         CASE WHEN foreign_inv > 0 THEN 1 ELSE 0 END AS is_buy,
         SUM(CASE WHEN foreign_inv <= 0 THEN 1 ELSE 0 END)
           OVER (PARTITION BY symbol ORDER BY date) AS grp
  FROM chips
  WHERE date >= date('now', '-30 days')
)
SELECT symbol,
       COUNT(*) AS streak_days,
       SUM(foreign_inv) AS total_bought
FROM consecutive
WHERE is_buy = 1
GROUP BY symbol, grp
HAVING streak_days >= 3
ORDER BY streak_days DESC, total_bought DESC
LIMIT 30;
```

### 1B. 投信認養偵測

```sql
-- 投信近 10 日累計買超排行 (機構認養 = 穩定吃貨)
SELECT c.symbol, st.name,
       SUM(c.invest_trust) AS trust_10d,
       COUNT(CASE WHEN c.invest_trust > 0 THEN 1 END) AS buy_days
FROM chips c
JOIN stocks st ON c.symbol = st.symbol
WHERE c.date >= date('now', '-14 days')
GROUP BY c.symbol
HAVING trust_10d > 500 AND buy_days >= 7  -- 10天內至少7天買超
ORDER BY trust_10d DESC
LIMIT 20;
```

### 1C. 法人共識偵測 (三大法人同步買)

```sql
-- 三大法人同日買超 (共識最強信號)
SELECT c.symbol, st.name, c.date,
       c.foreign_inv, c.invest_trust, c.dealer,
       c.foreign_inv + c.invest_trust + c.dealer AS total_net
FROM chips c
JOIN stocks st ON c.symbol = st.symbol
WHERE c.date = (SELECT MAX(date) FROM chips)
  AND c.foreign_inv > 0
  AND c.invest_trust > 0
  AND c.dealer > 0
ORDER BY total_net DESC
LIMIT 20;
```

---

## 2. 融資融券鑑識 (Margin Forensics)

### 2A. 散戶指標: 融資異常增減

```sql
-- 融資大增 = 散戶搶進 (反向指標: 通常是頂部訊號)
-- 融資大減 = 散戶認賠 (可能是底部訊號)
SELECT ms.symbol, st.name,
       ms.margin_bal, ms.margin_net,
       ms.short_bal, ms.short_net,
       CASE WHEN ms.margin_net > 500 THEN '⚠️ 散戶搶進'
            WHEN ms.margin_net < -500 THEN '📗 融資認賠'
            ELSE '—'
       END AS margin_signal
FROM margin_short ms
JOIN stocks st ON ms.symbol = st.symbol
WHERE ms.date = (SELECT MAX(date) FROM margin_short)
  AND ABS(ms.margin_net) > 300
ORDER BY ms.margin_net DESC;
```

### 2B. 券資比異常 (軋空潛力)

```sql
-- 融券餘額 / 融資餘額 > 30% → 軋空風險
SELECT ms.symbol, st.name,
       ms.margin_bal, ms.short_bal,
       ROUND(ms.short_bal * 100.0 / NULLIF(ms.margin_bal, 0), 1) AS short_margin_ratio,
       CASE WHEN ms.short_bal * 100.0 / NULLIF(ms.margin_bal, 0) > 30
            THEN '🔥 高券資比 (軋空候選)'
            ELSE '—'
       END AS squeeze_alert
FROM margin_short ms
JOIN stocks st ON ms.symbol = st.symbol
WHERE ms.date = (SELECT MAX(date) FROM margin_short)
  AND ms.margin_bal > 0 AND ms.short_bal > 100
ORDER BY short_margin_ratio DESC
LIMIT 20;
```

---

## 3. 股權結構鑑識 (Ownership Forensics)

### 3A. 大戶籌碼集中度

```sql
-- 千張大戶持股比例高 + 持續增加 = 主力鎖碼
SELECT sd.symbol, st.name,
       sd.large_holder_1000_ratio,
       sd.small_holder_under_10_ratio,
       sd.total_shareholders,
       sd.avg_shares_per_holder
FROM shareholder_distribution sd
JOIN stocks st ON sd.symbol = st.symbol
WHERE sd.date = (SELECT MAX(date) FROM shareholder_distribution)
  AND sd.large_holder_1000_ratio > 50  -- 大戶持有超過 50%
ORDER BY sd.large_holder_1000_ratio DESC
LIMIT 30;
```

### 3B. 董監持股與質押風險

```sql
-- 董監質押比過高 = 財務風險
-- 董監加碼 (insider_change > 0) = 內線信心
SELECT dh.symbol, st.name,
       dh.director_holding_ratio, dh.pawn_ratio, dh.insider_net_change,
       CASE WHEN dh.pawn_ratio > 30 THEN '🔴 高質押風險'
            WHEN dh.insider_net_change > 0 THEN '📗 董監加碼'
            WHEN dh.insider_net_change < 0 THEN '⚠️ 董監減碼'
            ELSE '—'
       END AS insider_signal
FROM director_holdings dh
JOIN stocks st ON dh.symbol = st.symbol
WHERE dh.date = (SELECT MAX(date) FROM director_holdings)
ORDER BY dh.pawn_ratio DESC;
```

---

## 4. 主力分點與借券 (Smart Money Forensics)

### 4A. 主力券商集中買超

```sql
-- 主力分點集中度高 + 淨買超 = 特定大戶布局
SELECT mb.symbol, st.name,
       mb.buy_top5_shares, mb.sell_top5_shares,
       mb.net_main_player_shares, mb.concentration_ratio
FROM major_broker_chips mb
JOIN stocks st ON mb.symbol = st.symbol
WHERE mb.date = (SELECT MAX(date) FROM major_broker_chips)
  AND mb.concentration_ratio > 10  -- 前5大券商佔成交 > 10%
  AND mb.net_main_player_shares > 0
ORDER BY mb.concentration_ratio DESC
LIMIT 20;
```

### 4B. 借券賣出壓力

```sql
-- 借券餘額大增 = 空方借股放空
SELECT sl.symbol, st.name,
       sl.lending_balance, sl.short_selling_balance,
       CASE WHEN sl.short_selling_balance > 1000 THEN '🔴 大量放空壓力'
            ELSE '—'
       END AS lending_signal
FROM security_lending sl
JOIN stocks st ON sl.symbol = st.symbol
WHERE sl.date = (SELECT MAX(date) FROM security_lending)
  AND sl.short_selling_balance > 500
ORDER BY sl.short_selling_balance DESC
LIMIT 20;
```

---

## 5. 綜合鑑識評分模型 (Composite Forensic Score)

將八大面向整合為一個 0~100 的「籌碼健康度」分數：

| 面向 | 權重 | 加分條件 | 扣分條件 |
|------|------|---------|---------|
| 外資動向 | 25% | 連買 ≥ 3日 (+25) | 連賣 ≥ 3日 (-25) |
| 投信認養 | 15% | 10日累計 > 500 張 (+15) | 10日累計 < -500 張 (-15) |
| 融資融券 | 15% | 融資減+融券增 (+15) | 融資暴增 (-15) |
| 主力集中 | 15% | concentration > 10% (+15) | 主力淨賣出 (-15) |
| 股權集中 | 10% | 大戶 > 50% (+10) | 小散戶 > 60% (-10) |
| 董監信心 | 10% | 加碼 (+10) | 質押 > 30% (-10) |
| 借券壓力 | 10% | 餘額減少 (+10) | 餘額暴增 (-10) |

```typescript
interface ForensicScoreInput {
  foreignStreak: number;         // 外資連買天數 (負數=連賣)
  trustNet10d: number;           // 投信10日累計
  marginNet: number;             // 融資增減
  shortNet: number;              // 融券增減
  mainConcentration: number;     // 主力集中度 %
  mainNetShares: number;         // 主力淨買
  largeHolderRatio: number;      // 千張大戶比例 %
  insiderChange: number;         // 董監增減
  pawnRatio: number;             // 質押比 %
  lendingChange: number;         // 借券餘額增減
}

function calculateForensicScore(input: ForensicScoreInput): number {
  let score = 50; // 起始中性分
  // 外資 (±25)
  if (input.foreignStreak >= 3) score += 25;
  else if (input.foreignStreak <= -3) score -= 25;
  else score += input.foreignStreak * 5;
  // 投信 (±15)
  if (input.trustNet10d > 500) score += 15;
  else if (input.trustNet10d < -500) score -= 15;
  // 融資融券 (±15)
  if (input.marginNet < 0 && input.shortNet > 0) score += 15; // 散戶退、空軍攻
  else if (input.marginNet > 500) score -= 15; // 散戶搶進
  // 主力 (±15)
  if (input.mainConcentration > 10 && input.mainNetShares > 0) score += 15;
  else if (input.mainNetShares < 0) score -= 10;
  // 股權 (±10)
  if (input.largeHolderRatio > 50) score += 10;
  // 董監 (±10)
  if (input.insiderChange > 0) score += 10;
  if (input.pawnRatio > 30) score -= 10;
  // 借券 (±10)
  if (input.lendingChange < 0) score += 5;
  else if (input.lendingChange > 500) score -= 10;
  return Math.max(0, Math.min(100, score));
}
```

---

## 6. API 端點對照

| 功能 | API 路由 | 用途 |
|------|---------|------|
| 法人連買排行 | `GET /api/market/institutional-streak` | 外資/投信連買天數 Top N |
| AI 鑑識報告 | `GET /api/ai-report/{symbol}` | 含 chips 面向的完整報告 |
| 最新行情 (含法人) | `GET /api/market/latest` | 漲跌排行含 `foreign_inv`, `invest_trust` |
| 通用表查詢 | `GET /api/db/{table}` | 直接查詢 chips、margin_short 等原始表 |
| 即時報價 | `GET /api/sse/stream` | 盤中法人動態監控 |

---

## 7. ETL 依賴

| ETL 腳本 | 產出表 | 說明 |
|----------|-------|------|
| `scripts/fetch-chips.mjs` | `chips` | 每日三大法人買賣超 (TWSE T86) |
| `scripts/fetch-forensic.mjs` | `margin_short`, `shareholder_distribution`, `government_chips`, `major_broker_chips`, `director_holdings`, `security_lending`, `dealer_details` | 八大法人鑑識資料 (chips 含在內) |
| `scripts/etl/generate-all-features.mjs` | `institutional_snapshot` | 合併八表為單一快照 |
| `scripts/etl/generate-all-features.mjs` | `chip_features` | 5日法人集中度 |
| `scripts/etl/generate-all-features.mjs` | `institutional_trend` | 全市場法人每日匯總 |

---

## 8. 已知資料缺口與補充建議

| 缺口 | 影響 | 補充方案 |
|------|------|---------|
| ~~`fetch-forensic.mjs` 部分使用模擬資料~~ | ~~margin_short、shareholder 等為 mock data~~ | ✅ 已修復：`fetch-forensic.mjs` 已全面改用真實 TWSE/TDCC API（零 Mock） |
| `director_holdings` 被反爬蟲封鎖 | 董監持股/質押/加減碼指標全部為空 (0 rows) | ❌ TWSE t36sb03 / TPEx directors API 返回 HTML (Cloudflare)，需尋找替代資料源或人工代理 |
| 外資持股比例 (Foreign Holding %) | 無法判斷外資是否已接近持股上限 | 從 TWSE 新增 `foreign_holding_ratio` 欄位 |
| 法人歷史持股變化曲線 | 只有每日增減，無累計持股 | 可從 `chips` 表以 Window Function 累計 |
| 集保戶數增減趨勢 | `total_shareholders` 僅有最新一期 | 需保留每週的歷史紀錄供趨勢分析 |
| 融券回補日 | 高券資比的軋空時機 | 需額外抓取 TWSE 融券回補日程表 |
| ~~`chips` 日期格式不一致~~ | ~~新舊格式混合~~ | ✅ 已修復：`build-sqlite-db.js` 已加入 `normalizeDate()` 統一為 `YYYY-MM-DD` |
