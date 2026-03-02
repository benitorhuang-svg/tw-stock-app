#!/usr/bin/env npx tsx
/// <reference path="./tfjs.d.ts" />
/**
 * Transformer 選股模型 — 每日預測腳本
 *
 * Usage:
 *   npx tsx scripts/ml/predict.ts
 *   npx tsx scripts/ml/predict.ts --model transformer_v1 --top 30
 *
 * 流程:
 *   1. 載入已訓練的 Transformer 模型
 *   2. 對所有股票提取最近 60 日特徵
 *   3. 推論 BUY/HOLD/SELL 機率
 *   4. 套用 L3 策略調整 (Trade Memory)
 *   5. 寫入 screener_scores 表
 *   6. 記錄至 trade_journal (L1)
 */
import { resolve } from 'path';
import { readFileSync } from 'fs';
import Database from 'better-sqlite3';
import { buildPredictionInput, type NormStats } from './feature-engineer.js';
import { loadTF, loadModel } from './transformer.js';
import { TradeMemory } from './trade-memory.js';
import { SIGNAL_LABELS, TRAIN_CONFIG } from './config.js';

// ─── CLI Args ───────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let modelId = 'transformer_v1';
  let topN    = 20;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) modelId = args[++i];
    if (args[i] === '--top'   && args[i + 1]) topN    = parseInt(args[++i]);
  }
  return { modelId, topN };
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const { modelId, topN } = parseArgs();
  const modelDir = resolve(process.cwd(), 'models', modelId);
  const today = new Date().toISOString().split('T')[0];

  console.log('╔══════════════════════════════════════════╗');
  console.log('║  TW-Stock Transformer — 每日選股預測      ║');
  console.log('╚══════════════════════════════════════════╝\n');
  console.log(`  Date  : ${today}`);
  console.log(`  Model : ${modelId}\n`);

  // 1. Load TF + model
  const tf = await loadTF();

  console.log('[1/5] Loading model...');
  const model = await loadModel(modelDir);
  const stats: NormStats = JSON.parse(
    readFileSync(resolve(modelDir, 'norm_stats.json'), 'utf-8'),
  );

  // 2. Prepare features
  console.log('[2/5] Extracting latest features...');
  const { symbols, X } = buildPredictionInput(stats);
  console.log(`  ${symbols.length} stocks with sufficient history`);

  if (symbols.length === 0) {
    console.error('No stocks found. Run ETL first: npm run build-db');
    process.exit(1);
  }

  // 3. Predict
  console.log('[3/5] Running predictions...');
  const xTensor = tf.tensor3d(X);
  const predictions = model.predict(xTensor) as import('@tensorflow/tfjs-node').Tensor;
  const probs = await predictions.array() as number[][];

  // 4. Apply L3 adjustments from Trade Memory
  console.log('[4/5] Applying strategy adjustments...');
  const memory = new TradeMemory();
  const adjustments = memory.getActiveAdjustments();

  if (adjustments.size > 0) {
    console.log(`  Active adjustments: ${adjustments.size}`);
  }

  // Fill past outcomes first
  const { filled } = memory.fillOutcomes(TRAIN_CONFIG.forwardDays);
  if (filled > 0) console.log(`  Filled ${filled} past outcomes`);

  // Process results
  interface Prediction {
    symbol: string;
    signal: string;
    confidence: number;
    probs: number[];
  }
  const results: Prediction[] = [];

  for (let i = 0; i < symbols.length; i++) {
    const p = probs[i];
    const maxIdx = p.indexOf(Math.max(...p));
    const signal = SIGNAL_LABELS[maxIdx];
    let confidence = p[maxIdx];

    // Apply L3 adjustments
    const adj = adjustments.get(signal);
    if (adj) {
      if (adj.suppress) continue; // Skip suppressed signals
      confidence *= adj.scale;
    }

    results.push({ symbol: symbols[i], signal, confidence, probs: p });

    // Record non-HOLD predictions with sufficient confidence in L1 journal
    if (signal !== 'HOLD' && confidence > 0.55) {
      memory.recordDecision({
        model_id: modelId,
        symbol: symbols[i],
        signal_date: today,
        signal: signal as any,
        confidence,
        features_json: JSON.stringify({
          rsi14: X[i][X[i].length - 1][4],
          foreign_norm: X[i][X[i].length - 1][11],
          breadth_20: X[i][X[i].length - 1][17],
        }),
        reasoning:
          `P(SELL)=${(p[0] * 100).toFixed(1)}% ` +
          `P(HOLD)=${(p[1] * 100).toFixed(1)}% ` +
          `P(BUY)=${(p[2] * 100).toFixed(1)}%`,
      });
    }
  }

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  // 5. Write to screener_scores
  console.log('[5/5] Writing to screener_scores...');
  const db = new Database(resolve(process.cwd(), 'stocks.db'));
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO screener_scores
      (symbol, date, technical_score, chip_score, total_score, signal)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const r of results) {
      if (r.signal === 'BUY' || r.signal === 'SELL') {
        stmt.run(
          r.symbol, today,
          +(r.probs[2] * 100).toFixed(1),  // BUY prob as technical score
          +(r.probs[0] * 100).toFixed(1),  // SELL prob as risk indicator
          +(r.confidence * 100).toFixed(1),
          r.confidence > 0.7 ? 'STRONG_' + r.signal : r.signal,
        );
      }
    }
  });
  tx();
  db.close();

  // ─── Display Results ──────────────────────────────────────────

  const buys  = results.filter(r => r.signal === 'BUY').slice(0, topN);
  const sells = results.filter(r => r.signal === 'SELL').slice(0, 10);

  console.log(`\n🟢 Top ${topN} BUY signals:`);
  console.log('  Symbol  Signal     Confidence  P(BUY)  P(SELL)');
  console.log('  ' + '─'.repeat(52));
  for (const r of buys) {
    console.log(
      `  ${r.symbol.padEnd(8)} ${r.signal.padEnd(10)} ` +
      `${(r.confidence * 100).toFixed(1).padStart(6)}%   ` +
      `${(r.probs[2] * 100).toFixed(1).padStart(5)}%  ` +
      `${(r.probs[0] * 100).toFixed(1).padStart(5)}%`,
    );
  }

  if (sells.length > 0) {
    console.log(`\n🔴 Top SELL signals:`);
    for (const r of sells) {
      console.log(
        `  ${r.symbol.padEnd(8)} ${r.signal.padEnd(10)} ` +
        `${(r.confidence * 100).toFixed(1).padStart(6)}%`,
      );
    }
  }

  // Cleanup
  xTensor.dispose();
  predictions.dispose();
  memory.close();

  console.log(`\n✅ Done. ${buys.length} BUY / ${sells.length} SELL signals written to screener_scores.`);
}

main().catch(err => {
  console.error('Prediction failed:', err);
  process.exit(1);
});
