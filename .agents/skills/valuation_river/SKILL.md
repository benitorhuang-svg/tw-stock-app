---
name: valuation_river
description: 台股估值河流圖分析模型，透過 PE/PB/殖利率的歷史分佈判斷個股估值位階與均值回歸機會。
---

# 估值河流圖分析模型 (Valuation River Chart Model)

「河流圖」是台股投資人最常使用的估值工具之一。將個股的 PE、PB、殖利率繪製成長期時間序列，形成「河道」，股價在河道中游走時，可清晰判斷目前處於「歷史便宜區」或「歷史昂貴區」。

---

## 資料庫對照表 (Database Mapping)

| 模型需求 | 資料表 | 關鍵欄位 | 更新頻率 |
|----------|--------|----------|----------|
| PE/PB/殖利率歷史 | `valuation_history` | `pe`, `pb`, `dividend_yield` | 月度 (25日, BWIBBU_ALL) |
| 最新估值 | `latest_prices` | `pe`, `pb`, `yield` | 每日 |
| 估值特徵快照 | `valuation_features` | `pe_ratio`, `pb_ratio`, `dividend_yield` | 每日 (ETL) |
| EPS 歷史 | `fundamentals` | `eps`, `gross_margin`, `net_margin` | 季度 |
| 股利歷史 | `dividends` | `dividend`, `year`, `ex_dividend_date` | 年度 |
| 收盤價 (計算理論估值) | `price_history` | `close` | 每日 |
| 產業估值比較 | `sector_daily` | `avg_pe`, `avg_pb`, `avg_yield` | 每日 |

---

## 1. PE 河流圖 (Price-to-Earnings River)

### 1A. 取得個股 PE 歷史序列

```sql
-- PE 河流圖: 取得 5 年 PE 歷史
SELECT date, pe, pb, dividend_yield
FROM valuation_history
WHERE symbol = '2330'
ORDER BY date ASC;
```

### 1B. 計算 PE 分位數 (Percentile Bands)

```sql
-- 計算 PE 的歷史分位帶 (河流圖的「河岸」)
WITH pe_data AS (
  SELECT pe FROM valuation_history
  WHERE symbol = '2330' AND pe > 0 AND pe IS NOT NULL
  ORDER BY pe
),
stats AS (
  SELECT
    COUNT(*) AS n,
    MIN(pe) AS pe_min,
    MAX(pe) AS pe_max,
    AVG(pe) AS pe_avg
  FROM pe_data
)
SELECT
  pe_min,
  pe_max,
  pe_avg,
  -- 手動計算百分位 (SQLite 不支援 PERCENTILE)
  (SELECT pe FROM pe_data LIMIT 1 OFFSET (SELECT n * 10 / 100 FROM stats)) AS pe_p10,
  (SELECT pe FROM pe_data LIMIT 1 OFFSET (SELECT n * 25 / 100 FROM stats)) AS pe_p25,
  (SELECT pe FROM pe_data LIMIT 1 OFFSET (SELECT n * 50 / 100 FROM stats)) AS pe_median,
  (SELECT pe FROM pe_data LIMIT 1 OFFSET (SELECT n * 75 / 100 FROM stats)) AS pe_p75,
  (SELECT pe FROM pe_data LIMIT 1 OFFSET (SELECT n * 90 / 100 FROM stats)) AS pe_p90
FROM stats;
```

### 1C. 目前 PE 位階判定

```typescript
interface ValuationBand {
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
}

function getValuationZone(currentPE: number, band: ValuationBand): string {
  if (currentPE <= band.p10) return '🟢 極度低估 (歷史底部 10%)';
  if (currentPE <= band.p25) return '🟢 偏低估 (便宜區)';
  if (currentPE <= band.median) return '🔵 合理偏低';
  if (currentPE <= band.p75) return '🟡 合理偏高';
  if (currentPE <= band.p90) return '🟠 偏高估';
  return '🔴 極度高估 (歷史頂部 10%)';
}
```

---

## 2. PB 河流圖 (Price-to-Book River)

PB 適合資產重 (如金融、營建) 或獲利不穩定的公司，因 EPS 波動大時 PE 失真。

```sql
-- PB 河流圖 + 分位帶
SELECT date, pb,
       AVG(pb) OVER (ORDER BY date ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS pb_ma12m
FROM valuation_history
WHERE symbol = '2884'  -- 金融股適合用 PB
  AND pb > 0
ORDER BY date ASC;
```

### PB 與 ROE 搭配判斷

```
合理 PB ≈ ROE / 折現率
若 ROE = 15%, 折現率 = 10% → 合理 PB ≈ 1.5x
若目前 PB = 0.8x → 嚴重低估 (前提: ROE 維持穩定)
```

```sql
-- PB vs ROE 交叉比較
SELECT lp.symbol, st.name,
       lp.pb, lp.eps,
       ROUND(lp.eps * 4 * lp.pb / NULLIF(lp.close, 0) * 100, 1) AS roe_approx,
       CASE WHEN lp.pb < 1.0 AND lp.eps > 0 THEN '📗 淨值以下且獲利'
            WHEN lp.pb > 3.0 AND lp.eps <= 0 THEN '📕 高 PB 但虧損'
            ELSE '—'
       END AS pb_signal
FROM latest_prices lp
JOIN stocks st ON lp.symbol = st.symbol
WHERE lp.pb > 0
ORDER BY lp.pb ASC
LIMIT 30;
```

---

## 3. 殖利率河流圖 (Dividend Yield River)

殖利率河流圖的「河道」方向與 PE/PB 相反：殖利率越高越便宜。

```sql
-- 殖利率歷史 + 反轉分位帶
SELECT date, dividend_yield,
       AVG(dividend_yield) OVER (ORDER BY date ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS yield_ma12m
FROM valuation_history
WHERE symbol = '2412'  -- 中華電信: 殖利率模式
  AND dividend_yield > 0
ORDER BY date ASC;
```

### 殖利率 + 股利穩定度交叉

```sql
-- 近 5 年股利穩定度分析
SELECT symbol, year, dividend,
       AVG(dividend) OVER (PARTITION BY symbol ORDER BY year
         ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) AS avg_div_5y,
       MIN(dividend) OVER (PARTITION BY symbol ORDER BY year
         ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) AS min_div_5y,
       MAX(dividend) OVER (PARTITION BY symbol ORDER BY year
         ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) AS max_div_5y
FROM dividends
WHERE symbol = '2412'
ORDER BY year DESC;
```

**穩定度評級**:
```typescript
function dividendStability(dividends5y: number[]): string {
  if (dividends5y.length < 5) return 'N/A';
  const min = Math.min(...dividends5y);
  const max = Math.max(...dividends5y);
  const avg = dividends5y.reduce((a, b) => a + b, 0) / dividends5y.length;
  const cv = (max - min) / avg;  // 變異係數
  if (cv < 0.1) return 'AAA (極度穩定)';
  if (cv < 0.3) return 'AA (穩定)';
  if (cv < 0.5) return 'A (尚可)';
  return 'B (波動大)';
}
```

---

## 4. 估值均值回歸策略 (Mean Reversion Rules)

| 信號 | 條件 | 動作 |
|------|------|------|
| 📗 深度低估買進 | PE < P10 且殖利率 > P90 | 搭配 `fundamental_analysis` 確認體質; 達標則列入「長線觀察池」 |
| 🟢 偏低估觀察 | PE < P25 | 等待技術面觸發買進 (`technical_analysis`) |
| 🔴 過熱警示 | PE > P90 | 不新增持股; 持有者收緊停利至 MA5 |
| 📕 極度高估 | PE > P90 且 PB > P90 | 強制停利出場 (即使基本面仍好) |
| 🔄 估值回歸中 | PE 從 P90 回落至 P75 以下 | 觀望; 等確認是「修正」而非「崩跌」 |

### 快速篩選: 全市場低估股

```sql
-- PE < 行業平均 且殖利率 > 5% 的低估股
SELECT lp.symbol, st.name, lp.pe, lp.pb, lp.yield,
       sd.avg_pe AS sector_pe, sd.avg_yield AS sector_yield,
       ROUND(lp.pe / NULLIF(sd.avg_pe, 0) * 100, 0) AS pe_vs_sector_pct
FROM latest_prices lp
JOIN stocks st ON lp.symbol = st.symbol
JOIN sector_daily sd ON lp.sector = sd.sector
  AND sd.date = (SELECT MAX(date) FROM sector_daily)
WHERE lp.pe > 0 AND lp.pe < sd.avg_pe * 0.7  -- PE < 產業平均 70%
  AND lp.yield > 5
ORDER BY lp.yield DESC
LIMIT 30;
```

---

## 5. 視覺化規範 (Chart Specification)

### 河流圖前端實作指引

河流圖應包含以下視覺元素：

1. **X 軸**: 時間 (取自 `valuation_history.date`)
2. **Y 軸**: PE / PB / 殖利率
3. **河道色帶** (由淺至深):
   - P90+ → 紅色帶 (極度高估)
   - P75~P90 → 橘色帶
   - P50~P75 → 淡黃帶
   - P25~P50 → 淡綠帶
   - P10~P25 → 綠色帶
   - P10 以下 → 深綠帶 (極度低估)
4. **當前價格線**: 實線標示目前 PE 位置
5. **中位數線**: 虛線標示歷史中位數

```
API 調用: GET /api/stock/valuation?symbol=2330&limit=250
回傳: [{date, pe, pb, yield}]  ← 直接用於繪圖
```

---

## 6. API 端點對照

| 功能 | API 路由 | 用途 |
|------|---------|------|
| 個股估值歷史 | `GET /api/stock/valuation?symbol=2330&limit=250` | 河流圖資料 (PE/PB/Yield 時間序列) |
| 最新估值 | `GET /api/market/latest` | 全市場 PE/PB/Yield 篩選 |
| AI 鑑識報告 | `GET /api/ai-report/{symbol}` | 含估值分析章節 |
| 產業估值 | `sector_daily` (via `/api/db/sector_daily`) | 產業平均 PE/PB/Yield 比較 |

---

## 7. ETL 依賴

| ETL 腳本 | 產出表 | 說明 |
|----------|-------|------|
| `scripts/fetch-valuation-history.mjs` | `valuation_history` | 從 TWSE BWIBBU_ALL 抓取月度 PE/PB/Yield (5 年) |
| `scripts/etl/generate-all-features.mjs` | `valuation_features` | 最新日估值快照 |
| `scripts/fetch-financials.mjs` | `fundamentals` | 季度 EPS (PE 計算基礎) |
| `scripts/etl/migrate-to-analysis-tables.mjs` | `latest_prices` (pe/pb/yield) | 匯總至快照層 |

---

## 8. 已知資料缺口與補充建議

| 缺口 | 影響 | 補充方案 |
|------|------|---------|
| 估值歷史為月頻 | 河流圖精度較粗 (每月一點) | 可在 ETL 中從 `price_history.close` 與 `fundamentals.eps` 自行計算日頻 PE |
| PEG (PE / 成長率) | 缺少成長型估值指標 | 可從 `fundamentals` 計算 EPS YoY 成長率後求 PEG = PE / EPS_Growth |
| 自由現金流殖利率 (FCF Yield) | 更精準的價值指標 | 需新增現金流量表資料 (MOPS t187ap17) |
| EV/EBITDA | 企業價值比較 | 需新增負債、現金資料才能算 Enterprise Value |
| 同業 PE Band | 缺少同產業比較河流 | `sector_daily.avg_pe` 已可提供; 可進一步存歷史序列 |
| 預估 PE (Forward PE) | 僅有歷史 PE | 可結合 AI 報告或分析師預估 EPS 計算 |
