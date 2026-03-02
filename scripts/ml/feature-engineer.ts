/**
 * 特徵工程 — 從 stocks.db 萃取 Transformer 輸入特徵
 *
 * 特徵來源對應 11 大 SKILL 模型:
 *   技術面 → daily_indicators (MA, RSI, MACD, KD, ATR)
 *   籌碼面 → chips, margin_short
 *   基本面 → latest_prices (PE, PB, Yield, 毛利率, 營收 YoY)
 *   市場環境 → market_index, market_breadth_history
 */
import Database from 'better-sqlite3';
import { resolve } from 'path';
import {
  MODEL_CONFIG,
  TRAIN_CONFIG,
  TOTAL_FEATURES,
  N_TS_FEATURES,
  N_STATIC_FEATURES,
} from './config.js';

const DB_PATH = resolve(process.cwd(), 'stocks.db');

// ─── Types ──────────────────────────────────────────────────────
export interface NormStats {
  means: number[];
  stds: number[];
}

export interface TrainingData {
  X: number[][][];      // [samples, seqLen, features]
  y: number[];           // [samples] → 0=SELL, 1=HOLD, 2=BUY
  symbols: string[];
  dates: string[];
  stats: NormStats;
}

// ─── DB Helper ──────────────────────────────────────────────────
export function openDB(readonly = true): Database.Database {
  return new Database(DB_PATH, { readonly });
}

// ─── Feature Extraction ─────────────────────────────────────────

/**
 * 對單一股票提取時間序列特徵 (19 維 × N 天)
 */
export function extractTimeSeriesRows(
  db: Database.Database,
  symbol: string,
  startDate: string,
  endDate: string,
): { dates: string[]; closes: number[]; features: number[][] } | null {

  const rows = db.prepare(`
    SELECT
      ph.date,
      ph.close,
      ph.volume,
      ph.change_pct,
      di.ma5, di.ma20, di.ma60,
      di.rsi14, di.macd_diff, di.macd_dea,
      di.kd_k, di.kd_d, di.atr14,
      c.foreign_inv, c.invest_trust, c.dealer,
      ms.margin_net, ms.short_net,
      mi.close  AS market_close,
      mbh.ma20_breadth, mbh.ma60_breadth
    FROM price_history ph
    LEFT JOIN daily_indicators di
      ON ph.symbol = di.symbol AND ph.date = di.date
    LEFT JOIN chips c
      ON ph.symbol = c.symbol  AND c.date = ph.date
    LEFT JOIN margin_short ms
      ON ph.symbol = ms.symbol AND ms.date = ph.date
    LEFT JOIN market_index mi
      ON ph.date = mi.date
    LEFT JOIN market_breadth_history mbh
      ON ph.date = mbh.date
    WHERE ph.symbol = ? AND ph.date BETWEEN ? AND ?
    ORDER BY ph.date ASC
  `).all(symbol, startDate, endDate) as Record<string, number | string | null>[];

  if (rows.length < MODEL_CONFIG.seqLen + TRAIN_CONFIG.forwardDays + 10) return null;

  const dates: string[] = [];
  const closes: number[] = [];
  const features: number[][] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const close = (r.close as number) || 0;
    if (!close) continue;

    // 20-day rolling average volume for normalisation
    const volWindow: number[] = [];
    for (let j = Math.max(0, i - 19); j <= i; j++) {
      volWindow.push((rows[j].volume as number) || 1);
    }
    const vol20d = volWindow.reduce((a, b) => a + b, 0) / volWindow.length || 1;

    // Market daily return
    const prevMkt = i > 0 ? (rows[i - 1].market_close as number) || 0 : 0;
    const mktClose = (r.market_close as number) || 0;
    const marketRet = prevMkt > 0 ? ((mktClose - prevMkt) / prevMkt) * 100 : 0;

    const vol = (r.volume as number) || 1;

    // 19 time-series features (matches TIME_SERIES_FEATURES order)
    const row: number[] = [
      (r.change_pct as number) || 0,                               // close_ret
      (r.ma5  as number) ? close / (r.ma5  as number) : 1,        // ma5_ratio
      (r.ma20 as number) ? close / (r.ma20 as number) : 1,        // ma20_ratio
      (r.ma60 as number) ? close / (r.ma60 as number) : 1,        // ma60_ratio
      ((r.rsi14 as number) || 50) / 100,                           // rsi14  (0-1)
      (r.macd_diff as number) || 0,                                // macd_diff
      (r.macd_dea  as number) || 0,                                // macd_dea
      ((r.kd_k as number) || 50) / 100,                           // kd_k   (0-1)
      ((r.kd_d as number) || 50) / 100,                           // kd_d   (0-1)
      (r.atr14 as number) ? (r.atr14 as number) / close : 0,      // atr_ratio
      vol / vol20d,                                                 // vol_ratio
      (r.foreign_inv   as number || 0) / vol,                      // foreign_norm
      (r.invest_trust  as number || 0) / vol,                      // trust_norm
      (r.dealer        as number || 0) / vol,                      // dealer_norm
      (r.margin_net    as number) || 0,                            // margin_net
      (r.short_net     as number) || 0,                            // short_net
      marketRet,                                                    // market_ret
      ((r.ma20_breadth as number) || 50) / 100,                    // breadth_20 (0-1)
      ((r.ma60_breadth as number) || 50) / 100,                    // breadth_60 (0-1)
    ];

    dates.push(r.date as string);
    closes.push(close);
    features.push(row);
  }

  if (features.length < MODEL_CONFIG.seqLen + TRAIN_CONFIG.forwardDays) return null;
  return { dates, closes, features };
}

/**
 * 提取靜態 (基本面) 特徵 (6 維)
 */
export function extractStaticFeatures(
  db: Database.Database,
  symbol: string,
): number[] {
  const r = db.prepare(`
    SELECT pe, pb, yield, revenue_yoy, gross_margin, debt_ratio
    FROM latest_prices WHERE symbol = ?
  `).get(symbol) as Record<string, number | null> | undefined;

  if (!r) return new Array(N_STATIC_FEATURES).fill(0);
  return [
    r.pe            || 0,
    r.pb            || 0,
    r.yield         || 0,
    r.revenue_yoy   || 0,
    r.gross_margin  || 0,
    r.debt_ratio    || 0,
  ];
}

// ─── Normalisation ──────────────────────────────────────────────

export function computeNormStats(windows: number[][][]): NormStats {
  const nF = windows[0]?.[0]?.length || TOTAL_FEATURES;
  const sums   = new Float64Array(nF);
  const sqSums = new Float64Array(nF);
  let count = 0;

  for (const sample of windows) {
    for (const step of sample) {
      for (let f = 0; f < nF; f++) {
        const v = step[f] || 0;
        sums[f]   += v;
        sqSums[f] += v * v;
      }
      count++;
    }
  }

  const means: number[] = [];
  const stds:  number[] = [];
  for (let f = 0; f < nF; f++) {
    const mean = sums[f] / (count || 1);
    const variance = sqSums[f] / (count || 1) - mean * mean;
    means.push(mean);
    stds.push(Math.sqrt(Math.max(0, variance)) || 1);
  }
  return { means, stds };
}

export function normalizeWindow(
  window: number[][],
  stats: NormStats,
): number[][] {
  return window.map(step =>
    step.map((v, f) => (v - stats.means[f]) / stats.stds[f]),
  );
}

// ─── Windowing & Labels ─────────────────────────────────────────

export function createLabeledWindows(
  dates: string[],
  features: number[][],
  closes: number[],
  seqLen: number,
  forwardDays: number,
  buyTh: number,
  sellTh: number,
): { windows: number[][][]; labels: number[]; windowDates: string[] } {
  const windows:     number[][][] = [];
  const labels:      number[]     = [];
  const windowDates: string[]     = [];

  for (let i = 0; i <= features.length - seqLen - forwardDays; i++) {
    const curClose = closes[i + seqLen - 1];
    const futClose = closes[i + seqLen - 1 + forwardDays];
    if (!curClose || !futClose) continue;

    const fwdReturn = (futClose - curClose) / curClose;
    const label = fwdReturn > buyTh ? 2 : fwdReturn < sellTh ? 0 : 1;

    windows.push(features.slice(i, i + seqLen));
    labels.push(label);
    windowDates.push(dates[i + seqLen - 1]);
  }
  return { windows, labels, windowDates };
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * 建構訓練資料集 (從所有股票)
 */
export function buildTrainingDataset(
  startDate: string,
  endDate: string,
): TrainingData {
  const db = openDB();
  const { seqLen } = MODEL_CONFIG;
  const { forwardDays, buyThreshold, sellThreshold, minHistory } = TRAIN_CONFIG;

  const stocks = db.prepare(`
    SELECT DISTINCT symbol FROM price_history
    WHERE date BETWEEN ? AND ?
    GROUP BY symbol HAVING COUNT(*) >= ?
  `).all(startDate, endDate, minHistory) as { symbol: string }[];

  console.log(`[Features] ${stocks.length} stocks with >= ${minHistory} days history`);

  const allWindows: number[][][] = [];
  const allLabels:  number[]     = [];
  const allSymbols: string[]     = [];
  const allDates:   string[]     = [];

  for (const { symbol } of stocks) {
    const ts = extractTimeSeriesRows(db, symbol, startDate, endDate);
    if (!ts) continue;

    const staticFeats = extractStaticFeatures(db, symbol);
    // Broadcast static → every timestep
    const combined = ts.features.map(step => [...step, ...staticFeats]);

    const { windows, labels, windowDates } = createLabeledWindows(
      ts.dates, combined, ts.closes,
      seqLen, forwardDays, buyThreshold, sellThreshold,
    );

    for (let j = 0; j < windows.length; j++) {
      allWindows.push(windows[j]);
      allLabels.push(labels[j]);
      allSymbols.push(symbol);
      allDates.push(windowDates[j]);
    }
  }

  const buyN  = allLabels.filter(l => l === 2).length;
  const holdN = allLabels.filter(l => l === 1).length;
  const sellN = allLabels.filter(l => l === 0).length;
  console.log(`[Features] ${allWindows.length} samples — BUY:${buyN} HOLD:${holdN} SELL:${sellN}`);

  const stats = computeNormStats(allWindows);
  const X = allWindows.map(w => normalizeWindow(w, stats));

  db.close();
  return { X, y: allLabels, symbols: allSymbols, dates: allDates, stats };
}

/**
 * 建構最新預測輸入 (所有股票最近 60 日)
 */
export function buildPredictionInput(stats: NormStats): {
  symbols: string[];
  X: number[][][];
} {
  const db = openDB();
  const { seqLen } = MODEL_CONFIG;
  const symbols: string[] = [];
  const X: number[][][] = [];

  const stocks = db.prepare(`
    SELECT DISTINCT symbol FROM price_history
    GROUP BY symbol HAVING COUNT(*) >= ?
  `).all(seqLen + 20) as { symbol: string }[];

  for (const { symbol } of stocks) {
    const ts = extractTimeSeriesRows(db, symbol, '2020-01-01', '2099-12-31');
    if (!ts || ts.features.length < seqLen) continue;

    const staticFeats = extractStaticFeatures(db, symbol);
    const combined = ts.features.map(step => [...step, ...staticFeats]);
    const window = combined.slice(-seqLen);
    symbols.push(symbol);
    X.push(normalizeWindow(window, stats));
  }

  db.close();
  return { symbols, X };
}
