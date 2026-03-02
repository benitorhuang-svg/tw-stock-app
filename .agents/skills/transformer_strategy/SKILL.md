---
name: transformer_strategy
description: Transformer 深度學習選股模型，結合技術面、籌碼面、基本面與市場環境特徵，搭配三層交易記憶持續學習。
---

# Transformer 選股策略模型 (Transformer Stock Selection Model)

使用 Transformer Encoder 架構對台股進行多因子量化選股，融合 11 大 SKILL 模型的領域知識作為特徵工程基礎，並實作 TradeMemory Protocol 的三層記憶系統 (L1/L2/L3) 實現策略持續學習與調整。

---

## 資料庫對照表 (Database Mapping)

### 輸入特徵來源

| 特徵群組 | 資料表 | 欄位 | 對應 SKILL |
|----------|--------|------|-----------|
| 技術指標 | `daily_indicators` | `ma5`, `ma20`, `ma60`, `rsi14`, `macd_diff`, `macd_dea`, `kd_k`, `kd_d`, `atr14` | `technical_analysis` |
| 價格數據 | `price_history` | `close`, `volume`, `change_pct` | `technical_analysis` |
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
Input [batch, 60, 25]          ← 60 交易日 × 25 維特徵
  │
  ▼
Dense(64) → Input Projection   ← 升維至 d_model=64
  │
  ▼
┌──────────────────────────────┐
│ Transformer Encoder × 3      │
│  Pre-LayerNorm               │
│  → Multi-Head Attention (4h) │ ← 4 個注意力頭, depth=16
│  → Dropout(0.1) + Residual   │
│  Pre-LayerNorm               │
│  → FFN(128→64) + ReLU        │ ← Feed-Forward 隱藏層=128
│  → Dropout(0.1) + Residual   │
└──────────────────────────────┘
  │
  ▼
Final LayerNorm → GAP          ← Global Average Pooling
  │
  ▼
Dense(128, ReLU) → Dropout     ← Classification Head
  │
  ▼
Dense(3, Softmax)              ← P(SELL), P(HOLD), P(BUY)
```

### 超參數

| 參數 | 值 | 說明 |
|------|------|------|
| `seqLen` | 60 | 回看天數 (~3 個月) |
| `nFeatures` | 25 | 19 時序 + 6 靜態特徵 |
| `dModel` | 64 | Transformer 內部維度 |
| `nHeads` | 4 | 注意力頭數 |
| `nLayers` | 3 | Encoder 層數 |
| `dFF` | 128 | FFN 隱藏維度 |
| `dropRate` | 0.1 | Dropout 比率 |
| `numClasses` | 3 | SELL / HOLD / BUY |

---

## 特徵工程 (Feature Engineering)

### 時間序列特徵 (19 維 × 60 天)

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

### 靜態特徵 (6 維, broadcast)

```
pe_norm       本益比 (正規化)
pb_norm       股價淨值比 (正規化)
yield_norm    殖利率 (正規化)
rev_yoy       營收年增率 (z-score)
gross_margin  毛利率 (正規化)
debt_ratio    負債比 (正規化)
```

### Label 定義

```
Forward 5-day return:
  > +3%  → BUY  (2)
  < -1%  → SELL (0)
  else   → HOLD (1)
```

### 正規化策略

所有特徵於訓練時計算全域 z-score（均值 + 標準差），存檔至 `models/<id>/norm_stats.json`，推論時載入同一組統計值確保一致性。

---

## 三層交易記憶 (Trade Memory — 借鏡 TradeMemory Protocol)

```
    Model Prediction
         │
    ┌────▼─────────────────┐
    │ L1: Trade Journal    │  ← 記錄預測 + 信心度 + 特徵快照
    │     (trade_journal)  │     填回 5 日後實際報酬 + 正確性
    └────┬─────────────────┘
         │ 每週反思
    ┌────▼─────────────────┐
    │ L2: Pattern Discovery│  ← 統計分析: 勝率/報酬 by 信號/信心/特徵
    │     (trade_patterns) │     發現如 "RSI>70 時 BUY 勝率僅 28%"
    └────┬─────────────────┘
         │ 自動產生建議
    ┌────▼─────────────────┐
    │ L3: Adjustments      │  ← 信心縮放 / 信號抑制
    │ (strategy_adjustments)│     需人工審核後 apply
    └──────────────────────┘
```

### L3 調整類型

| 類型 | 效果 | 範例 |
|------|------|------|
| `confidence_scale` | 將預測信心乘以縮放係數 | RSI 過熱時 BUY 信心 ×0.5 |
| `signal_suppress` | 完全抑制該信號 | 平均報酬 < -2% 的模式 |

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
| 5 | `day_trading_momentum` | 可擴展: 加入日內 VWAP 偏離特徵 (需 SSE) |
| 6 | `risk_management` | ATR 特徵; 搭配 `risk_management` SKILL 計算部位 |
| — | `backtest_engine` | 輸出結果可直接餵入 `backtest_results` 進行歷史驗證 |
| — | `data_quality` | 特徵提取包含 null 防護 + 預設值填充 |
| — | `alert_notification` | 高信心 BUY/SELL 信號可觸發 SSE 推播 |

---

## 已知限制與擴展方向

| 限制 | 說明 | 擴展方案 |
|------|------|---------|
| 無真正 Positional Encoding | TF.js functional API 限制; 模型透過時序特徵隱式學習 | 升級至 custom TF.js Layer 實作 sinusoidal PE |
| 靜態特徵 broadcast | 基本面每季更新，60 天 window 內視為常數 | 加入季度變化率 delta |
| 無產業特徵 | `sector_daily` 尚未整合 | 加入 sector_momentum_5d/20d 提升至 27 維 |
| 無借券/官股細部 | `security_lending`, `government_chips` 未用 | 可從 `institutional_snapshot` 擴展至 30+ 維 |
| Label 不平衡 | 台股多數日子是 HOLD | 考慮 focal loss 或 class weight |
