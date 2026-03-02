/**
 * Transformer 選股策略模型配置
 * 整合 11 大 SKILL 模型特徵 + TradeMemory Protocol 三層記憶
 */

// ─── Feature Definitions ────────────────────────────────────────
export interface FeatureDef {
  name: string;
  normalize: 'ratio' | 'zscore' | 'minmax' | 'raw';
  description: string;
}

/** 時間序列特徵 (每日 per stock, 60-day window) */
export const TIME_SERIES_FEATURES: FeatureDef[] = [
  // ── 技術面 (technical_analysis SKILL) ──
  { name: 'close_ret',    normalize: 'raw',    description: '日報酬率 %' },
  { name: 'ma5_ratio',    normalize: 'raw',    description: '收盤/MA5' },
  { name: 'ma20_ratio',   normalize: 'raw',    description: '收盤/MA20' },
  { name: 'ma60_ratio',   normalize: 'raw',    description: '收盤/MA60' },
  { name: 'rsi14',        normalize: 'minmax', description: 'RSI(14) 0-1' },
  { name: 'macd_diff',    normalize: 'zscore', description: 'MACD 柱狀' },
  { name: 'macd_dea',     normalize: 'zscore', description: 'MACD DEA' },
  { name: 'kd_k',         normalize: 'minmax', description: 'KD-K 0-1' },
  { name: 'kd_d',         normalize: 'minmax', description: 'KD-D 0-1' },
  { name: 'atr_ratio',    normalize: 'raw',    description: 'ATR/收盤 波動率' },
  { name: 'vol_ratio',    normalize: 'raw',    description: '量能/20日均量' },
  // ── 籌碼面 (institutional_forensic SKILL) ──
  { name: 'foreign_norm', normalize: 'raw',    description: '外資力道 (量能正規化)' },
  { name: 'trust_norm',   normalize: 'raw',    description: '投信力道 (量能正規化)' },
  { name: 'dealer_norm',  normalize: 'raw',    description: '自營力道 (量能正規化)' },
  { name: 'margin_net',   normalize: 'zscore', description: '融資增減' },
  { name: 'short_net',    normalize: 'zscore', description: '融券增減' },
  // ── 市場環境 (market_breadth_analysis SKILL) ──
  { name: 'market_ret',   normalize: 'raw',    description: '大盤日報酬' },
  { name: 'breadth_20',   normalize: 'minmax', description: 'MA20 寬度 0-1' },
  { name: 'breadth_60',   normalize: 'minmax', description: 'MA60 寬度 0-1' },
];

/** 靜態特徵 (per stock, broadcast 至每個 timestep) */
export const STATIC_FEATURES: FeatureDef[] = [
  // ── 基本面 (fundamental_analysis SKILL) ──
  { name: 'pe_norm',      normalize: 'minmax', description: 'PE 正規化' },
  { name: 'pb_norm',      normalize: 'minmax', description: 'PB 正規化' },
  { name: 'yield_norm',   normalize: 'minmax', description: '殖利率 正規化' },
  { name: 'rev_yoy',      normalize: 'zscore', description: '營收 YoY%' },
  { name: 'gross_margin', normalize: 'minmax', description: '毛利率' },
  { name: 'debt_ratio',   normalize: 'minmax', description: '負債比' },
];

export const N_TS_FEATURES = TIME_SERIES_FEATURES.length;   // 19
export const N_STATIC_FEATURES = STATIC_FEATURES.length;    // 6
export const TOTAL_FEATURES = N_TS_FEATURES + N_STATIC_FEATURES; // 25

// ─── Model Hyperparameters ──────────────────────────────────────
export const MODEL_CONFIG = {
  seqLen: 60,           // 60 個交易日 lookback (~3 個月)
  nFeatures: TOTAL_FEATURES,
  dModel: 64,           // Transformer 內部維度
  nHeads: 4,            // 注意力頭數
  nLayers: 3,           // Encoder 層數
  dFF: 128,             // Feed-Forward 隱藏維度
  dropRate: 0.1,        // Dropout
  numClasses: 3,        // SELL=0, HOLD=1, BUY=2
} as const;

// ─── Training Config ────────────────────────────────────────────
export const TRAIN_CONFIG = {
  epochs: 50,
  batchSize: 64,
  learningRate: 1e-4,
  validationSplit: 0.15,
  earlyStoppingPatience: 8,
  // Label 定義：forward N-day return
  forwardDays: 5,
  buyThreshold: 0.03,    // > 3% → BUY
  sellThreshold: -0.01,  // < -1% → SELL
  // 最低股票歷史長度
  minHistory: 120,
} as const;

// ─── Trade Memory Config (TradeMemory Protocol 概念) ────────────
export const MEMORY_CONFIG = {
  reflectionFrequency: 'weekly' as const,
  minSamplesForPattern: 20,
  patternWinRateThreshold: 0.4,   // 低於此則觸發 L3 調整
  confidenceScaleMin: 0.3,        // 最低信心縮放
} as const;

// ─── Signal Labels ──────────────────────────────────────────────
export const SIGNAL_LABELS = ['SELL', 'HOLD', 'BUY'] as const;
export type Signal = (typeof SIGNAL_LABELS)[number];
