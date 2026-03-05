---
name: transformer_strategy
description: Transformer 深度學習選股模型，融合 VPA/VSA 量價分析、Price Action 結構與籌碼面特徵，搭配三層交易記憶持續學習。
---

# Transformer 選股策略模型 (Transformer Stock Selection Model)

使用 Transformer Encoder 架構對台股進行多因子量化選股，融合 11 大 SKILL 模型的領域知識 + **Volume Price Analysis (VPA)** / **Volume Spread Analysis (VSA)** 的量價結構理論 + **Price Action** 的 K 線微結構分析作為特徵工程基礎，並實作 TradeMemory Protocol 的三層記憶系統 (L1/L2/L3) 實現策略持續學習與調整。

### 核心理論依據 (Theoretical Foundation)

本模型特徵工程植根於以下三大分析流派：

1. **VPA / VSA (量價分析)** — 源自 Richard Wyckoff，後由 Tom Williams《Master the Markets》與 Anna Coulling《A Complete Guide to Volume Price Analysis》系統化。核心公理：**成交量是市場的燃料，價格振幅 (Spread) 是市場的儀表板；兩者的匹配/背離揭示「聰明資金」的真實意圖。**
2. **Price Action** — 源自 Al Brooks《Reading Price Charts Bar by Bar》與《The Ultimate Guide to Price Action Trading》。核心公理：**每根 K 線的 OHLC 位置關係、影線比例與連續 K 線結構蘊含市場供需的精確投影。**
3. **台股籌碼面鑑識** — 本專案獨有的三大法人、融資融券、主力分點等高頻籌碼數據，與 VPA/VSA 的 Smart Money 概念天然耦合。

### 參考文獻 (位於 `public/ref_pdf/`)

| 書名 | 核心貢獻 |
|------|---------|
| A Complete Guide To Volume Price Analysis | VPA 核心框架：量價矩陣、Ultra High/High/Average/Low Volume × Wide/Average/Narrow Spread 的 16 格分類 |
| Master the Markets Using Volume Spread Analysis | VSA 原典：No Demand / No Supply / Stopping Volume / Climactic Action / Testing 等經典模式 |
| David H. Weis | Weis Wave：累積量能波浪，識別推動波與修正波的量能比較 |
| Reading Price Charts Bar by Bar | 逐根 K 線分析: Signal Bar、Entry Bar、Inside Bar、Outside Bar (Engulfing) 識別 |
| The Ultimate Guide To Price Action Trading | 趨勢結構: Higher High/Higher Low、Support/Resistance、Pin Bar、Fakey Pattern |
| Mastering the Trade | Squeeze Play (Bollinger Band/Keltner Channel 收斂)、Opening Range Breakout |
| The Ultimate Trading Guide | 多策略整合: Regime Detection、Adaptive Parameter Selection |

---

## 資料庫對照表 (Database Mapping)

### 輸入特徵來源

| 特徵群組 | 資料表 | 欄位 | 對應 SKILL/理論 |
|----------|--------|------|----------------|
| OHLCV 原始 | `price_history` | `open`, `high`, `low`, `close`, `volume`, `change_pct` | VPA/VSA + Price Action |
| 技術指標 | `daily_indicators` | `ma5`, `ma20`, `ma60`, `rsi14`, `macd_diff`, `macd_dea`, `kd_k`, `kd_d`, `atr14` | `technical_analysis` |
| 法人籌碼 | `chips` | `foreign_inv`, `invest_trust`, `dealer` | `institutional_forensic` |
| 融資融券 | `margin_short` | `margin_net`, `short_net` | `institutional_forensic` |
| 大盤環境 | `market_breadth_history` | `ma20_breadth`, `ma60_breadth` | `market_breadth_analysis` |
| 市場指數 | `market_index` | `close` (大盤報酬率) | `market_breadth_analysis` |
| 基本面 | `latest_prices` | `pe`, `pb`, `yield`, `revenue_yoy`, `gross_margin`, `debt_ratio` | `fundamental_analysis` |

### 輸出目標

| 輸出 | 資料表 | 用途 |
|------|--------|------|
| 選股評分 | `screener_scores` | 每日預測結果寫入，前端可查詢 |
| 交易日誌 | `trade_journal` | L1 記錄每次預測決策 |
| 交易模式 | `trade_patterns` | L2 反思引擎發現的統計模式 |
| 策略調整 | `strategy_adjustments` | L3 基於模式的自動調整規則 |
| 模型後設 | `ml_models` | 模型版本、超參數、訓練績效 |

---

## 模型架構 (Architecture)

```
Input [batch, 60, 39]          ← 60 交易日 × 39 維特徵 (19 原始技術 + 8 VPA/VSA + 6 PA + 6 靜態)
  │
  ▼
Dense(64) → Input Projection   ← 升維至 d_model=64
  │
  ▼
Sinusoidal Positional Encoding ← sin/cos 位置編碼 (VPA 時序模式需要精確時間感知)
  │
  ▼
┌──────────────────────────────┐
│ Transformer Encoder × 4      │ ← 增至 4 層 (量價模式需更深抽象)
│  Pre-LayerNorm               │
│  → Multi-Head Attention (4h) │ ← 4 個注意力頭, depth=16
│  → Dropout(0.1) + Residual   │    Head 1-2: 短期量價結構 (3-5 日 VPA 模式)
│  Pre-LayerNorm               │    Head 3: 中期趨勢 (20 日 Price Action)
│  → FFN(256→64) + GELU        │    Head 4: 長期籌碼/基本面漂移
│  → Dropout(0.1) + Residual   │ ← GELU 替代 ReLU (更平滑梯度)
└──────────────────────────────┘
  │
  ▼
Final LayerNorm                ← Post-normalization
  │
  ▼
Temporal Attention Pooling     ← 學習式加權池化 (替代 GAP，讓模型聚焦重要時間步)
  │    Dense(1) → Softmax → Weighted Sum
  ▼
Dense(128, GELU) → Dropout(0.15)  ← Classification Head
  │
  ▼
Dense(3, Softmax)              ← P(SELL), P(HOLD), P(BUY)
```

### 注意力機制的量價分析解讀

Transformer Self-Attention 天然適合捕捉 VPA/VSA 的多日量價模式：

| Attention Pattern | VPA/VSA 對應概念 | 模型學習目標 |
|-------------------|-----------------|-------------|
| 高量日 attend to 後續低量日 | **Testing** (大量後的低量回測) | 識別 Wyckoff 測試模式 |
| 窄幅高量 attend to 寬幅突破 | **Accumulation → Breakout** | 偵測吸籌完成後的爆發 |
| 連續日互相 attend (短距) | **Bar-by-Bar Price Action** | Inside Bar → Breakout 序列 |
| 遠距高權重 | **Supply/Demand Zone 回憶** | 價格回到前次大量區的反應 |

### 超參數

| 參數 | 值 | 說明 |
|------|------|------|
| `seqLen` | 60 | 回看天數 (~3 個月) |
| `nFeatures` | 39 | 19 技術 + 8 VPA/VSA + 6 PA + 6 靜態 |
| `dModel` | 64 | Transformer 內部維度 |
| `nHeads` | 4 | 注意力頭數 |
| `nLayers` | 4 | Encoder 層數 (從 3→4) |
| `dFF` | 256 | FFN 隱藏維度 (從 128→256，容納更多特徵交互) |
| `dropRate` | 0.1 | Attention/FFN Dropout |
| `headDropRate` | 0.15 | Classification Head Dropout |
| `numClasses` | 3 | SELL / HOLD / BUY |
| `activation` | GELU | FFN 激活函數 (比 ReLU 更適合金融數據) |
| `pooling` | temporal_attention | 可學習式時序池化 |

---

## 特徵工程 (Feature Engineering)

### 第一群：原始技術 + 籌碼 + 市場特徵 (19 維 × 60 天)

沿用既有指標體系，提供趨勢、動能、波動、資金流向的基礎覆蓋。

```
close_ret     日報酬率 %
ma5_ratio     收盤/MA5 (趨勢偏離)
ma20_ratio    收盤/MA20
ma60_ratio    收盤/MA60
rsi14         RSI(14) 正規化 0-1
macd_diff     MACD 柱狀 (z-score)
macd_dea      MACD DEA (z-score)
kd_k          KD-K 正規化 0-1
kd_d          KD-D 正規化 0-1
atr_ratio     ATR/收盤 波動率
vol_ratio     量能/20日均量
foreign_norm  外資力道 (量能正規化)
trust_norm    投信力道 (量能正規化)
dealer_norm   自營力道 (量能正規化)
margin_net    融資增減 (z-score)
short_net     融券增減 (z-score)
market_ret    大盤日報酬
breadth_20    MA20 寬度 0-1
breadth_60    MA60 寬度 0-1
```

---

### 第二群：VPA / VSA 量價分析特徵 (8 維 × 60 天) 🆕

**理論基礎**：每根 K 線可解構為 Spread（振幅）與 Volume（成交量）的二維矩陣。VPA/VSA 的核心就是分析兩者的匹配與背離，推斷機構資金的真實意圖。

> 「Volume is the thermometer of a market's emotional heat. 
>   Spread is the footprint of its resolve.
>   When the two disagree, smart money is at work.」
> — Anna Coulling, *A Complete Guide to Volume Price Analysis*

#### (A) K 線微結構特徵 (Bar Anatomy)

```
spread_norm      = (high - low) / ATR14          ← 振幅相對波動率，VSA 「Spread」核心
                   正規化到 ATR 使跨股比較一致
                   > 1.5 = Wide Spread (大幅波動)
                   < 0.5 = Narrow Spread (窄幅盤整/蓄能)

close_position   = (close - low) / (high - low + ε)  ← 收盤在 K 線中的位置
                   = 1.0 → 收最高 (買方完全主導)
                   = 0.0 → 收最低 (賣方完全主導)
                   = 0.5 → 收中間 (猶豫)
                   VPA 判斷供需的最關鍵單一指標

body_ratio       = |close - open| / (high - low + ε) ← 實體/全幅比
                   > 0.7 = 強勢實體 (方向確定)
                   < 0.3 = 十字線/紡錘線 (猶豫反轉)

upper_shadow     = (high - max(open, close)) / (high - low + ε)  ← 上影線比例
                   > 0.5 = 上方賣壓拒絕 (Pin Bar 頂部)

lower_shadow     = (min(open, close) - low) / (high - low + ε)  ← 下影線比例
                   > 0.5 = 下方買盤吸收 (Hammer / Pin Bar 底部)
```

#### (B) 量價關係特徵 (Volume-Price Interplay)

```
effort_vs_result = z-score(Δ_vol_ratio - Δ_spread_norm)
                   ← Wyckoff 的「努力與結果法則」
                   Δ_vol_ratio  = vol_ratio[t] - vol_ratio[t-1]
                   Δ_spread_norm = spread_norm[t] - spread_norm[t-1]
                   正值 = 量增但幅縮 (背離 → 吸籌/派發)
                   負值 = 幅增但量縮 (背離 → 假突破/耗竭)
                   零值 = 量價同步 (健康趨勢)

smart_money_flow = close_position × vol_ratio × sign(close - open)
                   ← 綜合 VPA 指標：高量+收高位+收紅 = 機構買進
                   高量+收低位+收黑 = 機構出貨
                   低量+任何位置 = 機構無操作 (零售雜訊)
                   z-score 正規化後使用

climax_detector  = clamp((vol_ratio - 2.5) / 2.5, 0, 1) × (spread_norm > 1.5 ? 1 : 0)
                   ← 高潮量偵測 (Climactic Volume)
                   同時需要 極高量(>2.5x) + 寬幅振盪
                   出現在上漲末端 = Buying Climax (頂部訊號)
                   出現在下跌末端 = Selling Climax (底部訊號)
                   方向由 close_position 決定
```

#### VPA 16 格量價矩陣 (Anna Coulling Framework)

Transformer 的 Attention 機制可自動學習以下 16 種量價組合的含義，但通過上述 8 維特徵的顯式編碼，大幅降低學習難度：

```
                 │  Narrow Spread  │  Average Spread  │  Wide Spread
─────────────────┼─────────────────┼──────────────────┼─────────────────
Ultra High Vol   │ ⚠️ 吸籌/派發     │ ⚠️ 背離警示       │ 🔥 高潮量 (反轉)
High Volume      │  累積/分銷初期   │  健康趨勢延續     │  強勢突破/崩跌
Average Volume   │  盤整/無方向     │  正常交易日       │  潛在突破前兆
Low Volume       │  No Demand/     │  趨勢疲乏/        │  假突破
                 │  No Supply      │  缺乏參與         │  (量不支持幅度)
```

---

### 第三群：Price Action 結構特徵 (6 維 × 60 天) 🆕

**理論基礎**：K 線之間的關係 (前後對比) 揭示供需博弈的演化。

> 「Every bar is a signal bar of some timeframe.
>   Your job is to read what the market did, not what you wish it had done.」
> — Al Brooks, *Reading Price Charts Bar by Bar*

#### (C) K 線比較特徵 (Inter-Bar Relationships)

```
inside_bar       = float(high < prev_high AND low > prev_low)
                   ← 內包線: 波動率壓縮，即將爆發
                   Al Brooks: 「壓縮就是彈簧」
                   連續 2-3 根 Inside Bar = 極強訊號
                   Transformer Attention 會自然聚焦這些壓縮區

engulfing_score  = float(high > prev_high AND low < prev_low) 
                   × sign(close - open)
                   ← 吞噬線方向:
                   +1 = 多頭吞噬 (Bullish Engulfing) 
                   -1 = 空頭吞噬 (Bearish Engulfing)
                    0 = 非吞噬日

gap_ratio        = (open - prev_close) / prev_close
                   ← 跳空缺口幅度
                   > +2% = 強勢跳空 (可能為突破或隔日沖)
                   < -2% = 恐慌跳空 (可能為高潮量出貨)
                   VPA: 缺口 + 高量 = 真突破; 缺口 + 低量 = 假突破
```

#### (D) 趨勢結構特徵 (Trend Structure)

```
bar_momentum     = close_position × spread_norm × sign(close_ret)
                   ← 單根 K 線的綜合動能分數
                   收最高+寬幅+收紅 → 最大正值 (強勢推進)
                   收最低+寬幅+收黑 → 最大負值 (恐慌拋售)
                   Price Action 核心: 趨勢由強勢 bar 推進

hl_trend         = rolling_5d(higher_high_count - lower_low_count) / 5
                   ← 近 5 日趨勢結構分數
                   higher_high = float(high > prev_high)
                   lower_low   = float(low < prev_low)
                   +1 = 完美上升結構 (HH+HL 連續 5 天)
                   -1 = 完美下降結構 (LH+LL 連續 5 天)
                    0 = 盤整/混亂

price_acceptance = rolling_5d_mean(close_position)
                   ← 近 5 日收盤位置均值
                   > 0.7 = 持續收在高位 → 買方控制 (Wyckoff Sign of Strength)
                   < 0.3 = 持續收在低位 → 賣方控制 (Wyckoff Sign of Weakness)
                   VPA: 連續高收盤位置 = 累積完成訊號
```

---

### 第四群：靜態特徵 (6 維, broadcast)

```
pe_norm       本益比 (正規化)
pb_norm       股價淨值比 (正規化)
yield_norm    殖利率 (正規化)
rev_yoy       營收年增率 (z-score)
gross_margin  毛利率 (正規化)
debt_ratio    負債比 (正規化)
```

---

### 特徵總覽 (39 維)

| 群組 | 維度 | 特徵列表 | 理論來源 |
|------|------|---------|---------|
| 原始技術 + 籌碼 + 市場 | 19 | close_ret, ma5/20/60_ratio, rsi14, macd_diff/dea, kd_k/d, atr_ratio, vol_ratio, foreign/trust/dealer_norm, margin/short_net, market_ret, breadth_20/60 | `technical_analysis` + `institutional_forensic` + `market_breadth_analysis` |
| VPA / VSA 量價 | 8 | spread_norm, close_position, body_ratio, upper_shadow, lower_shadow, effort_vs_result, smart_money_flow, climax_detector | Coulling VPA + Williams VSA + Wyckoff |
| Price Action 結構 | 6 | inside_bar, engulfing_score, gap_ratio, bar_momentum, hl_trend, price_acceptance | Al Brooks PA + Weis Wave |
| 基本面靜態 | 6 | pe/pb/yield_norm, rev_yoy, gross_margin, debt_ratio | `fundamental_analysis` |
| **合計** | **39** | | |

### Label 定義

```
Forward 5-day return:
  > +3%  → BUY  (2)
  < -1%  → SELL (0)
  else   → HOLD (1)
```

#### 增強 Label：VPA 確認加權 (可選)

為降低假訊號，可引入 VPA 確認邏輯調整 label 邊界：

```
# BUY label 需要 VPA 支持 (量價健康)
if fwd_return > 3%:
  if avg_smart_money_flow(past_5d) > 0:   # 過去 5 日機構淨買
    label = BUY
  else:
    label = HOLD  # 量價不支持的漲幅 → 降級為 HOLD

# SELL label 需要 VPA 確認 (出貨訊號)
if fwd_return < -1%:
  if avg_smart_money_flow(past_5d) < 0:   # 過去 5 日機構淨賣
    label = SELL
  else:
    label = HOLD  # 自然回檔非機構出貨 → 降級為 HOLD
```

### 正規化策略

所有特徵於訓練時計算全域 z-score（均值 + 標準差），存檔至 `models/<id>/norm_stats.json`，推論時載入同一組統計值確保一致性。

⚠️ **VPA 特徵的正規化注意事項**：
- `close_position`, `body_ratio`, `upper_shadow`, `lower_shadow` 已自然在 [0, 1] 範圍，僅做 mean-centering (減去均值) 而不做除以標準差
- `inside_bar` 為 binary (0/1)，同樣僅 mean-centering
- `engulfing_score` 為三值 (-1, 0, +1)，z-score 正規化
- `climax_detector` 已 clamp 至 [0, 1]，僅 mean-centering

---

## 三層交易記憶 (Trade Memory — 借鏡 TradeMemory Protocol)

```
    Model Prediction
         │
    ┌────▼─────────────────┐
    │ L1: Trade Journal    │  ← 記錄預測 + 信心度 + 特徵快照 + VPA 上下文
    │     (trade_journal)  │     填回 5 日後實際報酬 + 正確性
    └────┬─────────────────┘
         │ 每週反思
    ┌────▼─────────────────┐
    │ L2: Pattern Discovery│  ← 統計分析: 勝率/報酬 by VPA 狀態/PA 結構
    │     (trade_patterns) │     發現量價背離模式、K 線結構模式
    └────┬─────────────────┘
         │ 自動產生建議
    ┌────▼─────────────────┐
    │ L3: Adjustments      │  ← 信心縮放 / 信號抑制 / VPA 確認門檻
    │ (strategy_adjustments)│     需人工審核後 apply
    └──────────────────────┘
```

### L1 特徵快照增強

L1 `trade_journal` 的 `feature_snapshot` JSON 欄位增加 VPA/PA 上下文：

```json
{
  "signal": "BUY",
  "confidence": 0.82,
  "symbol": "2330",
  "date": "2026-03-02",
  "features": {
    "rsi14": 0.65,
    "vol_ratio": 1.8,
    "vpa_context": {
      "spread_norm": 1.2,
      "close_position": 0.85,
      "smart_money_flow": 1.45,
      "climax_detector": 0.0,
      "effort_vs_result": -0.3
    },
    "pa_context": {
      "inside_bar": 0,
      "engulfing_score": 1,
      "bar_momentum": 1.02,
      "hl_trend": 0.6,
      "price_acceptance": 0.72
    }
  }
}
```

### L2 反思分析維度增強 (Pattern Discovery)

#### 既有分析維度

| 維度 | 分析邏輯 | 範例發現 |
|------|---------|---------|
| 信號類型 | by signal (BUY/SELL) | 「BUY 整體勝率 52%」 |
| 信心度 | by confidence bucket (>0.7, 0.5-0.7) | 「高信心 BUY 勝率 61%」 |
| RSI 過熱 | by RSI > 70 | 「RSI 過熱 BUY 勝率 28%」 |

#### 新增 VPA/VSA 分析維度 🆕

| 維度 | 分析邏輯 | 典型發現 |
|------|---------|---------|
| **量價匹配** | by smart_money_flow sign match signal | 「BUY + 正流 → 勝率 68%; BUY + 負流 → 勝率 31%」 |
| **吸籌偵測** | by spread_norm < 0.5 AND vol_ratio > 1.5 | 「窄幅高量後 BUY 勝率 72% (Accumulation)」 |
| **高潮量反轉** | by climax_detector > 0.5 | 「出現高潮量後 SELL 勝率 78% (Climactic Action)」 |
| **努力結果背離** | by abs(effort_vs_result) > 1.5 | 「量價背離時 HOLD 正確率 85%」 |
| **收盤位階** | by close_position buckets | 「收盤位 >0.8 的 BUY 平均報酬 +4.2%」 |
| **壓縮爆發** | by inside_bar AND next-day signal | 「Inside Bar 後 BUY 勝率 65%」 |
| **吞噬確認** | by engulfing_score match signal | 「多頭吞噬 + BUY → 勝率 70%」|
| **趨勢結構** | by hl_trend score | 「hl_trend > 0.6 時 BUY 勝率 63%」|
| **Wyckoff 測試** | by low vol_ratio after climax | 「高潮量後低量回測 + BUY → 勝率 75%」|

#### L2 反思 SQL 範例 (VPA 量價匹配分析)

```sql
-- 分析 BUY 信號在 Smart Money Flow 正/負時的勝率差異
SELECT
  CASE WHEN json_extract(feature_snapshot, '$.features.vpa_context.smart_money_flow') > 0
       THEN 'SMF_positive' ELSE 'SMF_negative' END AS vpa_bucket,
  signal,
  COUNT(*) AS n,
  ROUND(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END), 3) AS win_rate,
  ROUND(AVG(actual_return), 3) AS avg_return
FROM trade_journal
WHERE actual_return IS NOT NULL AND signal = 'BUY'
GROUP BY vpa_bucket, signal
HAVING n >= 20;
```

### L3 調整類型

| 類型 | 效果 | 範例 |
|------|------|------|
| `confidence_scale` | 將預測信心乘以縮放係數 | RSI 過熱時 BUY 信心 ×0.5 |
| `signal_suppress` | 完全抑制該信號 | 平均報酬 < -2% 的模式 |
| `vpa_confirm_gate` 🆕 | 要求 VPA 特徵滿足條件才放行 | BUY 需 smart_money_flow > 0 |
| `pa_confirm_gate` 🆕 | 要求 PA 結構滿足條件才放行 | BUY 需 hl_trend > 0 |
| `climax_override` 🆕 | 高潮量出現時強制覆蓋信號 | climax_detector > 0.5 → 降級為 HOLD |

#### L3 VPA 確認門檻範例 (Pseudo-code)

```typescript
// predict.ts 中 L3 調整應用
for (const adj of activeAdjustments) {
  if (adj.type === 'vpa_confirm_gate' && adj.status === 'applied') {
    // 例: BUY 信號需要 Smart Money Flow 為正
    if (signal === 'BUY' && features.smart_money_flow <= 0) {
      confidence *= 0.3;  // 大幅降低信心
      adjustmentApplied = true;
    }
  }
  if (adj.type === 'climax_override' && adj.status === 'applied') {
    if (features.climax_detector > 0.5) {
      signal = 'HOLD';    // 高潮量 → 觀望
      adjustmentApplied = true;
    }
  }
}
```

---

## CLI 使用方式

```bash
# 訓練模型
npx tsx scripts/ml/train.ts
npx tsx scripts/ml/train.ts --start 2024-01-01 --end 2026-01-31 --model my_model

# 每日預測
npx tsx scripts/ml/predict.ts
npx tsx scripts/ml/predict.ts --model transformer_v1 --top 30

# 反思 (每週)
npx tsx scripts/ml/reflect.ts
```

### npm scripts

```bash
npm run ml:train      # 訓練
npm run ml:predict    # 預測
npm run ml:reflect    # 反思
```

---

## 資料流 (Data Pipeline)

```
ETL (既有)                        ML Pipeline
┌──────────┐                    ┌──────────────┐
│ fetch:all│ → stocks.db →      │ train.ts     │ → models/transformer_v1/
│ build-db │   (27 tables)      │ (一次性訓練)  │    model.json + weights
└──────────┘                    └──────────────┘
                                       │
                                       ▼
┌──────────┐                    ┌──────────────┐
│ 每日盤後  │ → stocks.db →      │ predict.ts   │ → screener_scores
│ ETL 更新  │   (最新資料)       │ (每日推論)    │ → trade_journal (L1)
└──────────┘                    └──────────────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │ reflect.ts   │ → trade_patterns (L2)
                                │ (每週反思)    │ → strategy_adjustments (L3)
                                └──────────────┘
```

---

## ETL 依賴

| ETL 腳本 | 必須先執行 | 原因 |
|----------|-----------|------|
| `scripts/build-sqlite-db.js` | ✅ | 建立 stocks, price_history 等原始表 |
| `scripts/etl/migrate-to-analysis-tables.mjs` | ✅ | 計算 daily_indicators (MA, RSI, MACD, KD, ATR) |
| `scripts/etl/generate-all-features.mjs` | ✅ | 計算 chip_features, market_breadth_history, sector_daily |
| `scripts/fetch-chips.mjs` | ✅ | chips, margin_short 原始資料 |
| `scripts/fetch-market-index.mjs` | ✅ | market_index 大盤指數 |

---

## 與現有 SKILL 的關係

| Phase | SKILL | 本模型整合方式 |
|-------|-------|--------------|
| 1 | `market_breadth_analysis` | `breadth_20`, `breadth_60`, `market_ret` 特徵 |
| 2 | `sector_rotation` | 可擴展: 加入 sector_momentum 特徵 |
| 3 | `fundamental_analysis` | `pe`, `pb`, `yield`, `revenue_yoy`, `gross_margin`, `debt_ratio` 靜態特徵 |
| 3 | `valuation_river` | PE/PB 正規化即為估值位階的數值表示 |
| 4 | `institutional_forensic` | `foreign_norm`, `trust_norm`, `dealer_norm`, `margin_net`, `short_net` |
| 5 | `technical_analysis` | MA ratios, RSI, MACD, KD, ATR, volume_ratio |
| 5 | `day_trading_momentum` | `gap_ratio` 跳空特徵; 可擴展: 加入日內 VWAP 偏離 (需 SSE) |
| 🆕 | **VPA / VSA** | `spread_norm`, `close_position`, `body_ratio`, `upper/lower_shadow`, `effort_vs_result`, `smart_money_flow`, `climax_detector` |
| 🆕 | **Price Action** | `inside_bar`, `engulfing_score`, `gap_ratio`, `bar_momentum`, `hl_trend`, `price_acceptance` |
| 6 | `risk_management` | ATR 特徵; 搭配 `risk_management` SKILL 計算部位; `climax_detector` 可觸發減倉 |
| — | `backtest_engine` | 輸出結果可直接餵入 `backtest_results` 進行歷史驗證 |
| — | `data_quality` | 特徵提取包含 null 防護 + 預設值填充; VPA 特徵需驗證 OHLC 一致性 |
| — | `alert_notification` | 高信心量價確認 BUY + Climax SELL 觸發 SSE 推播 |

---

## VPA/VSA 經典模式與 Transformer Attention 對照

以下是模型預期透過 Self-Attention 學習到的經典 VPA/VSA 模式：

### 買入相關模式 (Bullish Patterns)

```
1. Accumulation (吸籌)
   特徵序列: [多日 narrow spread + high volume + close_position > 0.6]
   → Attention 聚焦: 窄幅高量日群集 → 後續寬幅突破日
   書籍來源: Master the Markets Ch.8 "Accumulation"

2. Testing (測試)
   特徵序列: [climax_detector spike → 數日後 low vol_ratio + narrow spread + close_position > 0.7]
   → Attention 聚焦: 高潮量日 → 低量回測日 (確認供給被吸收)
   書籍來源: A Complete Guide to VPA "Testing Supply"

3. Spring / Shakeout (彈簧)
   特徵序列: [inside_bar 壓縮 → gap_ratio < -1% 跳空下殺 → lower_shadow > 0.5 + high volume]
   → Attention 聚焦: 假跌破 + 長下影 + 量能 = 洗盤完成
   書籍來源: David H. Weis "Weis Wave Analysis"

4. Sign of Strength (強勢確認)
   特徵序列: [price_acceptance > 0.7 持續 3-5 日 + smart_money_flow > 0]
   → Attention 聚焦: 連續高收盤位 + 機構淨流入 = 趨勢確立
   書籍來源: The Ultimate Guide to Price Action Trading
```

### 賣出相關模式 (Bearish Patterns)

```
5. Distribution (派發)
   特徵序列: [多日 narrow spread + high volume + close_position < 0.4]
   → 與 Accumulation 對稱，但收盤位偏低
   書籍來源: Master the Markets Ch.9 "Distribution"

6. Buying Climax (買入高潮)
   特徵序列: [climax_detector > 0.5 + close_position > 0.8 + upper_shadow > 0.3]
   → 極端高量 + 上影線 = 頂部反轉
   書籍來源: A Complete Guide to VPA "Climactic Bars"

7. No Demand (無需求)
   特徵序列: [下跌趨勢中 vol_ratio < 0.6 + narrow spread + close_position > 0.5]
   → 低量反彈收紅 = 假多頭 (缺乏買盤支持)
   書籍來源: Master the Markets Ch.6 "No Demand"

8. Upthrust (假突破)
   特徵序列: [gap_ratio > 1% + upper_shadow > 0.5 + effort_vs_result > 1.5]
   → 跳空開高 + 長上影 + 量價背離 = 誘多陷阱
   書籍來源: David H. Weis "Upthrust Analysis"
```

### Squeeze Play 壓縮爆發 (John Carter)

```
9. Volatility Squeeze
   特徵序列: [5-10 日 spread_norm 持續 < 0.4 + inside_bar 出現 ≥ 2次]
   → ATR 壓縮至 60 日內最低 → 方向性爆發
   → bar_momentum 的方向決定做多/做空
   書籍來源: Mastering the Trade Ch.5 "The Squeeze"
```

---

## 訓練策略增強 (Training Enhancements)

### Focal Loss 類別不平衡處理

台股多數日子為 HOLD，考慮 Focal Loss 替代 Cross-Entropy：

```
FL(p_t) = -α_t × (1 - p_t)^γ × log(p_t)

α = [0.4, 0.2, 0.4]  ← SELL, HOLD, BUY 的類別權重
γ = 2.0                ← 聚焦係數 (越大越關注困難樣本)
```

### 多任務學習 (可選擴展)

在主分類任務外，加入輔助回歸任務預測 5 日報酬率，提供更細粒度梯度：

```
Main Head:   Dense(3, Softmax)  → CrossEntropy(BUY/HOLD/SELL)
Aux Head:    Dense(1, Linear)   → MSE(5d_return)
Total Loss = 0.7 × CE + 0.3 × MSE
```

### 訓練資料增強 (Data Augmentation)

```
1. Time Shift: 隨機偏移 window 起點 ±3 天 (增加時間不變性)
2. Feature Noise: 對 VPA 特徵加入 N(0, 0.05) 高斯噪聲 (增加魯棒性)
3. Volume Jitter: vol_ratio × Uniform(0.9, 1.1) (模擬量能波動)
```

---

## 推論增強：VPA Confidence Modifier

在 `predict.ts` 的最終輸出前，引入 VPA 信心修正器：

```typescript
function applyVPAModifier(
  signal: 'BUY' | 'HOLD' | 'SELL',
  confidence: number,
  features: FeatureSnapshot
): { signal: string; confidence: number } {

  // Rule 1: 高潮量 → 所有信號降級觀望
  if (features.climax_detector > 0.5) {
    return { signal: 'HOLD', confidence: confidence * 0.4 };
  }

  // Rule 2: BUY 需要量價支持
  if (signal === 'BUY') {
    // 無需求 (低量反彈): 大幅降低信心
    if (features.vol_ratio < 0.6 && features.close_position > 0.5) {
      confidence *= 0.5;  // No Demand pattern
    }
    // 機構流入且收盤位高: 提升信心
    if (features.smart_money_flow > 0.5 && features.price_acceptance > 0.65) {
      confidence = Math.min(confidence * 1.2, 0.95);  // VPA confirmation boost
    }
    // 量價背離 (努力無結果): 降低信心
    if (features.effort_vs_result > 1.5) {
      confidence *= 0.6;  // Effort vs Result divergence
    }
  }

  // Rule 3: SELL 在吸籌模式中需謹慎
  if (signal === 'SELL') {
    // 窄幅高量收紅 (可能是吸籌): 降低賣出信心
    if (features.spread_norm < 0.5 && features.vol_ratio > 1.5 && features.close_position > 0.6) {
      confidence *= 0.4;  // Possible accumulation, don't sell
    }
  }

  return { signal, confidence };
}
```

---

## 實作優先序 (Implementation Priority)

### Phase 1: VPA 核心特徵 (最高優先)

新增 5 維主要 VPA 特徵至 `feature-engineer.ts`，特徵總數 25 → 30：

| 特徵 | SQL 來源 | 計算複雜度 |
|------|---------|-----------|
| `spread_norm` | `(p.high - p.low) / d.atr14` | 低 (單表 JOIN) |
| `close_position` | `(p.close - p.low) / (p.high - p.low)` | 低 |
| `body_ratio` | `ABS(p.close - p.open) / (p.high - p.low)` | 低 |
| `effort_vs_result` | 需 z-score(Δvol - Δspread)，2 日 lag | 中 |
| `smart_money_flow` | close_position × vol_ratio × sign | 低 |

```sql
-- Phase 1 SQL: 擴展 extractTimeSeriesRows 的 SELECT
SELECT
  p.open, p.high, p.low, p.close, p.volume, p.change_pct,
  d.ma5, d.ma20, d.ma60, d.rsi14, d.macd_diff, d.macd_dea, d.kd_k, d.kd_d, d.atr14,
  -- VPA Phase 1 新增
  CASE WHEN d.atr14 > 0 THEN (p.high - p.low) / d.atr14 ELSE 1.0 END AS spread_norm,
  CASE WHEN (p.high - p.low) > 0 THEN (p.close - p.low) / (p.high - p.low) ELSE 0.5 END AS close_position,
  CASE WHEN (p.high - p.low) > 0 THEN ABS(p.close - p.open) / (p.high - p.low) ELSE 0.5 END AS body_ratio
FROM price_history p
JOIN daily_indicators d ON p.symbol = d.symbol AND p.date = d.date
```

### Phase 2: 影線 + 高潮量 (高優先)

新增 3 維，總數 30 → 33:

| 特徵 | 計算 |
|------|------|
| `upper_shadow` | `(high - MAX(open, close)) / (high - low)` |
| `lower_shadow` | `(MIN(open, close) - low) / (high - low)` |
| `climax_detector` | `clamp((vol_ratio - 2.5) / 2.5, 0, 1) × (spread_norm > 1.5)` |

### Phase 3: Price Action 結構 (中優先)

新增 6 維，總數 33 → 39:

| 特徵 | 需求 |
|------|------|
| `inside_bar` | 需前一日 high/low (LAG window) |
| `engulfing_score` | 需前一日 OHLC |
| `gap_ratio` | 需前一日 close |
| `bar_momentum` | 組合 close_position × spread_norm |
| `hl_trend` | 滾動 5 日 higher_high/lower_low 計數 |
| `price_acceptance` | 滾動 5 日 close_position 均值 |

### Phase 4: 架構升級 (次優先)

- Encoder 3 → 4 層
- FFN 128 → 256
- ReLU → GELU
- GAP → Temporal Attention Pooling
- 增加 Sinusoidal PE

### Phase 5: 訓練策略升級 (擴展)

- Focal Loss + Class Weight
- 多任務學習 (輔助回歸)
- VPA 確認 Label 增強

---

## 已知限制與擴展方向

| 限制 | 說明 | 擴展方案 |
|------|------|---------|
| ~~無真正 Positional Encoding~~ | Phase 4 實作 sinusoidal PE | ✅ 已規劃 |
| 靜態特徵 broadcast | 基本面每季更新，60 天 window 內視為常數 | 加入季度變化率 delta |
| 無產業特徵 | `sector_daily` 尚未整合 | 加入 sector_momentum_5d/20d 提升至 41 維 |
| 無借券/官股細部 | `security_lending`, `government_chips` 未用 | 可從 `institutional_snapshot` 擴展至 45+ 維 |
| ~~Label 不平衡~~ | Phase 5 Focal Loss 處理 | ✅ 已規劃 |
| 無多時間尺度 | 僅用日 K，缺乏週 K 結構 | 加入 5 日滾動 OHLCV 壓縮特徵 (偽週 K) |
| 無 Weis Wave | David Weis 的累積量能波無顯式特徵 | 加入 wave_volume_ratio (推動波 vs 修正波量能比) |
| 無動態止損整合 | 模型僅預測方向，不產出止損價 | 結合 `risk_management` ATR 動態止損; climax_detector 觸發緊急減倉 |
| 無 Regime Detection | 牛/熊/盤整市場使用同一模型 | 加入 market_regime 特徵 (breadth + VIX-like volatility index) |
