# 001 — 分析引擎 (Analysis Engine)

> 模組 2：將資料採集層的原始數據轉化為量化指標。

## 職責定義

本層負責**純計算邏輯**，三大功能：
1. **技術指標**：MA、RSI、MACD、KD、Bollinger Bands
2. **風險分析**：Beta、Sharpe Ratio、波動率、最大回撤、Pearson 相關性
3. **初階選股條件運算**：基本面指標 (PEG、ROE)、籌碼面純函數運算，提供資料給 `009-strategy-screener.md` 組合策略。

所有函式都是**純函式**（輸入數字/資料矩陣 → 輸出結果），不依賴 UI 也不直接存取 DB。
**進階多面向（基本+技術+籌碼）自動化選股策略：** 請參考 👉 [模組 3: 003-strategy-screener.md](../003-screening-scoring/003-strategy-screener.md)。

## 模組清單

| 模組 | 大小 | 角色 | 測試 |
|------|------|------|------|
| `src/lib/indicators.ts` | 7KB | 技術指標計算 (SMA/EMA/RSI/MACD/KD/Bollinger) | ✅ |
| `src/lib/analysis.ts` | 5KB | 風險分析 (Beta/Sharpe/Volatility/MaxDD) | ✅ |
| `src/lib/screener.ts` | 8KB | Server-side 選股篩選邏輯 | ✅ |
| `src/lib/screener-local.ts` | 4KB | Client-side 本地篩選邏輯 | ❌ |
| `src/utils/technicalIndicators.ts` | 6KB | SSR 版技術指標（重複實作） | ❌ |

## 技術指標 — indicators.ts

### 輸入型別

```typescript
interface OHLCV {
    date: string;
    open: number; high: number; low: number; close: number;
    volume: number;
}
```

### 指標函式一覽

| 函式 | 輸入 | 輸出 | 計算方式 |
|------|------|------|----------|
| `SMA(data, period=5)` | `number[]` | `(number\|null)[]` | 前 period 筆為 null，之後為滑動平均 |
| `EMA(data, period=12)` | `number[]` | `number[]` | 第一個值用 SMA 初始化，後續用 `k = 2/(period+1)` 加權 |
| `RSI(data, period=14)` | `number[]` | `(number\|null)[]` | 平均漲幅 / 平均跌幅 → RS → `100 - 100/(1+RS)` |
| `MACD(data, 12, 26, 9)` | `number[]` | `{ macd, signal, histogram }` | DIF = EMA12 - EMA26, Signal = EMA9(DIF), Hist = DIF - Signal |
| `KD(ohlcv, 9, 3, 3)` | `OHLCV[]` | `{ k, d }` | RSV = (C-LL)/(HH-LL)×100, K = 前K×2/3 + RSV/3, D = 前D×2/3 + K/3 |
| `BollingerBands(data, 20, 2)` | `number[]` | `{ upper, middle, lower }` | Middle = SMA(20), Upper/Lower = Middle ± 2σ |

### 一鍵全部計算

```typescript
export function calculateAllIndicators(ohlcv: OHLCV[]) {
    const closes = ohlcv.map(d => d.close);
    return {
        ma5: SMA(closes, 5),      // 5 日均線
        ma10: SMA(closes, 10),    // 10 日均線
        ma20: SMA(closes, 20),    // 月線
        ma60: SMA(closes, 60),    // 季線
        rsi: RSI(closes),         // RSI(14)
        macd: MACD(closes),       // MACD(12,26,9)
        kd: KD(ohlcv),           // KD(9,3,3) ← 需要 OHLCV 不只 close
        bollinger: BollingerBands(closes)  // BB(20,2)
    };
}
```

### 指標計算細節

**SMA（簡單移動平均）**：
```
SMA(5) of [10, 20, 30, 40, 50, 60]
= [null, null, null, null, (10+20+30+40+50)/5, (20+30+40+50+60)/5]
= [null, null, null, null, 30, 40]
```

**RSI（相對強弱指標）**：
```
漲跌序列 → 分離為 gains[] / losses[]
avgGain = 過去 14 期平均漲幅
avgLoss = 過去 14 期平均跌幅
RS = avgGain / avgLoss
RSI = 100 - 100/(1+RS)
特殊: avgLoss === 0 → RSI = 100 (全漲)
```

**KD（隨機指標）**：
```
RSV = (收盤 - 最近9日最低) / (最近9日最高 - 最近9日最低) × 100
特殊: 最高 === 最低 → RSV = 50
K值 = (前K × 2 + RSV) / 3  (初始 K = 50)
D值 = (前D × 2 + K)   / 3  (初始 D = 50)
```

## 風險分析 — analysis.ts

### 分析函式一覽

| 函式 | 輸入 | 輸出 | 公式 |
|------|------|------|------|
| `correlation(x, y)` | 兩組 `number[]` | `number` (-1~1) | Pearson r = (nΣxy - ΣxΣy) / √((nΣx²-(Σx)²)(nΣy²-(Σy)²)) |
| `calculateBeta(stockR, marketR)` | 兩組報酬率 | `number` | Cov(s,m) / Var(m) |
| `standardDeviation(data)` | `number[]` | `number` | √(Σ(x-μ)²/(n-1)) (樣本標準差) |
| `annualizedVolatility(returns)` | 日報酬率 | `number` | σ_daily × √252 |
| `sharpeRatio(returns, rf=1.5)` | 報酬率, 無風險利率 | `number` | (R_p年化 - R_f) / σ_p |
| `maxDrawdown(prices)` | 價格序列 | `{ maxDrawdown, peak, trough }` | max((peak-trough)/peak) × 100 |
| `calculateReturns(prices)` | 價格序列 | `number[]` | (P_t - P_{t-1}) / P_{t-1} × 100 |

### 風險摘要產生

```typescript
export function analyzeRisk(stockPrices: number[], marketPrices: number[]): RiskAnalysis {
    const stockReturns  = calculateReturns(stockPrices);
    const marketReturns = calculateReturns(marketPrices);
    return {
        beta:        calculateBeta(stockReturns, marketReturns),
        volatility:  annualizedVolatility(stockReturns),
        sharpe:      sharpeRatio(stockReturns),
        maxDrawdown: maxDrawdown(stockPrices).maxDrawdown,
        correlation: correlation(stockReturns, marketReturns),
    };
}
```

### 邊界處理

| 情境 | 處理方式 |
|------|----------|
| 資料長度 < 2 | `correlation` → 0, `beta` → 1, `sharpe` → 0, `maxDrawdown` → 0, `stdDev` → 0 |
| 分母為 0 (Var=0 or σ=0) | `correlation` → 0, `beta` → 1, `sharpe` → 0 |
| 全漲 (avgLoss=0) | `RSI` → 100 |
| HH === LL | `KD RSV` → 50 |

## 選股篩選 — screener.ts + sqlite-service.ts

### 篩選條件型別

```typescript
interface ScreenerCriteria {
    peMin?: number;       peMax?: number;
    pbMin?: number;       pbMax?: number;
    yieldMin?: number;    yieldMax?: number;
    priceMin?: number;    priceMax?: number;
    volumeMin?: number;
    changePctMin?: number; changePctMax?: number;
}
```

### 動態 SQL 生成

```typescript
async function screenStocks(criteria: ScreenerCriteria): Promise<StockWithPrice[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (criteria.peMin !== undefined) {
        conditions.push('lp.pe >= ?');
        params.push(criteria.peMin);
    }
    if (criteria.peMax !== undefined) {
        conditions.push('lp.pe <= ? AND lp.pe > 0');  // 排除 P/E = 0
        params.push(criteria.peMax);
    }
    // ... 其他條件

    const whereClause = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : '';

    const sql = `
        SELECT s.*, lp.* FROM stocks s
        JOIN latest_prices lp ON s.symbol = lp.symbol
        ${whereClause}
    `;
    return query<StockWithPrice>(sql, params);
}
```

### 預設策略（規劃中）

| 策略名稱 | 條件組合 | 狀態 |
|----------|----------|------|
| 價值股 | P/E 5-15, P/B < 1.5, Yield > 3% | ❌ 待實施 |
| 高殖利率 | Yield > 5%, P/E 0-30 | ❌ 待實施 |
| 成長股 | 營收成長 > 10%, ROE > 15% | ❌ 待實施 |
| 穩健股 | P/E 10-20, Yield > 3%, Vol > 500 | ❌ 待實施 |
| 技術轉多 | MA5 上穿 MA20, RSI 30-50 | ❌ 待實施 |

## SSR 技術指標 — `utils/technicalIndicators.ts`

此模組是 `lib/indicators.ts` 的 SSR 版本，提供相同的計算函式但用於 Server 端。
**注意**：存在功能重複，應考慮統一。

## 待辦任務

- [ ] **T6-01**: 為 `screener-local.ts` 新增測試（Client-side 篩選邏輯）
- [ ] **T6-02**: 擴充 `indicators.test.ts` 邊界值測試 — 空陣列、單值、NaN、極大值
- [ ] **T6-03**: 擴充 `analysis.test.ts` 邊界值測試 — 負報酬率、零波動率、全零序列
- [ ] **T6-04**: 實作 5 種預設篩選策略範本
- [ ] **T6-05**: 統一 `lib/indicators.ts` 與 `utils/technicalIndicators.ts`（消除重複）
- [ ] **T6-06**: 實作技術面訊號偵測（黃金交叉、死亡交叉、RSI 超買超賣、MACD 翻多翻空）
